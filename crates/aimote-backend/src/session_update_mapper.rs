use agent_client_protocol::{ContentBlock, SessionUpdate, ToolCallContent};
use crate::types::*;

/// Map an ACP SessionUpdate to zero or more AgentEvents.
pub fn map_session_update(session_id: &str, update: &SessionUpdate) -> Vec<AgentEvent> {
    match update {
        SessionUpdate::AgentMessageChunk(chunk) => map_content_chunk(session_id, chunk),
        SessionUpdate::UserMessageChunk(chunk) => map_content_chunk(session_id, chunk),
        SessionUpdate::AgentThoughtChunk(chunk) => map_thought_chunk(session_id, chunk),
        SessionUpdate::ToolCall(tc) => map_tool_call(session_id, tc),
        SessionUpdate::ToolCallUpdate(tcu) => map_tool_call_update(session_id, tcu),
        SessionUpdate::Plan(plan) => map_plan(session_id, plan),
        SessionUpdate::AvailableCommandsUpdate(upd) => map_commands_update(session_id, upd),
        SessionUpdate::CurrentModeUpdate(upd) => map_mode_update(session_id, upd),
        SessionUpdate::ConfigOptionUpdate(_) => vec![],
        SessionUpdate::SessionInfoUpdate(upd) => map_session_info_update(session_id, upd),
        // Unknown / future variants are silently ignored
        _ => vec![],
    }
}

fn map_content_chunk(
    session_id: &str,
    chunk: &agent_client_protocol::ContentChunk,
) -> Vec<AgentEvent> {
    let text = extract_text_from_content_block(&chunk.content);
    match text {
        Some(text) => {
            let message_id = "default".to_string();
            vec![AgentEvent::MessageDelta {
                session_id: session_id.to_string(),
                message_id,
                delta: text,
            }]
        }
        None => vec![],
    }
}

fn map_thought_chunk(
    session_id: &str,
    chunk: &agent_client_protocol::ContentChunk,
) -> Vec<AgentEvent> {
    let text = extract_text_from_content_block(&chunk.content);
    match text {
        Some(text) => vec![AgentEvent::ThoughtDelta {
            session_id: session_id.to_string(),
            delta: text,
        }],
        None => vec![],
    }
}

fn extract_text_from_content_block(block: &ContentBlock) -> Option<String> {
    match block {
        ContentBlock::Text(text_content) => Some(text_content.text.clone()),
        _ => None,
    }
}

fn map_tool_call(
    session_id: &str,
    tc: &agent_client_protocol::ToolCall,
) -> Vec<AgentEvent> {
    let tool_call = ToolCallInfo {
        tool_call_id: tc.tool_call_id.to_string(),
        title: tc.title.clone(),
        kind: Some(map_tool_kind(&tc.kind)),
        status: Some(map_tool_call_status(&tc.status)),
        content: if tc.content.is_empty() {
            None
        } else {
            Some(map_tool_call_content_array(&tc.content))
        },
        locations: if tc.locations.is_empty() {
            None
        } else {
            Some(map_locations(&tc.locations))
        },
    };
    vec![AgentEvent::ToolCallStarted {
        session_id: session_id.to_string(),
        tool_call,
    }]
}

fn map_tool_call_update(
    session_id: &str,
    tcu: &agent_client_protocol::ToolCallUpdate,
) -> Vec<AgentEvent> {
    let update = ToolCallUpdateInfo {
        tool_call_id: tcu.tool_call_id.to_string(),
        title: tcu.fields.title.clone(),
        status: tcu.fields.status.as_ref().map(map_tool_call_status),
        content: tcu
            .fields
            .content
            .as_ref()
            .map(|c| map_tool_call_content_array(c)),
        locations: tcu.fields.locations.as_ref().map(|l| map_locations(l)),
    };
    vec![AgentEvent::ToolCallUpdated {
        session_id: session_id.to_string(),
        tool_call_id: tcu.tool_call_id.to_string(),
        update,
    }]
}

fn map_tool_kind(kind: &agent_client_protocol::ToolKind) -> ToolKind {
    match kind {
        agent_client_protocol::ToolKind::Read => ToolKind::Read,
        agent_client_protocol::ToolKind::Edit => ToolKind::Edit,
        agent_client_protocol::ToolKind::Delete => ToolKind::Delete,
        agent_client_protocol::ToolKind::Move => ToolKind::Move,
        agent_client_protocol::ToolKind::Search => ToolKind::Search,
        agent_client_protocol::ToolKind::Execute => ToolKind::Execute,
        agent_client_protocol::ToolKind::Think => ToolKind::Think,
        agent_client_protocol::ToolKind::Fetch => ToolKind::Fetch,
        agent_client_protocol::ToolKind::SwitchMode => ToolKind::SwitchMode,
        _ => ToolKind::Other,
    }
}

