use std::net::SocketAddr;

use aimote_backend::agent_config_file::{load_agents_file, AgentsFile};
use aimote_backend::ws_server::{self, WsServerConfig};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to get app config dir");
            let agents_path = config_dir.join("agents.json");
            let agents_file = load_agents_file(&agents_path).unwrap_or_else(|e| {
                eprintln!("Failed to load agents.json: {e}, using defaults");
                AgentsFile::default()
            });

            let default_agent = agents_file.default_agent.clone();
            let agent_config = agents_file
                .agents
                .iter()
                .find(|a| a.name == default_agent)
                .cloned()
                .unwrap_or_else(|| {
                    agents_file
                        .agents
                        .first()
                        .cloned()
                        .unwrap_or_else(|| AgentsFile::default().agents.into_iter().next().unwrap())
                });
            let (_default_agent, registry) = agents_file.into_registry();

            // Start embedded WebSocket server on a random port
            let addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
            let (actual_addr, _server_handle) = tauri::async_runtime::block_on(
                ws_server::start_ws_server(
                    addr,
                    WsServerConfig {
                        agent_name: default_agent,
                        agent_config,
                        registry,
                        config_path: agents_path,
                    },
                ),
            )?;

            let port = actual_addr.port();
            eprintln!("WebSocket server started on port {port}");

            // Create the main window with initialization_script so the WS port
            // is available before any page JavaScript executes.
            // (tauri.conf.json has "windows": [] to prevent auto-creation)
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("aimote")
                .inner_size(1024.0, 768.0)
                .initialization_script(&format!(
                    "Object.defineProperty(window, '__AIMOTE_WS_PORT__', {{ value: {port}, writable: false }});"
                ))
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
