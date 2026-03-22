mod commands;
mod state;
mod tauri_event_sink;

use std::sync::Arc;

use aimote_backend::agent_config_file::{load_agents_file, AgentsFile};
use aimote_backend::transport_handle::TransportHandle;
use tauri::Manager;

use state::AppState;
use tauri_event_sink::TauriEventSink;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sink = Arc::new(TauriEventSink::new(app.handle().clone()));

            let config_dir = app.path().app_config_dir().expect("failed to get app config dir");
            let agents_path = config_dir.join("agents.json");
            let agents_file = load_agents_file(&agents_path).unwrap_or_else(|e| {
                eprintln!("Failed to load agents.json: {e}, using defaults");
                AgentsFile::default()
            });
            let (default_agent, registry) = agents_file.into_registry();

            let handle = TransportHandle::spawn(
                default_agent,
                registry,
                sink,
                None,
            );

            app.manage(AppState { transport: handle });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::start_session,
            commands::send_user_message,
            commands::cancel_session,
            commands::approve_permission,
            commands::list_sessions,
            commands::load_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