fn map_tool_call_status(status: &agent_client_protocol::ToolCallStatus) -> ToolCallStatus {
    match status {
        agent_client_protocol::ToolCallStatus::Pending => ToolCallStatus::Pending,
        agent_client_protocol::ToolCallStatus::InProgress => ToolCallStatus::InProgress,
        agent_client_protocol::ToolCallStatus::Completed => ToolCallStatus::Completed,
        agent_client_protocol::ToolCallStatus::Failed => ToolCallStatus::Failed,
        _ => ToolCallStatus::Pending,
    }
}

fn map_tool_call_content_array(items: &[ToolCallContent]) -> Vec<ToolCallContentItem> {
    items
        .iter()
        .filter_map(map_tool_call_content_item)
        .collect()
}

fn map_tool_call_content_item(item: &ToolCallContent) -> Option<ToolCallContentItem> {
    match item {
        ToolCallContent::Content(content) => {
            let text = extract_text_from_content_block(&content.content)?;
            Some(ToolCallContentItem::Text { text })
        }
        ToolCallContent::Diff(diff) => Some(ToolCallContentItem::Diff {
            path: diff.path.to_string_lossy().to_string(),
            old_text: diff.old_text.clone(),
            new_text: diff.new_text.clone(),
        }),
        ToolCallContent::Terminal(terminal) => Some(ToolCallContentItem::Terminal {
            terminal_id: terminal.terminal_id.to_string(),
        }),
        _ => None,
    }
}

fn map_locations(locs: &[agent_client_protocol::ToolCallLocation]) -> Vec<ToolCallLocation> {
    locs.iter()
        .map(|l| ToolCallLocation {
            path: l.path.to_string_lossy().to_string(),
            line: l.line.map(|n| n as u32),
        })
        .collect()
}

fn map_plan(
    session_id: &str,
    plan: &agent_client_protocol::Plan,
) -> Vec<AgentEvent> {
    let entries: Vec<PlanEntry> = plan
        .entries
        .iter()
        .map(|e| PlanEntry {
            content: e.content.clone(),
            priority: map_plan_priority(&e.priority),
            status: map_plan_status(&e.status),
        })
        .collect();
    vec![AgentEvent::Plan {
        session_id: session_id.to_string(),
        entries,
    }]
}

fn map_plan_priority(p: &agent_client_protocol::PlanEntryPriority) -> PlanEntryPriority {
    match p {
        agent_client_protocol::PlanEntryPriority::High => PlanEntryPriority::High,
        agent_client_protocol::PlanEntryPriority::Medium => PlanEntryPriority::Medium,
        agent_client_protocol::PlanEntryPriority::Low => PlanEntryPriority::Low,
        _ => PlanEntryPriority::Medium,
    }
}

fn map_plan_status(s: &agent_client_protocol::PlanEntryStatus) -> PlanEntryStatus {
    match s {
        agent_client_protocol::PlanEntryStatus::Pending => PlanEntryStatus::Pending,
        agent_client_protocol::PlanEntryStatus::InProgress => PlanEntryStatus::InProgress,
        agent_client_protocol::PlanEntryStatus::Completed => PlanEntryStatus::Completed,
        _ => PlanEntryStatus::Pending,
    }
}

fn map_commands_update(
    session_id: &str,
    upd: &agent_client_protocol::AvailableCommandsUpdate,
) -> Vec<AgentEvent> {
    let commands: Vec<CommandInfo> = upd
        .available_commands
        .iter()
        .map(|c| CommandInfo {
            name: c.name.clone(),
            description: c.description.clone(),
            input_hint: c.input.as_ref().map(|_| "unstructured".to_string()),
        })
        .collect();
    vec![AgentEvent::CommandsChanged {
        session_id: session_id.to_string(),
        commands,
    }]
}

fn map_mode_update(
    session_id: &str,
    upd: &agent_client_protocol::CurrentModeUpdate,
) -> Vec<AgentEvent> {
    vec![AgentEvent::ModeChanged {
        session_id: session_id.to_string(),
        mode_id: upd.current_mode_id.to_string(),
    }]
}

fn map_session_info_update(
    session_id: &str,
    upd: &agent_client_protocol::SessionInfoUpdate,
) -> Vec<AgentEvent> {
    vec![AgentEvent::SessionInfoUpdate {
        session_id: session_id.to_string(),
        title: upd.title.value().cloned(),
    }]
}

