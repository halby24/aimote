use serde::{Deserialize, Serialize};

// -- Connection --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionStatus {
    Idle,
    Connecting,
    Ready,
    Disconnected,
    Error,
}

// -- Stop Reason --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StopReason {
    EndTurn,
    MaxTokens,
    MaxTurnRequests,
    Refusal,
    Cancelled,
}

// -- Tool Call types --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolCallStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolKind {
    Read,
    Edit,
    Delete,
    Move,
    Search,
    Execute,
    Think,
    Fetch,
    SwitchMode,
    Other,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ToolCallContentItem {
    #[serde(rename_all = "camelCase")]
    Text { text: String },
    #[serde(rename_all = "camelCase")]
    Diff {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        old_text: Option<String>,
        new_text: String,
    },
    #[serde(rename_all = "camelCase")]
    Terminal { terminal_id: String },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallLocation {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallInfo {
    pub tool_call_id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<ToolKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ToolCallStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<ToolCallContentItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locations: Option<Vec<ToolCallLocation>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallUpdateInfo {
    pub tool_call_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ToolCallStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<ToolCallContentItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locations: Option<Vec<ToolCallLocation>>,
}

// -- Plan --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanEntryPriority {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanEntryStatus {
    Pending,
    InProgress,
    Completed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanEntry {
    pub content: String,
    pub priority: PlanEntryPriority,
    pub status: PlanEntryStatus,
}

// -- Command --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandInfo {
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_hint: Option<String>,
}

// -- Usage --

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostInfo {
    pub amount: f64,
    pub currency: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageInfo {
    pub size: u64,
    pub used: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<CostInfo>,
}

// -- Permission --

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionOptionKind {
    AllowOnce,
    AllowAlways,
    RejectOnce,
    RejectAlways,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionOption {
    pub option_id: String,
    pub name: String,
    pub kind: PermissionOptionKind,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call: Option<ToolCallUpdateInfo>,
    pub options: Vec<PermissionOption>,
}

// -- AgentEvent --

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AgentEvent {
    #[serde(rename_all = "camelCase")]
    ConnectionStatus {
        status: ConnectionStatus,
    },
    #[serde(rename_all = "camelCase")]
    SessionStarted {
        session_id: String,
    },
    #[serde(rename_all = "camelCase")]
    MessageDelta {
        session_id: String,
        message_id: String,
        delta: String,
    },
    #[serde(rename_all = "camelCase")]
    MessageCompleted {
        session_id: String,
        message_id: String,
    },
    #[serde(rename_all = "camelCase")]
    PermissionRequested {
        session_id: String,
        request_id: String,
        payload: PermissionPayload,
    },
    #[serde(rename_all = "camelCase")]
    Error {
        code: String,
        message: String,
    },
    #[serde(rename_all = "camelCase")]
    ToolCallStarted {
        session_id: String,
        tool_call: ToolCallInfo,
    },
    #[serde(rename_all = "camelCase")]
    ToolCallUpdated {
        session_id: String,
        tool_call_id: String,
        update: ToolCallUpdateInfo,
    },
    #[serde(rename_all = "camelCase")]
    Plan {
        session_id: String,
        entries: Vec<PlanEntry>,
    },
    #[serde(rename_all = "camelCase")]
    ThoughtDelta {
        session_id: String,
        delta: String,
    },
    #[serde(rename_all = "camelCase")]
    ModeChanged {
        session_id: String,
        mode_id: String,
    },
    #[serde(rename_all = "camelCase")]
    CommandsChanged {
        session_id: String,
        commands: Vec<CommandInfo>,
    },
    #[serde(rename_all = "camelCase")]
    UsageUpdate {
        session_id: String,
        usage: UsageInfo,
    },
    #[serde(rename_all = "camelCase")]
    SessionInfoUpdate {
        session_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    TurnCompleted {
        session_id: String,
        stop_reason: StopReason,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connection_status_event_serializes_correctly() {
        let event = AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Ready,
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "connectionStatus");
        assert_eq!(json["status"], "ready");
    }

    #[test]
    fn session_started_event_serializes_correctly() {
        let event = AgentEvent::SessionStarted {
            session_id: "sess-1".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "sessionStarted");
        assert_eq!(json["sessionId"], "sess-1");
    }

    #[test]
    fn message_delta_event_serializes_correctly() {
        let event = AgentEvent::MessageDelta {
            session_id: "sess-1".into(),
            message_id: "msg-1".into(),
            delta: "hello".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "messageDelta");
        assert_eq!(json["sessionId"], "sess-1");
        assert_eq!(json["messageId"], "msg-1");
        assert_eq!(json["delta"], "hello");
    }

    #[test]
    fn error_event_serializes_correctly() {
        let event = AgentEvent::Error {
            code: "INIT_ERROR".into(),
            message: "failed".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "error");
        assert_eq!(json["code"], "INIT_ERROR");
        assert_eq!(json["message"], "failed");
    }

    #[test]
    fn permission_requested_event_serializes_correctly() {
        let event = AgentEvent::PermissionRequested {
            session_id: "sess-1".into(),
            request_id: "perm-1".into(),
            payload: PermissionPayload {
                tool_call: None,
                options: vec![PermissionOption {
                    option_id: "opt-1".into(),
                    name: "Allow".into(),
                    kind: PermissionOptionKind::AllowOnce,
                }],
            },
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "permissionRequested");
        assert_eq!(json["sessionId"], "sess-1");
        assert_eq!(json["requestId"], "perm-1");
        assert!(json["payload"]["toolCall"].is_null() || json["payload"].get("toolCall").is_none());
        assert_eq!(json["payload"]["options"][0]["optionId"], "opt-1");
        assert_eq!(json["payload"]["options"][0]["kind"], "allow_once");
    }

    #[test]
    fn tool_call_started_event_serializes_correctly() {
        let event = AgentEvent::ToolCallStarted {
            session_id: "sess-1".into(),
            tool_call: ToolCallInfo {
                tool_call_id: "tc-1".into(),
                title: "Read file".into(),
                kind: Some(ToolKind::Read),
                status: Some(ToolCallStatus::InProgress),
                content: Some(vec![ToolCallContentItem::Text {
                    text: "reading foo.rs".into(),
                }]),
                locations: Some(vec![ToolCallLocation {
                    path: "src/main.rs".into(),
                    line: Some(42),
                }]),
            },
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "toolCallStarted");
        assert_eq!(json["toolCall"]["toolCallId"], "tc-1");
        assert_eq!(json["toolCall"]["kind"], "read");
        assert_eq!(json["toolCall"]["status"], "in_progress");
        assert_eq!(json["toolCall"]["content"][0]["type"], "text");
        assert_eq!(json["toolCall"]["locations"][0]["line"], 42);
    }

    #[test]
    fn tool_call_content_diff_serializes_correctly() {
        let item = ToolCallContentItem::Diff {
            path: "src/lib.rs".into(),
            old_text: Some("old".into()),
            new_text: "new".into(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["type"], "diff");
        assert_eq!(json["path"], "src/lib.rs");
        assert_eq!(json["oldText"], "old");
        assert_eq!(json["newText"], "new");
    }

    #[test]
    fn tool_call_content_terminal_serializes_correctly() {
        let item = ToolCallContentItem::Terminal {
            terminal_id: "term-1".into(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["type"], "terminal");
        assert_eq!(json["terminalId"], "term-1");
    }

    #[test]
    fn plan_event_serializes_correctly() {
        let event = AgentEvent::Plan {
            session_id: "sess-1".into(),
            entries: vec![PlanEntry {
                content: "Step 1".into(),
                priority: PlanEntryPriority::High,
                status: PlanEntryStatus::Pending,
            }],
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "plan");
        assert_eq!(json["entries"][0]["priority"], "high");
        assert_eq!(json["entries"][0]["status"], "pending");
    }

    #[test]
    fn thought_delta_event_serializes_correctly() {
        let event = AgentEvent::ThoughtDelta {
            session_id: "sess-1".into(),
            delta: "thinking...".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "thoughtDelta");
        assert_eq!(json["delta"], "thinking...");
    }

    #[test]
    fn mode_changed_event_serializes_correctly() {
        let event = AgentEvent::ModeChanged {
            session_id: "sess-1".into(),
            mode_id: "code".into(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "modeChanged");
        assert_eq!(json["modeId"], "code");
    }

    #[test]
    fn commands_changed_event_serializes_correctly() {
        let event = AgentEvent::CommandsChanged {
            session_id: "sess-1".into(),
            commands: vec![CommandInfo {
                name: "/help".into(),
                description: "Show help".into(),
                input_hint: Some("unstructured".into()),
            }],
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "commandsChanged");
        assert_eq!(json["commands"][0]["name"], "/help");
        assert_eq!(json["commands"][0]["inputHint"], "unstructured");
    }

    #[test]
    fn usage_update_event_serializes_correctly() {
        let event = AgentEvent::UsageUpdate {
            session_id: "sess-1".into(),
            usage: UsageInfo {
                size: 100000,
                used: 5000,
                cost: Some(CostInfo {
                    amount: 0.05,
                    currency: "USD".into(),
                }),
            },
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "usageUpdate");
        assert_eq!(json["usage"]["size"], 100000);
        assert_eq!(json["usage"]["used"], 5000);
        assert_eq!(json["usage"]["cost"]["amount"], 0.05);
        assert_eq!(json["usage"]["cost"]["currency"], "USD");
    }

    #[test]
    fn usage_update_without_cost_serializes_correctly() {
        let event = AgentEvent::UsageUpdate {
            session_id: "sess-1".into(),
            usage: UsageInfo {
                size: 100000,
                used: 5000,
                cost: None,
            },
        };
        let json = serde_json::to_value(&event).unwrap();
        assert!(json["usage"].get("cost").is_none());
    }

    #[test]
    fn session_info_update_event_serializes_correctly() {
        let event = AgentEvent::SessionInfoUpdate {
            session_id: "sess-1".into(),
            title: Some("My session".into()),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "sessionInfoUpdate");
        assert_eq!(json["title"], "My session");
    }

    #[test]
    fn session_info_update_without_title_serializes_correctly() {
        let event = AgentEvent::SessionInfoUpdate {
            session_id: "sess-1".into(),
            title: None,
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "sessionInfoUpdate");
        assert!(json.get("title").is_none());
    }

    #[test]
    fn turn_completed_event_serializes_correctly() {
        let event = AgentEvent::TurnCompleted {
            session_id: "sess-1".into(),
            stop_reason: StopReason::EndTurn,
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["type"], "turnCompleted");
        assert_eq!(json["stopReason"], "end_turn");
    }

    #[test]
    fn all_stop_reasons_serialize_correctly() {
        let cases = vec![
            (StopReason::EndTurn, "end_turn"),
            (StopReason::MaxTokens, "max_tokens"),
            (StopReason::MaxTurnRequests, "max_turn_requests"),
            (StopReason::Refusal, "refusal"),
            (StopReason::Cancelled, "cancelled"),
        ];
        for (reason, expected) in cases {
            let json = serde_json::to_value(&reason).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn all_connection_statuses_serialize_correctly() {
        let cases = vec![
            (ConnectionStatus::Idle, "idle"),
            (ConnectionStatus::Connecting, "connecting"),
            (ConnectionStatus::Ready, "ready"),
            (ConnectionStatus::Disconnected, "disconnected"),
            (ConnectionStatus::Error, "error"),
        ];
        for (status, expected) in cases {
            let json = serde_json::to_value(&status).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn agent_event_roundtrip_deserialization() {
        let event = AgentEvent::ToolCallStarted {
            session_id: "sess-1".into(),
            tool_call: ToolCallInfo {
                tool_call_id: "tc-1".into(),
                title: "Edit".into(),
                kind: Some(ToolKind::Edit),
                status: None,
                content: None,
                locations: None,
            },
        };
        let json_str = serde_json::to_string(&event).unwrap();
        let deserialized: AgentEvent = serde_json::from_str(&json_str).unwrap();
        assert_eq!(event, deserialized);
    }

    #[test]
    fn tool_call_content_diff_without_old_text_omits_field() {
        let item = ToolCallContentItem::Diff {
            path: "a.rs".into(),
            old_text: None,
            new_text: "new".into(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert!(json.get("oldText").is_none());
    }

    #[test]
    fn tool_call_info_minimal_omits_optional_fields() {
        let info = ToolCallInfo {
            tool_call_id: "tc-1".into(),
            title: "Test".into(),
            kind: None,
            status: None,
            content: None,
            locations: None,
        };
        let json = serde_json::to_value(&info).unwrap();
        assert!(json.get("kind").is_none());
        assert!(json.get("status").is_none());
        assert!(json.get("content").is_none());
        assert!(json.get("locations").is_none());
    }

    #[test]
    fn permission_option_kinds_serialize_correctly() {
        let cases = vec![
            (PermissionOptionKind::AllowOnce, "allow_once"),
            (PermissionOptionKind::AllowAlways, "allow_always"),
            (PermissionOptionKind::RejectOnce, "reject_once"),
            (PermissionOptionKind::RejectAlways, "reject_always"),
        ];
        for (kind, expected) in cases {
            let json = serde_json::to_value(&kind).unwrap();
            assert_eq!(json, expected);
        }
    }
}
