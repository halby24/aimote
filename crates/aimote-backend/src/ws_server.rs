use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use crate::agent_config_file::{load_agents_file, save_agents_file, AgentsFile};
use crate::agent_registry::{AgentConfig, AgentRegistry};
use crate::event_sink::EventSink;
use crate::transport_handle::TransportHandle;
use crate::types::AgentEvent;
use crate::ws_protocol::{WsClientMessage, WsEnvelope, WsReply, WsReplyBody};

/// EventSink that sends events over a channel (for WebSocket forwarding).
struct ChannelEventSink {
    tx: mpsc::UnboundedSender<AgentEvent>,
}

impl EventSink for ChannelEventSink {
    fn emit(&self, event: AgentEvent) {
        let _ = self.tx.send(event);
    }
}

/// Configuration for the WebSocket server.
pub struct WsServerConfig {
    pub agent_name: String,
    pub agent_config: AgentConfig,
    pub registry: AgentRegistry,
    pub config_path: PathBuf,
}

/// Start a WebSocket server on the given address.
///
/// Returns the actual bound address (useful when binding to port 0) and a
/// handle to the accept loop task.
pub async fn start_ws_server(
    addr: SocketAddr,
    config: WsServerConfig,
) -> std::io::Result<(SocketAddr, JoinHandle<()>)> {
    let listener = TcpListener::bind(addr).await?;
    let actual_addr = listener.local_addr()?;
    info!("WebSocket server listening on ws://{}", actual_addr);

    let config = Arc::new(config);

    let handle = tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, peer)) => {
                    info!("New connection from {}", peer);
                    let cfg = config.clone();
                    tokio::spawn(handle_connection(stream, cfg));
                }
                Err(e) => {
                    error!("Accept failed: {}", e);
                }
            }
        }
    });

    Ok((actual_addr, handle))
}

async fn handle_connection(stream: TcpStream, config: Arc<WsServerConfig>) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Channel for pushing AgentEvents to the WebSocket
    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<AgentEvent>();
    let sink = Arc::new(ChannelEventSink { tx: event_tx });

    let mut registry = config.registry.clone();
    // Ensure the agent config is registered
    registry.register(config.agent_config.clone());

    let handle = TransportHandle::spawn(
        config.agent_name.clone(),
        registry,
        sink,
        None,
    );

    // Channel for sending serialized messages (both events and replies) to WS
    let (ws_tx, mut ws_rx) = mpsc::unbounded_channel::<String>();
    let ws_tx_events = ws_tx.clone();

    // Forward AgentEvents to ws_tx as JSON
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            match serde_json::to_string(&event) {
                Ok(json) => {
                    if ws_tx_events.send(json).is_err() {
                        break;
                    }
                }
                Err(e) => error!("Failed to serialize event: {}", e),
            }
        }
    });

    // Send all queued messages to the WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(json) = ws_rx.recv().await {
            if ws_sender.send(Message::Text(json.into())).await.is_err() {
                break;
            }
        }
    });

    let config_path = config.config_path.clone();

    // Process incoming messages
    while let Some(msg) = ws_receiver.next().await {
        let text = match msg {
            Ok(Message::Text(t)) => t,
            Ok(Message::Close(_)) => break,
            Ok(_) => continue,
            Err(e) => {
                warn!("WebSocket receive error: {}", e);
                break;
            }
        };

        let envelope: WsEnvelope = match serde_json::from_str(&text) {
            Ok(e) => e,
            Err(e) => {
                warn!("Invalid message: {}", e);
                continue;
            }
        };

        let reply_body =
            dispatch_command(&handle, &config_path, envelope.message).await;

        // Send reply if reqId was provided
        if let Some(req_id) = envelope.req_id {
            let reply = WsReply {
                req_id,
                body: reply_body,
            };
            match serde_json::to_string(&reply) {
                Ok(json) => {
                    let _ = ws_tx.send(json);
                }
                Err(e) => error!("Failed to serialize reply: {}", e),
            }
        }
    }

    send_task.abort();
    info!("Connection closed");
}

async fn dispatch_command(
    handle: &TransportHandle,
    config_path: &PathBuf,
    message: WsClientMessage,
) -> WsReplyBody {
    match message {
        WsClientMessage::Connect => match handle.connect().await {
            Ok(()) => WsReplyBody::Ok,
            Err(e) => make_error("CONNECT_FAILED", e),
        },
        WsClientMessage::Disconnect => {
            handle.disconnect().await;
            WsReplyBody::Ok
        }
        WsClientMessage::StartSession { workspace } => {
            match handle.start_session(workspace).await {
                Ok(session_id) => WsReplyBody::SessionStarted { session_id },
                Err(e) => make_error("START_SESSION_FAILED", e),
            }
        }
        WsClientMessage::SendMessage { session_id, text } => {
            match handle.send_user_message(&session_id, &text).await {
                Ok(()) => WsReplyBody::Ok,
                Err(e) => make_error("SEND_FAILED", e),
            }
        }
        WsClientMessage::Cancel { session_id } => {
            match handle.cancel(&session_id).await {
                Ok(()) => WsReplyBody::Ok,
                Err(e) => make_error("CANCEL_FAILED", e),
            }
        }
        WsClientMessage::Approve {
            request_id,
            option_id,
        } => match handle.approve(&request_id, &option_id).await {
            Ok(()) => WsReplyBody::Ok,
            Err(e) => make_error("APPROVE_FAILED", e),
        },
        WsClientMessage::ListSessions => match handle.list_sessions().await {
            Ok(sessions) => WsReplyBody::SessionsList { sessions },
            Err(e) => make_error("LIST_SESSIONS_FAILED", e),
        },
        WsClientMessage::LoadSession { session_id } => {
            match handle.load_session(&session_id).await {
                Ok(()) => WsReplyBody::Ok,
                Err(e) => make_error("LOAD_SESSION_FAILED", e),
            }
        }
        WsClientMessage::ValidateConfig => {
            let result = handle.validate_config();
            WsReplyBody::ConfigValidation { result }
        }
        WsClientMessage::GetAgentsConfig => {
            match load_agents_file(config_path) {
                Ok(config) => WsReplyBody::AgentsConfig { config },
                Err(e) => make_error("LOAD_CONFIG_FAILED", e),
            }
        }
        WsClientMessage::SaveAgentsConfig { config } => {
            match save_and_apply_config(handle, config_path, config) {
                Ok(()) => WsReplyBody::Ok,
                Err(e) => WsReplyBody::Error {
                    code: "SAVE_CONFIG_FAILED".into(),
                    message: e,
                },
            }
        }
    }
}

fn save_and_apply_config(
    handle: &TransportHandle,
    config_path: &PathBuf,
    config: AgentsFile,
) -> Result<(), String> {
    // Validate: defaultAgent must exist in agents list
    if !config.agents.iter().any(|a| a.name == config.default_agent) {
        return Err(format!(
            "defaultAgent \"{}\" not found in agents list",
            config.default_agent
        ));
    }

    save_agents_file(config_path, &config).map_err(|e| e.to_string())?;

    let (agent_name, registry) = config.into_registry();
    handle.update_config(agent_name, registry);

    Ok(())
}

fn make_error(code: &str, e: impl std::fmt::Display) -> WsReplyBody {
    WsReplyBody::Error {
        code: code.into(),
        message: e.to_string(),
    }
}
