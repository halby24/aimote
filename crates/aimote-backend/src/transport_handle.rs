use std::sync::{Arc, RwLock};
use tokio::sync::{mpsc, oneshot};

use crate::acp_transport::{AcpTransport, SessionListItem, TransportError};
use crate::agent_registry::AgentRegistry;
use crate::config_validator::{self, ConfigValidationResult, ConfigValidationError};
use crate::event_sink::EventSink;

/// Shared agent configuration accessible from both the handle (any thread)
/// and the AcpTransport actor (LocalSet thread).
pub struct SharedConfig {
    pub agent_name: String,
    pub registry: AgentRegistry,
}

/// A Send + Sync handle to AcpTransport running on a dedicated LocalSet thread.
#[derive(Clone)]
pub struct TransportHandle {
    tx: mpsc::UnboundedSender<TransportCommand>,
    config: Arc<RwLock<SharedConfig>>,
}

enum TransportCommand {
    Connect {
        reply: oneshot::Sender<Result<(), TransportError>>,
    },
    Disconnect {
        reply: oneshot::Sender<()>,
    },
    StartSession {
        workspace: Option<String>,
        reply: oneshot::Sender<Result<String, TransportError>>,
    },
    SendUserMessage {
        session_id: String,
        text: String,
        reply: oneshot::Sender<Result<(), TransportError>>,
    },
    Cancel {
        session_id: String,
        reply: oneshot::Sender<Result<(), TransportError>>,
    },
    Approve {
        request_id: String,
        option_id: String,
        reply: oneshot::Sender<Result<(), TransportError>>,
    },
    ListSessions {
        reply: oneshot::Sender<Result<Vec<SessionListItem>, TransportError>>,
    },
    LoadSession {
        session_id: String,
        reply: oneshot::Sender<Result<(), TransportError>>,
    },
}

impl TransportHandle {
    /// Spawn a dedicated thread with a LocalSet to run the AcpTransport actor.
    pub fn spawn(
        agent_name: String,
        registry: AgentRegistry,
        sink: Arc<dyn EventSink>,
        cwd: Option<String>,
    ) -> Self {
        let config = Arc::new(RwLock::new(SharedConfig {
            agent_name,
            registry,
        }));
        let config_clone = config.clone();
        let (tx, rx) = mpsc::unbounded_channel();

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to build tokio runtime for transport");

            let local = tokio::task::LocalSet::new();
            local.block_on(&rt, async move {
                let transport = AcpTransport::new(config_clone, sink, cwd);
                run_actor(&transport, rx).await;
            });
        });

        Self { tx, config }
    }

    pub async fn connect(&self) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::Connect { reply });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn disconnect(&self) {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::Disconnect { reply });
        let _ = rx.await;
    }

    pub async fn start_session(
        &self,
        workspace: Option<String>,
    ) -> Result<String, TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::StartSession { workspace, reply });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn send_user_message(
        &self,
        session_id: &str,
        text: &str,
    ) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::SendUserMessage {
            session_id: session_id.to_string(),
            text: text.to_string(),
            reply,
        });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn cancel(&self, session_id: &str) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::Cancel {
            session_id: session_id.to_string(),
            reply,
        });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn approve(
        &self,
        request_id: &str,
        option_id: &str,
    ) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::Approve {
            request_id: request_id.to_string(),
            option_id: option_id.to_string(),
            reply,
        });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn list_sessions(&self) -> Result<Vec<SessionListItem>, TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::ListSessions { reply });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    pub async fn load_session(&self, session_id: &str) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::LoadSession {
            session_id: session_id.to_string(),
            reply,
        });
        rx.await.map_err(|_| TransportError::NotConnected)?
    }

    /// Read config directly without going through the actor loop.
    pub fn validate_config(&self) -> ConfigValidationResult {
        let cfg = self.config.read().unwrap();
        let config = match cfg.registry.get(&cfg.agent_name) {
            Some(c) => c,
            None => {
                return ConfigValidationResult {
                    valid: false,
                    errors: vec![ConfigValidationError {
                        code: "AGENT_NOT_FOUND".into(),
                        message: format!(
                            "Agent \"{}\" not found in registry",
                            cfg.agent_name
                        ),
                    }],
                };
            }
        };
        config_validator::validate_agent_config(config)
    }

    /// Update config directly without going through the actor loop.
    pub fn update_config(&self, agent_name: String, registry: AgentRegistry) {
        let mut cfg = self.config.write().unwrap();
        cfg.agent_name = agent_name;
        cfg.registry = registry;
    }
}

async fn run_actor(
    transport: &AcpTransport,
    mut rx: mpsc::UnboundedReceiver<TransportCommand>,
) {
    while let Some(cmd) = rx.recv().await {
        match cmd {
            TransportCommand::Connect { reply } => {
                let _ = reply.send(transport.connect().await);
            }
            TransportCommand::Disconnect { reply } => {
                transport.disconnect().await;
                let _ = reply.send(());
            }
            TransportCommand::StartSession { workspace, reply } => {
                let _ = reply.send(transport.start_session(workspace).await);
            }
            TransportCommand::SendUserMessage {
                session_id,
                text,
                reply,
            } => {
                let _ = reply.send(transport.spawn_prompt(session_id, text));
            }
            TransportCommand::Cancel { session_id, reply } => {
                let _ = reply.send(transport.cancel(&session_id).await);
            }
            TransportCommand::Approve {
                request_id,
                option_id,
                reply,
            } => {
                let _ = reply.send(transport.approve(&request_id, &option_id).await);
            }
            TransportCommand::ListSessions { reply } => {
                let _ = reply.send(transport.list_sessions().await);
            }
            TransportCommand::LoadSession { session_id, reply } => {
                let _ = reply.send(transport.load_session(&session_id).await);
            }
        }
    }
}
