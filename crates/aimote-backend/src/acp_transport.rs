use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::sync::{Arc, RwLock};
use tokio::sync::{mpsc, Mutex};
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

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

struct ConnectionInner {
    conn: Rc<ClientSideConnection>,
    io_handle: tokio::task::JoinHandle<()>,
    capabilities: AgentCapabilities,
}

struct SessionInner {
    session_id: String,
    turn_active: bool,
}

enum TransportState {
    Disconnected,
    Connected {
        inner: ConnectionInner,
        session: Option<SessionInner>,
    },
}

/// Notifications sent from background tasks (e.g. process monitor) to the
/// actor loop so that state mutations always happen on the LocalSet thread.
pub enum InternalNotification {
    /// The agent process exited. `generation` identifies which connection
    /// spawned it, so stale notifications from old connections are ignored.
    ProcessDied { generation: u64 },
}

// ---------------------------------------------------------------------------
// AcpTransport
// ---------------------------------------------------------------------------

pub struct AcpTransport {
    sink: Arc<dyn EventSink>,
    config: Arc<RwLock<SharedConfig>>,
    cwd: Option<String>,
    state: Rc<RefCell<TransportState>>,
    permission_resolver: Arc<Mutex<PermissionResolver>>,
    internal_tx: mpsc::UnboundedSender<InternalNotification>,
    /// Monotonically increasing counter to distinguish connections.
    /// Each `connect()` increments this; process monitors capture the value
    /// so stale `ProcessDied` notifications from old connections are discarded.
    generation: Cell<u64>,
}

impl AcpTransport {
    pub fn new(
        config: Arc<RwLock<SharedConfig>>,
        sink: Arc<dyn EventSink>,
        cwd: Option<String>,
    ) -> (Self, mpsc::UnboundedReceiver<InternalNotification>) {
        let (internal_tx, internal_rx) = mpsc::unbounded_channel();
        let transport = Self {
            sink,
            config,
            cwd,
            state: Rc::new(RefCell::new(TransportState::Disconnected)),
            permission_resolver: Arc::new(Mutex::new(PermissionResolver::new())),
            internal_tx,
            generation: Cell::new(0),
        };
        (transport, internal_rx)
    }

    // -- lifecycle -----------------------------------------------------------