/// Map ACP SDK's StopReason to our StopReason.
pub fn map_stop_reason(reason: &agent_client_protocol::StopReason) -> StopReason {
    match reason {
        agent_client_protocol::StopReason::EndTurn => StopReason::EndTurn,
        agent_client_protocol::StopReason::MaxTokens => StopReason::MaxTokens,
        agent_client_protocol::StopReason::Refusal => StopReason::Refusal,
        _ => StopReason::EndTurn,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use agent_client_protocol::{
        ConfigOptionUpdate, ContentBlock, ContentChunk,
        CurrentModeUpdate as AcpModeUpdate, Plan as AcpPlan, PlanEntry as AcpPlanEntry,
        SessionInfoUpdate as AcpSessionInfoUpdate, SessionUpdate, TextContent,
        ToolCall as AcpToolCall, ToolCallUpdate as AcpToolCallUpdate,
        ToolCallUpdateFields,
    };

    fn text_block(text: &str) -> ContentBlock {
        ContentBlock::Text(TextContent::new(text.to_string()))
    }

    fn text_chunk(text: &str) -> ContentChunk {
        ContentChunk::new(text_block(text))
    }

    #[test]
    fn agent_message_chunk_maps_to_message_delta() {
        let update = SessionUpdate::AgentMessageChunk(text_chunk("hello"));
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::MessageDelta {
                session_id, delta, ..
            } => {
                assert_eq!(session_id, "sess-1");
                assert_eq!(delta, "hello");
            }
            _ => panic!("Expected MessageDelta"),
        }
    }

    #[test]
    fn user_message_chunk_maps_to_message_delta() {
        let update = SessionUpdate::UserMessageChunk(text_chunk("user input"));
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::MessageDelta { delta, .. } => assert_eq!(delta, "user input"),
            _ => panic!("Expected MessageDelta"),
        }
    }

    #[test]
    fn agent_thought_chunk_maps_to_thought_delta() {
        let update = SessionUpdate::AgentThoughtChunk(text_chunk("thinking..."));
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::ThoughtDelta { delta, .. } => assert_eq!(delta, "thinking..."),
            _ => panic!("Expected ThoughtDelta"),
        }
    }

    #[test]
    fn image_content_chunk_is_ignored() {
        let chunk = ContentChunk::new(ContentBlock::Image(
            agent_client_protocol::ImageContent::new(
                "base64".to_string(),
                "image/png".to_string(),
            ),
        ));
        let update = SessionUpdate::AgentMessageChunk(chunk);
        let events = map_session_update("sess-1", &update);
        assert!(events.is_empty());
    }

    #[test]
    fn tool_call_maps_to_tool_call_started() {
        let tc = AcpToolCall::new("tc-1".to_string(), "Read file".to_string())
            .kind(agent_client_protocol::ToolKind::Read)
            .status(agent_client_protocol::ToolCallStatus::InProgress);
        let update = SessionUpdate::ToolCall(tc);
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::ToolCallStarted { tool_call, .. } => {
                assert_eq!(tool_call.tool_call_id, "tc-1");
                assert_eq!(tool_call.title, "Read file");
                assert_eq!(tool_call.kind, Some(ToolKind::Read));
                assert_eq!(tool_call.status, Some(ToolCallStatus::InProgress));
            }
            _ => panic!("Expected ToolCallStarted"),
        }
    }

    #[test]
    fn tool_call_update_maps_correctly() {
        let tcu = AcpToolCallUpdate::new(
            "tc-1".to_string(),
            ToolCallUpdateFields::new(),
        );
        let update = SessionUpdate::ToolCallUpdate(tcu);
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::ToolCallUpdated {
                tool_call_id,
                update: upd,
                ..
            } => {
                assert_eq!(tool_call_id, "tc-1");
                assert_eq!(upd.tool_call_id, "tc-1");
            }
            _ => panic!("Expected ToolCallUpdated"),
        }
    }

    #[test]
    fn plan_maps_correctly() {
        let plan = AcpPlan::new(vec![AcpPlanEntry::new(
            "Step 1".to_string(),
            agent_client_protocol::PlanEntryPriority::High,
            agent_client_protocol::PlanEntryStatus::Pending,
        )]);
        let update = SessionUpdate::Plan(plan);
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::Plan { entries, .. } => {
                assert_eq!(entries.len(), 1);
                assert_eq!(entries[0].content, "Step 1");
                assert_eq!(entries[0].priority, PlanEntryPriority::High);
                assert_eq!(entries[0].status, PlanEntryStatus::Pending);
            }
            _ => panic!("Expected Plan"),
        }
    }

    #[test]
    fn mode_update_maps_correctly() {
        let upd = AcpModeUpdate::new("code".to_string());
        let update = SessionUpdate::CurrentModeUpdate(upd);
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::ModeChanged { mode_id, .. } => assert_eq!(mode_id, "code"),
            _ => panic!("Expected ModeChanged"),
        }
    }

    #[test]
    fn session_info_update_with_title() {
        let upd = AcpSessionInfoUpdate::new().title(Some("My session".to_string()));
        let update = SessionUpdate::SessionInfoUpdate(upd);
        let events = map_session_update("sess-1", &update);
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::SessionInfoUpdate { title, .. } => {
                assert_eq!(title.as_deref(), Some("My session"));
            }
            _ => panic!("Expected SessionInfoUpdate"),
        }
    }

    #[test]
    fn config_option_update_is_ignored() {
        let upd = ConfigOptionUpdate::new(vec![]);
        let update = SessionUpdate::ConfigOptionUpdate(upd);
        let events = map_session_update("sess-1", &update);
        assert!(events.is_empty());
    }
}
