use std::cell::Cell;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, RwLock};
use tokio::sync::Mutex;
use tokio_util::compat::TokioAsyncReadCompatExt;
use tokio_util::compat::TokioAsyncWriteCompatExt;

use agent_client_protocol::{
    Agent, ClientSideConnection, InitializeRequest,
    ClientCapabilities, FileSystemCapabilities, Implementation,
    NewSessionRequest, PromptRequest, CancelNotification,
    ListSessionsRequest, LoadSessionRequest,
    ContentBlock, TextContent,
    AgentCapabilities,
};
use tracing::{info, error};

use crate::acp_client_handler::AcpClientHandler;
use crate::event_sink::EventSink;
use crate::permission_resolver::PermissionResolver;
use crate::process_manager::spawn_agent;
use crate::session_update_mapper::map_stop_reason;
use crate::transport_handle::SharedConfig;
use crate::types::*;

/// Serializable session list item returned to the frontend.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionListItem {
    pub session_id: String,
    pub cwd: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

struct ConnectionState {
    connection: Rc<ClientSideConnection>,
    _io_handle: tokio::task::JoinHandle<()>,
    agent_capabilities: AgentCapabilities,
}

pub struct AcpTransport {
    sink: Arc<dyn EventSink>,
    config: Arc<RwLock<SharedConfig>>,
    cwd: Option<String>,
    connection: Rc<RefCell<Option<ConnectionState>>>,
    permission_resolver: Arc<Mutex<PermissionResolver>>,
    turn_active: Rc<Cell<bool>>,
}

impl AcpTransport {
    pub fn new(
        config: Arc<RwLock<SharedConfig>>,
        sink: Arc<dyn EventSink>,
        cwd: Option<String>,
    ) -> Self {
        Self {
            sink,
            config,
            cwd,
            connection: Rc::new(RefCell::new(None)),
            permission_resolver: Arc::new(Mutex::new(PermissionResolver::new())),
            turn_active: Rc::new(Cell::new(false)),
        }
    }

