use std::net::SocketAddr;
use std::path::PathBuf;

use clap::Parser;
use aimote_backend::agent_config_file::{load_agents_file, AgentsFile};
use aimote_backend::agent_registry::AgentConfig;
use aimote_backend::ws_server::{self, WsServerConfig};

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

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();

    // Resolve agent config: CLI args > config file > defaults
    let (agent_name, agent_config, agents_file) = resolve_config(&args);
    let (_default_agent, registry) = agents_file.into_registry();

    let config_path = args
        .config
        .unwrap_or_else(|| default_config_path());

    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));

    let (_actual_addr, server_handle) = ws_server::start_ws_server(
        addr,
        WsServerConfig {
            agent_name,
            agent_config,
            registry,
            config_path,
        },
    )
    .await
    .expect("Failed to start WebSocket server");

    server_handle.await.expect("Server task panicked");
}

fn resolve_config(args: &Args) -> (String, AgentConfig, AgentsFile) {
    if args.command.is_some() {
        // CLI args explicitly provided
        let name = args.agent.clone().unwrap_or_else(|| "claude".into());
        let config = AgentConfig {
            name: name.clone(),
            command: args.command.clone().unwrap(),
            args: args
                .args
                .as_deref()
                .unwrap_or("--chat")
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            env: None,
        };
        let agents_file = AgentsFile::default();
        (name, config, agents_file)
    } else if let Some(config_path) = &args.config {
        let agents_file = load_agents_file(config_path).unwrap_or_else(|e| {
            eprintln!("Failed to load config: {e}, using defaults");
            AgentsFile::default()
        });
        let agent_name = args
            .agent
            .clone()
            .unwrap_or(agents_file.default_agent.clone());
        let agent_config = agents_file
            .agents
            .iter()
            .find(|a| a.name == agent_name)
            .cloned()
            .unwrap_or_else(|| {
                eprintln!(
                    "Agent '{agent_name}' not found in config, using first entry or default"
                );
                agents_file
                    .agents
                    .first()
                    .cloned()
                    .unwrap_or_else(|| AgentsFile::default().agents.into_iter().next().unwrap())
            });
        (agent_name, agent_config, agents_file)
    } else {
        let name = args.agent.clone().unwrap_or_else(|| "claude".into());
        let config = AgentConfig {
            name: name.clone(),
            command: "claude".into(),
            args: vec!["--chat".into()],
            env: None,
        };
        let agents_file = AgentsFile::default();
        (name, config, agents_file)
    }
}

fn default_config_path() -> PathBuf {
    dirs_next::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("aimote")
        .join("agents.json")
}
