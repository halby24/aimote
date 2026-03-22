use std::sync::Arc;
use tokio::sync::{mpsc, oneshot};

use crate::acp_transport::{AcpTransport, SessionListItem, TransportError};
use crate::agent_registry::AgentRegistry;
use crate::config_validator::ConfigValidationResult;
use crate::event_sink::EventSink;

/// A Send + Sync handle to AcpTransport running on a dedicated LocalSet thread.
#[derive(Clone)]
pub struct TransportHandle {
    tx: mpsc::UnboundedSender<TransportCommand>,
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
    ValidateConfig {
        reply: oneshot::Sender<ConfigValidationResult>,
    },
    UpdateConfig {
        agent_name: String,
        registry: AgentRegistry,
        reply: oneshot::Sender<()>,
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
        let (tx, rx) = mpsc::unbounded_channel();

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to build tokio runtime for transport");

            let local = tokio::task::LocalSet::new();
            local.block_on(&rt, async move {
                let mut transport = AcpTransport::new(agent_name, registry, sink, cwd);
                run_actor(&mut transport, rx).await;
            });
        });

        Self { tx }
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

    pub async fn validate_config(&self) -> Result<ConfigValidationResult, TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::ValidateConfig { reply });
        rx.await.map_err(|_| TransportError::NotConnected)
    }

    pub async fn update_config(
        &self,
        agent_name: String,
        registry: AgentRegistry,
    ) -> Result<(), TransportError> {
        let (reply, rx) = oneshot::channel();
        let _ = self.tx.send(TransportCommand::UpdateConfig {
            agent_name,
            registry,
            reply,
        });
        rx.await.map_err(|_| TransportError::NotConnected)
    }
}

async fn run_actor(
    transport: &mut AcpTransport,
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
                let _ = reply.send(transport.send_user_message(&session_id, &text).await);
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
            TransportCommand::ValidateConfig { reply } => {
                let _ = reply.send(transport.validate_config());
            }
            TransportCommand::UpdateConfig {
                agent_name,
                registry,
                reply,
            } => {
                transport.update_config(agent_name, registry);
                let _ = reply.send(());
            }
        }
    }
}