    pub async fn connect(&self) -> Result<(), TransportError> {
        let config = {
            let cfg = self.config.read().unwrap();
            cfg.registry.get(&cfg.agent_name)
                .ok_or_else(|| {
                    let msg = format!("Agent \"{}\" not found in registry", cfg.agent_name);
                    self.sink.emit(AgentEvent::Error {
                        code: "AGENT_NOT_FOUND".into(),
                        message: msg.clone(),
                    });
                    TransportError::AgentNotFound(msg)
                })?
                .clone()
        };

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Connecting,
        });

        let mut sr = spawn_agent(&config).map_err(|e| {
            self.sink.emit(AgentEvent::Error {
                code: "SPAWN_ERROR".into(),
                message: e.to_string(),
            });
            self.sink.emit(AgentEvent::ConnectionStatus {
                status: ConnectionStatus::Error,
            });
            TransportError::SpawnError(e.to_string())
        })?;

        let handler = AcpClientHandler::new(self.sink.clone(), self.permission_resolver.clone());

        // Convert tokio AsyncRead/Write to futures AsyncRead/Write via compat layer
        let stdin_compat = sr.stdin.compat_write();
        let stdout_compat = sr.stdout.compat();

        let (conn, io_future) = ClientSideConnection::new(
            handler,
            stdin_compat,
            stdout_compat,
            |fut| {
                tokio::task::spawn_local(fut);
            },
        );

        let io_handle = tokio::task::spawn_local(async move {
            if let Err(e) = io_future.await {
                error!("ACP IO error: {}", e);
            }
        });

        // Monitor process exit
        let sink_clone = self.sink.clone();
        tokio::spawn(async move {
            let status = sr.child.wait().await;
            match status {
                Ok(exit) => {
                    info!("Agent process exited: {:?}", exit);
                }
                Err(e) => {
                    sink_clone.emit(AgentEvent::Error {
                        code: "PROCESS_CRASH".into(),
                        message: e.to_string(),
                    });
                }
            }
            sink_clone.emit(AgentEvent::ConnectionStatus {
                status: ConnectionStatus::Disconnected,
            });
        });

        let init_request = InitializeRequest::new(1.into())
            .client_info(Implementation::new("aimote", "0.0.1"))
            .client_capabilities(
                ClientCapabilities::new()
                    .fs(
                        FileSystemCapabilities::new()
                            .read_text_file(true)
                            .write_text_file(true),
                    )
                    .terminal(true),
            );

        let init_response = conn.initialize(init_request).await.map_err(|e| {
            self.sink.emit(AgentEvent::Error {
                code: "INIT_ERROR".into(),
                message: e.to_string(),
            });
            self.sink.emit(AgentEvent::ConnectionStatus {
                status: ConnectionStatus::Error,
            });
            TransportError::InitError(e.to_string())
        })?;

        let agent_capabilities = init_response.agent_capabilities;

        *self.connection.borrow_mut() = Some(ConnectionState {
            connection: Rc::new(conn),
            _io_handle: io_handle,
            agent_capabilities,
        });

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Ready,
        });

        Ok(())
    }

    pub async fn disconnect(&self) {
        self.permission_resolver.lock().await.cancel_all();

        if let Some(state) = self.connection.borrow_mut().take() {
            state._io_handle.abort();
        }

        self.turn_active.set(false);

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Disconnected,
        });
    }

    pub async fn start_session(
        &self,
        workspace: Option<String>,
    ) -> Result<String, TransportError> {
        let conn = self.require_connection_rc()?;
        let cwd = workspace
            .or_else(|| self.cwd.clone())
            .unwrap_or_else(|| ".".to_string());

        let response = conn
            .new_session(NewSessionRequest::new(cwd))
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        let session_id = response.session_id.to_string();

        self.sink.emit(AgentEvent::SessionStarted {
            session_id: session_id.clone(),
        });

        Ok(session_id)
    }

    /// Spawn a prompt task that runs in the background on the LocalSet.
    /// Returns immediately after dispatching; the result is emitted via EventSink.
    pub fn spawn_prompt(
        &self,
        session_id: String,
        text: String,
    ) -> Result<(), TransportError> {
        let conn = self.require_connection_rc()?;

        if self.turn_active.get() {
            return Err(TransportError::TurnInProgress);
        }
        self.turn_active.set(true);

        let sink = self.sink.clone();
        let turn_active = self.turn_active.clone();

        tokio::task::spawn_local(async move {
            let result = conn
                .prompt(PromptRequest::new(
                    session_id.clone(),
                    vec![ContentBlock::Text(TextContent::new(text))],
                ))
                .await;

            turn_active.set(false);

            match result {
                Ok(response) => {
                    sink.emit(AgentEvent::TurnCompleted {
                        session_id,
                        stop_reason: map_stop_reason(&response.stop_reason),
                    });
                }
                Err(e) => {
                    sink.emit(AgentEvent::Error {
                        code: "MESSAGE_ERROR".into(),
                        message: e.to_string(),
                    });
                    sink.emit(AgentEvent::TurnCompleted {
                        session_id,
                        stop_reason: StopReason::Cancelled,
                    });
                }
            }
        });

        Ok(())
    }

    pub async fn cancel(&self, session_id: &str) -> Result<(), TransportError> {
        let conn = self.require_connection_rc()?;
        conn
            .cancel(CancelNotification::new(session_id.to_string()))
            .await
            .map_err(|e| TransportError::CancelError(e.to_string()))?;
        Ok(())
    }

    pub async fn approve(&self, request_id: &str, option_id: &str) -> Result<(), TransportError> {
        self.permission_resolver
            .lock()
            .await
            .resolve(request_id, option_id);
        Ok(())
    }

    pub async fn list_sessions(&self) -> Result<Vec<SessionListItem>, TransportError> {
        let (conn, capabilities) = self.require_connection_with_capabilities()?;

        if capabilities.session_capabilities.list.is_none() {
            return Err(TransportError::UnsupportedCapability(
                "Agent does not support session listing".into(),
            ));
        }

        let response = conn
            .list_sessions(ListSessionsRequest::new())
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        let sessions = response
            .sessions
            .into_iter()
            .map(|s| SessionListItem {
                session_id: s.session_id.to_string(),
                cwd: s.cwd.to_string_lossy().to_string(),
                title: s.title,
                updated_at: s.updated_at,
            })
            .collect();

        Ok(sessions)
    }

    pub async fn load_session(&self, session_id: &str) -> Result<(), TransportError> {
        let (conn, capabilities) = self.require_connection_with_capabilities()?;

        if !capabilities.load_session {
            return Err(TransportError::UnsupportedCapability(
                "Agent does not support session loading".into(),
            ));
        }

        conn
            .load_session(LoadSessionRequest::new(session_id.to_string(), "."))
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        Ok(())
    }

    /// Get a clone of the Rc<ClientSideConnection>, dropping the RefCell borrow immediately.
    fn require_connection_rc(&self) -> Result<Rc<ClientSideConnection>, TransportError> {
        let borrow = self.connection.borrow();
        borrow
            .as_ref()
            .map(|s| s.connection.clone())
            .ok_or(TransportError::NotConnected)
    }

    /// Get a clone of connection and capabilities, dropping the RefCell borrow immediately.
    fn require_connection_with_capabilities(
        &self,
    ) -> Result<(Rc<ClientSideConnection>, AgentCapabilities), TransportError> {
        let borrow = self.connection.borrow();
        borrow
            .as_ref()
            .map(|s| (s.connection.clone(), s.agent_capabilities.clone()))
            .ok_or(TransportError::NotConnected)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TransportError {
    #[error("Not connected")]
    NotConnected,
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    #[error("Spawn error: {0}")]
    SpawnError(String),
    #[error("Init error: {0}")]
    InitError(String),
    #[error("Session error: {0}")]
    SessionError(String),
    #[error("Message error: {0}")]
    MessageError(String),
    #[error("Cancel error: {0}")]
    CancelError(String),
    #[error("Unsupported capability: {0}")]
    UnsupportedCapability(String),
    #[error("Turn already in progress")]
    TurnInProgress,
}
