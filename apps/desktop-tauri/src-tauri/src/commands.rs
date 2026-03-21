use tauri::State;

use aimote_backend::acp_transport::SessionListItem;

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