    pub async fn connect(&self) -> Result<(), TransportError> {
        if matches!(&*self.state.borrow(), TransportState::Connected { .. }) {
            self.disconnect().await;
        }

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

        // Bump generation so stale ProcessDied from old connections are ignored
        let gen = self.generation.get() + 1;
        self.generation.set(gen);

        // Monitor process exit — notify the actor loop via channel
        let sink_clone = self.sink.clone();
        let internal_tx = self.internal_tx.clone();
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
            let _ = internal_tx.send(InternalNotification::ProcessDied { generation: gen });
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

        let capabilities = init_response.agent_capabilities;

        *self.state.borrow_mut() = TransportState::Connected {
            inner: ConnectionInner {
                conn: Rc::new(conn),
                io_handle,
                capabilities,
            },
            session: None,
        };

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Ready,
        });

        Ok(())
    }

    pub async fn disconnect(&self) {
        self.permission_resolver.lock().await.cancel_all();

        let old = std::mem::replace(&mut *self.state.borrow_mut(), TransportState::Disconnected);
        if let TransportState::Connected { inner, .. } = old {
            inner.io_handle.abort();
        }

        self.sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Disconnected,
        });
    }

    /// Called by the actor loop when the agent process exits.
    /// Only acts if `generation` matches the current connection; stale
    /// notifications from old connections are silently discarded.
    pub fn handle_process_died(&self, generation: u64) {
        if self.generation.get() != generation {
            return; // Stale notification from a previous connection
        }
        let was_connected = matches!(&*self.state.borrow(), TransportState::Connected { .. });
        *self.state.borrow_mut() = TransportState::Disconnected;
        if was_connected {
            self.sink.emit(AgentEvent::ConnectionStatus {
                status: ConnectionStatus::Disconnected,
            });
        }
    }

    // -- session -------------------------------------------------------------

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

        {
            let mut state = self.state.borrow_mut();
            if let TransportState::Connected { session, .. } = &mut *state {
                *session = Some(SessionInner {
                    session_id: session_id.clone(),
                    turn_active: false,
                });
            }
        }

        self.sink.emit(AgentEvent::SessionStarted {
            session_id: session_id.clone(),
        });

        Ok(session_id)
    }

    // -- prompt / turn -------------------------------------------------------

    /// Spawn a prompt task that runs in the background on the LocalSet.
    /// Returns immediately after dispatching; the result is emitted via EventSink.
    pub fn spawn_prompt(
        &self,
        session_id: String,
        text: String,
    ) -> Result<(), TransportError> {
        // Validate state, extract connection, and mark turn active in one borrow
        let conn = {
            let mut state = self.state.borrow_mut();
            match &mut *state {
                TransportState::Connected { inner, session: Some(s) } => {
                    if s.session_id != session_id {
                        return Err(TransportError::SessionError(
                            format!("Session {} is not the active session", session_id),
                        ));
                    }
                    if s.turn_active {
                        return Err(TransportError::TurnInProgress);
                    }
                    s.turn_active = true;
                    inner.conn.clone()
                }
                TransportState::Connected { session: None, .. } => {
                    return Err(TransportError::NoActiveSession);
                }
                TransportState::Disconnected => {
                    return Err(TransportError::NotConnected);
                }
            }
        };

        let sink = self.sink.clone();
        let state_rc = self.state.clone();

        tokio::task::spawn_local(async move {
            let result = conn
                .prompt(PromptRequest::new(
                    session_id.clone(),
                    vec![ContentBlock::Text(TextContent::new(text))],
                ))
                .await;

            // Clear turn_active (only if still connected)
            {
                let mut state = state_rc.borrow_mut();
                if let TransportState::Connected { session: Some(s), .. } = &mut *state {
                    s.turn_active = false;
                }
            }

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

    // -- session management --------------------------------------------------

    pub async fn list_sessions(&self) -> Result<Vec<SessionListItem>, TransportError> {
        let (conn, capabilities) = self.require_connected()?;

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
        let (conn, capabilities) = self.require_connected()?;

        if !capabilities.load_session {
            return Err(TransportError::UnsupportedCapability(
                "Agent does not support session loading".into(),
            ));
        }

        conn
            .load_session(LoadSessionRequest::new(session_id.to_string(), "."))
            .await
            .map_err(|e| TransportError::SessionError(e.to_string()))?;

        {
            let mut state = self.state.borrow_mut();
            if let TransportState::Connected { session, .. } = &mut *state {
                *session = Some(SessionInner {
                    session_id: session_id.to_string(),
                    turn_active: false,
                });
            }
        }

        Ok(())
    }

    // -- helpers -------------------------------------------------------------

    /// Get connection + capabilities, or error if disconnected.
    fn require_connected(&self) -> Result<(Rc<ClientSideConnection>, AgentCapabilities), TransportError> {
        let borrow = self.state.borrow();
        match &*borrow {
            TransportState::Connected { inner, .. } => {
                Ok((inner.conn.clone(), inner.capabilities.clone()))
            }
            TransportState::Disconnected => Err(TransportError::NotConnected),
        }
    }

    /// Get connection Rc, or error if disconnected.
    fn require_connection_rc(&self) -> Result<Rc<ClientSideConnection>, TransportError> {
        let borrow = self.state.borrow();
        match &*borrow {
            TransportState::Connected { inner, .. } => Ok(inner.conn.clone()),
            TransportState::Disconnected => Err(TransportError::NotConnected),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TransportError {
    #[error("Not connected")]
    NotConnected,
    #[error("No active session")]
    NoActiveSession,
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
