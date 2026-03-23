use tauri::State;

use aimote_backend::acp_transport::SessionListItem;
use aimote_backend::agent_config_file::{load_agents_file, save_agents_file, AgentsFile};
use aimote_backend::config_validator::ConfigValidationResult;

use crate::state::AppState;

#[tauri::command]
pub async fn connect(state: State<'_, AppState>) -> Result<(), String> {
    state.transport.connect().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect(state: State<'_, AppState>) -> Result<(), String> {
    state.transport.disconnect().await;
    Ok(())
}

#[tauri::command]
pub async fn start_session(
    state: State<'_, AppState>,
    workspace: Option<String>,
) -> Result<String, String> {
    state
        .transport
        .start_session(workspace)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_user_message(
    state: State<'_, AppState>,
    session_id: String,
    text: String,
) -> Result<(), String> {
    state
        .transport
        .send_user_message(&session_id, &text)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    state
        .transport
        .cancel(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn approve_permission(
    state: State<'_, AppState>,
    request_id: String,
    option_id: String,
) -> Result<(), String> {
    state
        .transport
        .approve(&request_id, &option_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
) -> Result<Vec<SessionListItem>, String> {
    state
        .transport
        .list_sessions()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    state
        .transport
        .load_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_config(
    state: State<'_, AppState>,
) -> Result<ConfigValidationResult, String> {
    Ok(state.transport.validate_config())
}

#[tauri::command]
pub async fn get_agents_config(state: State<'_, AppState>) -> Result<AgentsFile, String> {
    load_agents_file(&state.agents_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_agents_config(
    state: State<'_, AppState>,
    config: AgentsFile,
) -> Result<(), String> {
    // Validate: defaultAgent must exist in agents list
    if !config.agents.iter().any(|a| a.name == config.default_agent) {
        return Err(format!(
            "defaultAgent \"{}\" not found in agents list",
            config.default_agent
        ));
    }

    save_agents_file(&state.agents_path, &config).map_err(|e| e.to_string())?;

    let (agent_name, registry) = config.into_registry();
    state.transport.update_config(agent_name, registry);

    Ok(())
}
