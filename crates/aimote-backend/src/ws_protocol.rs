use serde::{Deserialize, Serialize};

use crate::acp_transport::SessionListItem;
use crate::agent_config_file::AgentsFile;
use crate::config_validator::ConfigValidationResult;
use crate::types::AgentEvent;

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

/// Envelope that wraps every incoming WebSocket message.
/// `req_id` enables request-reply correlation: when present, the server sends
/// back a [`WsReply`] with the same `req_id`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WsEnvelope {
    #[serde(default)]
    pub req_id: Option<String>,
    #[serde(flatten)]
    pub message: WsClientMessage,
}

/// The actual command payload inside a [`WsEnvelope`].
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
    ValidateConfig,
    GetAgentsConfig,
    #[serde(rename_all = "camelCase")]
    SaveAgentsConfig {
        config: AgentsFile,
    },
}

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

/// Push event — an [`AgentEvent`] forwarded to the client as-is.
/// Discriminated from [`WsReply`] by the absence of `reqId`.
pub type WsServerEvent = AgentEvent;

/// Request-reply response with a correlation ID.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WsReply {
    pub req_id: String,
    #[serde(flatten)]
    pub body: WsReplyBody,
}

/// The payload of a [`WsReply`].
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsReplyBody {
    Ok,
    #[serde(rename_all = "camelCase")]
    SessionStarted {
        session_id: String,
    },
    #[serde(rename_all = "camelCase")]
    SessionsList {
        sessions: Vec<SessionListItem>,
    },
    #[serde(rename_all = "camelCase")]
    ConfigValidation {
        result: ConfigValidationResult,
    },
    #[serde(rename_all = "camelCase")]
    AgentsConfig {
        config: AgentsFile,
    },
    #[serde(rename_all = "camelCase")]
    Error {
        code: String,
        message: String,
    },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_connect_without_req_id() {
        let json = r#"{"type":"connect"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert!(env.req_id.is_none());
        assert!(matches!(env.message, WsClientMessage::Connect));
    }

    #[test]
    fn deserialize_connect_with_req_id() {
        let json = r#"{"type":"connect","reqId":"r1"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert_eq!(env.req_id.as_deref(), Some("r1"));
        assert!(matches!(env.message, WsClientMessage::Connect));
    }

    #[test]
    fn deserialize_start_session() {
        let json = r#"{"type":"startSession","reqId":"r2","workspace":"/tmp"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert_eq!(env.req_id.as_deref(), Some("r2"));
        match env.message {
            WsClientMessage::StartSession { workspace } => {
                assert_eq!(workspace.as_deref(), Some("/tmp"));
            }
            _ => panic!("expected StartSession"),
        }
    }

    #[test]
    fn deserialize_send_message() {
        let json = r#"{"type":"sendMessage","sessionId":"s1","text":"hello"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert!(env.req_id.is_none());
        match env.message {
            WsClientMessage::SendMessage { session_id, text } => {
                assert_eq!(session_id, "s1");
                assert_eq!(text, "hello");
            }
            _ => panic!("expected SendMessage"),
        }
    }

    #[test]
    fn deserialize_approve() {
        let json =
            r#"{"type":"approve","reqId":"r3","requestId":"perm1","optionId":"allow"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert_eq!(env.req_id.as_deref(), Some("r3"));
        match env.message {
            WsClientMessage::Approve {
                request_id,
                option_id,
            } => {
                assert_eq!(request_id, "perm1");
                assert_eq!(option_id, "allow");
            }
            _ => panic!("expected Approve"),
        }
    }

    #[test]
    fn deserialize_validate_config() {
        let json = r#"{"type":"validateConfig","reqId":"r4"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert_eq!(env.req_id.as_deref(), Some("r4"));
        assert!(matches!(env.message, WsClientMessage::ValidateConfig));
    }

    #[test]
    fn deserialize_get_agents_config() {
        let json = r#"{"type":"getAgentsConfig","reqId":"r5"}"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert!(matches!(env.message, WsClientMessage::GetAgentsConfig));
    }

    #[test]
    fn deserialize_save_agents_config() {
        let json = r#"{
            "type": "saveAgentsConfig",
            "reqId": "r6",
            "config": {
                "defaultAgent": "claude",
                "agents": [{"name": "claude", "command": "claude-agent-acp", "args": []}]
            }
        }"#;
        let env: WsEnvelope = serde_json::from_str(json).unwrap();
        assert_eq!(env.req_id.as_deref(), Some("r6"));
        match env.message {
            WsClientMessage::SaveAgentsConfig { config } => {
                assert_eq!(config.default_agent, "claude");
                assert_eq!(config.agents.len(), 1);
            }
            _ => panic!("expected SaveAgentsConfig"),
        }
    }

    #[test]
    fn serialize_reply_ok() {
        let reply = WsReply {
            req_id: "r1".into(),
            body: WsReplyBody::Ok,
        };
        let json = serde_json::to_value(&reply).unwrap();
        assert_eq!(json["reqId"], "r1");
        assert_eq!(json["type"], "ok");
    }

    #[test]
    fn serialize_reply_session_started() {
        let reply = WsReply {
            req_id: "r2".into(),
            body: WsReplyBody::SessionStarted {
                session_id: "s1".into(),
            },
        };
        let json = serde_json::to_value(&reply).unwrap();
        assert_eq!(json["reqId"], "r2");
        assert_eq!(json["type"], "sessionStarted");
        assert_eq!(json["sessionId"], "s1");
    }

    #[test]
    fn serialize_reply_error() {
        let reply = WsReply {
            req_id: "r3".into(),
            body: WsReplyBody::Error {
                code: "NOT_FOUND".into(),
                message: "Agent not found".into(),
            },
        };
        let json = serde_json::to_value(&reply).unwrap();
        assert_eq!(json["reqId"], "r3");
        assert_eq!(json["type"], "error");
        assert_eq!(json["code"], "NOT_FOUND");
    }
}
