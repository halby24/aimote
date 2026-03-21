mod commands;
mod state;
mod tauri_event_sink;

use std::sync::Arc;

use aimote_backend::agent_registry::{AgentConfig, AgentRegistry};
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

            let mut registry = AgentRegistry::new();
            registry.register(AgentConfig {
                name: "claude".into(),
                command: "claude".into(),
                args: vec!["--chat".into()],
                env: None,
            });

            let handle = TransportHandle::spawn(
                "claude".to_string(),
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
