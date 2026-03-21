use serde::{Deserialize, Serialize};
use crate::types::AgentEvent;

/// Incoming WebSocket message from a mobile/relay client.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsClientMessage {
    Connect,
    Disconnect,
    #[serde(rename_all = "camelCase")]
    StartSession {
        workspace: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    SendMessage {
        session_id: String,
        text: String,
    },
    #[serde(rename_all = "camelCase")]
    Cancel {
        session_id: String,
    },
    #[serde(rename_all = "camelCase")]
    Approve {
        request_id: String,
        option_id: String,
    },
    ListSessions,
    #[serde(rename_all = "camelCase")]
    LoadSession {
        session_id: String,
    },
}

/// Outgoing WebSocket message to a mobile/relay client.
/// This is just AgentEvent serialized as JSON.
pub type WsServerMessage = AgentEvent;

/// Response wrapper for request-reply style messages.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsResponse {
    #[serde(rename_all = "camelCase")]
    SessionStarted {
        session_id: String,
    },
    #[serde(rename_all = "camelCase")]
    SessionsList {
        sessions: Vec<crate::acp_transport::SessionListItem>,
    },
    Ok,
    #[serde(rename_all = "camelCase")]
    Error {
        code: String,
        message: String,
    },
}
