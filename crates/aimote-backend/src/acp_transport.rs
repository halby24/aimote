use std::sync::Arc;
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

use crate::agent_registry::AgentRegistry;
use crate::acp_client_handler::AcpClientHandler;
use crate::config_validator::{self, ConfigValidationResult, ConfigValidationError};
use crate::event_sink::EventSink;
use crate::permission_resolver::PermissionResolver;
use crate::process_manager::spawn_agent;
use crate::session_update_mapper::map_stop_reason;
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
    connection: ClientSideConnection,
    _io_handle: tokio::task::JoinHandle<()>,
    agent_capabilities: AgentCapabilities,
}

pub struct AcpTransport {
    sink: Arc<dyn EventSink>,
    registry: AgentRegistry,
    agent_name: String,
    cwd: Option<String>,
    connection: Option<ConnectionState>,
    permission_resolver: Arc<Mutex<PermissionResolver>>,
}

impl AcpTransport {
    pub fn new(
        agent_name: String,
        registry: AgentRegistry,
        sink: Arc<dyn EventSink>,
        cwd: Option<String>,
    ) -> Self {
        Self {
            sink,
            registry,
            agent_name,
            cwd,
            connection: None,
            permission_resolver: Arc::new(Mutex::new(PermissionResolver::new())),
        }
    }

    pub async fn connect(&mut self) -> Result<(), TransportError> {
        let config = self
            .registry
            .get(&self.agent_name)
            .ok_or_else(|| {
                let msg = format!("Agent \"{}\" not found in registry", self.agent_name);
                self.sink.emit(AgentEvent::Error {
                    code: "AGENT_NOT_FOUND".into(),
                    message: msg.clone(),
                });
                TransportError::AgentNotFound(msg)
            })?
            .clone();

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

        self.connection = Some(ConnectionState {
            connection: conn,
            _io_handle: io_handle,
            agent_capabilities,
        });

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Ready,
        });

        Ok(())
    }

    pub async fn disconnect(&mut self) {
        self.permission_resolver.lock().await.cancel_all();

        if let Some(state) = self.connection.take() {
            state._io_handle.abort();
        }

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Disconnected,
        });
    }

    pub async fn start_session(
        &self,
        workspace: Option<String>,
    ) -> Result<String, TransportError> {
        let state = self.require_connection()?;
        let cwd = workspace
            .or_else(|| self.cwd.clone())
            .unwrap_or_else(|| ".".to_string());

        let response = state
            .connection
            .new_session(NewSessionRequest::new(cwd))
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        let session_id = response.session_id.to_string();

        self.sink.emit(AgentEvent::SessionStarted {
            session_id: session_id.clone(),
        });

        Ok(session_id)
    }

    pub async fn send_user_message(
        &self,
        session_id: &str,
        text: &str,
    ) -> Result<(), TransportError> {
        let state = self.require_connection()?;

        let response = state
            .connection
            .prompt(PromptRequest::new(
                session_id.to_string(),
                vec![ContentBlock::Text(TextContent::new(text.to_string()))],
            ))
            .await
            .map_err(|e| TransportError::MessageError(e.to_string()))?;

        self.sink.emit(AgentEvent::TurnCompleted {
            session_id: session_id.to_string(),
            stop_reason: map_stop_reason(&response.stop_reason),
        });

        Ok(())
    }

    pub async fn cancel(&self, session_id: &str) -> Result<(), TransportError> {
        let state = self.require_connection()?;
        state
            .connection
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
        let state = self.require_connection()?;

        if state.agent_capabilities.session_capabilities.list.is_none() {
            return Err(TransportError::UnsupportedCapability(
                "Agent does not support session listing".into(),
            ));
        }

        let response = state
            .connection
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
        let state = self.require_connection()?;

        if !state.agent_capabilities.load_session {
            return Err(TransportError::UnsupportedCapability(
                "Agent does not support session loading".into(),
            ));
        }

        state
            .connection
            .load_session(LoadSessionRequest::new(session_id.to_string(), "."))
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        Ok(())
    }

    pub fn update_config(&mut self, agent_name: String, registry: AgentRegistry) {
        self.agent_name = agent_name;
        self.registry = registry;
    }

    pub fn validate_config(&self) -> ConfigValidationResult {
        let config = match self.registry.get(&self.agent_name) {
            Some(c) => c,
            None => {
                return ConfigValidationResult {
                    valid: false,
                    errors: vec![ConfigValidationError {
                        code: "AGENT_NOT_FOUND".into(),
                        message: format!(
                            "Agent \"{}\" not found in registry",
                            self.agent_name
                        ),
                    }],
                };
            }
        };
        config_validator::validate_agent_config(config)
    }

    fn require_connection(&self) -> Result<&ConnectionState, TransportError> {
        self.connection
            .as_ref()
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
}
