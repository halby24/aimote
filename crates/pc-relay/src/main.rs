use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;
use tracing::{info, error, warn};

use aimote_backend::agent_config_file::{load_agents_file, AgentsFile};
use aimote_backend::agent_registry::{AgentConfig, AgentRegistry};
use aimote_backend::event_sink::EventSink;
use aimote_backend::types::AgentEvent;
use aimote_backend::ws_protocol::WsClientMessage;

#[derive(Parser)]
#[command(name = "pc-relay", about = "aimote WebSocket relay server")]
struct Args {
    /// Port to listen on
    #[arg(short, long, default_value = "3001")]
    port: u16,

    /// Agent name to use
    #[arg(short, long)]
    agent: Option<String>,

    /// Agent command
    #[arg(long)]
    command: Option<String>,

    /// Agent arguments (comma-separated)
    #[arg(long)]
    args: Option<String>,

    /// Path to agents.json config file
    #[arg(short, long)]
    config: Option<PathBuf>,
}

/// EventSink that sends events over a WebSocket connection.
struct WsEventSink {
    tx: tokio::sync::mpsc::UnboundedSender<AgentEvent>,
}

impl EventSink for WsEventSink {
    fn emit(&self, event: AgentEvent) {
        let _ = self.tx.send(event);
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();
    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));

    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
    info!("pc-relay listening on ws://{}", addr);

    // Resolve agent config: CLI args > config file > defaults
    let (agent_name, agent_config) = if args.command.is_some() {
        // CLI args explicitly provided
        let name = args.agent.unwrap_or_else(|| "claude".into());
        let config = AgentConfig {
            name: name.clone(),
            command: args.command.unwrap(),
            args: args
                .args
                .unwrap_or_else(|| "--chat".into())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            env: None,
        };
        (name, config)
    } else if let Some(config_path) = &args.config {
        // Load from config file
        let agents_file = load_agents_file(config_path).unwrap_or_else(|e| {
            eprintln!("Failed to load config: {e}, using defaults");
            AgentsFile::default()
        });
        let default_agent = args
            .agent
            .unwrap_or(agents_file.default_agent.clone());
        let config = agents_file
            .agents
            .into_iter()
            .find(|a| a.name == default_agent)
            .unwrap_or_else(|| {
                eprintln!("Agent '{default_agent}' not found in config, using first entry or default");
                AgentsFile::default().agents.into_iter().next().unwrap()
            });
        (default_agent, config)
    } else {
        // Defaults
        let name = args.agent.unwrap_or_else(|| "claude".into());
        let config = AgentConfig {
            name: name.clone(),
            command: "claude".into(),
            args: vec!["--chat".into()],
            env: None,
        };
        (name, config)
    };

    while let Ok((stream, peer)) = listener.accept().await {
        info!("New connection from {}", peer);
        let config = agent_config.clone();
        let name = agent_name.clone();
        tokio::spawn(handle_connection(stream, name, config));
    }
}

async fn handle_connection(stream: TcpStream, agent_name: String, config: AgentConfig) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Channel for sending events from the transport to the WebSocket
    let (event_tx, mut event_rx) = tokio::sync::mpsc::unbounded_channel::<AgentEvent>();

    let sink = Arc::new(WsEventSink { tx: event_tx });

    let mut registry = AgentRegistry::new();
    registry.register(config);

    // Run the transport on a dedicated LocalSet
    let handle = aimote_backend::transport_handle::TransportHandle::spawn(
        agent_name,
        registry,
        sink,
        None,
    );

    // Forward events to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            let json = match serde_json::to_string(&event) {
                Ok(j) => j,
                Err(e) => {
                    error!("Failed to serialize event: {}", e);
                    continue;
                }
            };
            if ws_sender.send(Message::Text(json.into())).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages
    while let Some(msg) = ws_receiver.next().await {
        let msg = match msg {
            Ok(Message::Text(text)) => text,
            Ok(Message::Close(_)) => break,
            Ok(_) => continue,
            Err(e) => {
                warn!("WebSocket receive error: {}", e);
                break;
            }
        };

        let client_msg: WsClientMessage = match serde_json::from_str(&msg) {
            Ok(m) => m,
            Err(e) => {
                warn!("Invalid message: {}", e);
                continue;
            }
        };

        match client_msg {
            WsClientMessage::Connect => {
                if let Err(e) = handle.connect().await {
                    error!("Connect failed: {}", e);
                }
            }
            WsClientMessage::Disconnect => {
                handle.disconnect().await;
            }
            WsClientMessage::StartSession { workspace } => {
                match handle.start_session(workspace).await {
                    Ok(_session_id) => {
                        // sessionStarted event is already emitted by transport
                    }
                    Err(e) => error!("StartSession failed: {}", e),
                }
            }
            WsClientMessage::SendMessage { session_id, text } => {
                if let Err(e) = handle.send_user_message(&session_id, &text).await {
                    error!("SendMessage failed: {}", e);
                }
            }
            WsClientMessage::Cancel { session_id } => {
                if let Err(e) = handle.cancel(&session_id).await {
                    error!("Cancel failed: {}", e);
                }
            }
            WsClientMessage::Approve {
                request_id,
                option_id,
            } => {
                if let Err(e) = handle.approve(&request_id, &option_id).await {
                    error!("Approve failed: {}", e);
                }
            }
            WsClientMessage::ListSessions => {
                match handle.list_sessions().await {
                    Ok(_sessions) => {
                        // Response sent via events
                    }
                    Err(e) => error!("ListSessions failed: {}", e),
                }
            }
            WsClientMessage::LoadSession { session_id } => {
                if let Err(e) = handle.load_session(&session_id).await {
                    error!("LoadSession failed: {}", e);
                }
            }
        }
    }

    send_task.abort();
    info!("Connection closed");
}
