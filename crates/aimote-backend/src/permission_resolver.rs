use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::oneshot;

use agent_client_protocol::{
    RequestPermissionRequest, RequestPermissionResponse, RequestPermissionOutcome,
    SelectedPermissionOutcome,
};
use crate::event_sink::EventSink;
use crate::types::*;

pub struct PermissionResolver {
    pending: HashMap<String, oneshot::Sender<RequestPermissionResponse>>,
    counter: AtomicU64,
}

impl PermissionResolver {
    pub fn new() -> Self {
        Self {
            pending: HashMap::new(),
            counter: AtomicU64::new(0),
        }
    }

    /// Create a permission request: emits a `permissionRequested` event and
    /// returns a future that resolves when `resolve()` or `cancel_all()` is called.
    pub fn request(
        &mut self,
        params: &RequestPermissionRequest,
        sink: &dyn EventSink,
    ) -> oneshot::Receiver<RequestPermissionResponse> {
        let id = self.counter.fetch_add(1, Ordering::Relaxed) + 1;
        let request_id = format!("perm-{}", id);

        let options: Vec<PermissionOption> = params
            .options
            .iter()
            .map(|o| PermissionOption {
                option_id: o.option_id.to_string(),
                name: o.name.clone(),
                kind: map_permission_kind(&o.kind),
            })
            .collect();

        // tool_call is not Optional in ACP SDK
        let tc = &params.tool_call;
        let tool_call = Some(ToolCallUpdateInfo {
            tool_call_id: tc.tool_call_id.to_string(),
            title: tc.fields.title.clone(),
            status: tc.fields.status.as_ref().map(|s| match s {
                agent_client_protocol::ToolCallStatus::Pending => ToolCallStatus::Pending,
                agent_client_protocol::ToolCallStatus::InProgress => ToolCallStatus::InProgress,
                agent_client_protocol::ToolCallStatus::Completed => ToolCallStatus::Completed,
                agent_client_protocol::ToolCallStatus::Failed => ToolCallStatus::Failed,
                _ => ToolCallStatus::Pending,
            }),
            content: None,
            locations: None,
        });

        let (tx, rx) = oneshot::channel();
        self.pending.insert(request_id.clone(), tx);

        sink.emit(AgentEvent::PermissionRequested {
            session_id: params.session_id.to_string(),
            request_id,
            payload: PermissionPayload { tool_call, options },
        });

        rx
    }

    /// Resolve a pending permission request with a selected option.
    pub fn resolve(&mut self, request_id: &str, option_id: &str) {
        if let Some(tx) = self.pending.remove(request_id) {
            let _ = tx.send(RequestPermissionResponse::new(
                RequestPermissionOutcome::Selected(SelectedPermissionOutcome::new(
                    option_id.to_string(),
                )),
            ));
        }
    }

    /// Cancel all pending permission requests.
    pub fn cancel_all(&mut self) {
        for (_, tx) in self.pending.drain() {
            let _ = tx.send(RequestPermissionResponse::new(
                RequestPermissionOutcome::Cancelled,
            ));
        }
    }

    pub fn pending_count(&self) -> usize {
        self.pending.len()
    }
}

fn map_permission_kind(
    kind: &agent_client_protocol::PermissionOptionKind,
) -> PermissionOptionKind {
    match kind {
        agent_client_protocol::PermissionOptionKind::AllowOnce => PermissionOptionKind::AllowOnce,
        agent_client_protocol::PermissionOptionKind::AllowAlways => {
            PermissionOptionKind::AllowAlways
        }
        agent_client_protocol::PermissionOptionKind::RejectOnce => {
            PermissionOptionKind::RejectOnce
        }
        agent_client_protocol::PermissionOptionKind::RejectAlways => {
            PermissionOptionKind::RejectAlways
        }
        _ => PermissionOptionKind::RejectOnce,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event_sink::VecEventSink;
    use agent_client_protocol::ToolCallUpdateFields;

    fn make_request(session_id: &str) -> RequestPermissionRequest {
        let tool_call = agent_client_protocol::ToolCallUpdate::new(
            "tc-1".to_string(),
            ToolCallUpdateFields::new(),
        );
        RequestPermissionRequest::new(
            session_id.to_string(),
            tool_call,
            vec![agent_client_protocol::PermissionOption::new(
                "opt-1".to_string(),
                "Allow".to_string(),
                agent_client_protocol::PermissionOptionKind::AllowOnce,
            )],
        )
    }

    #[tokio::test]
    async fn request_and_resolve() {
        let sink = VecEventSink::new();
        let mut resolver = PermissionResolver::new();

        let req = make_request("sess-1");
        let rx = resolver.request(&req, &sink);

        assert_eq!(resolver.pending_count(), 1);

        let events = sink.events();
        assert_eq!(events.len(), 1);
        match &events[0] {
            AgentEvent::PermissionRequested {
                request_id,
                payload,
                ..
            } => {
                assert_eq!(request_id, "perm-1");
                assert_eq!(payload.options.len(), 1);
                assert_eq!(payload.options[0].option_id, "opt-1");
                resolver.resolve(request_id, "opt-1");
            }
            _ => panic!("Expected PermissionRequested"),
        }

        assert_eq!(resolver.pending_count(), 0);
        let response = rx.await.unwrap();
        match response.outcome {
            RequestPermissionOutcome::Selected(sel) => {
                assert_eq!(sel.option_id.to_string(), "opt-1");
            }
            _ => panic!("Expected Selected"),
        }
    }

    #[tokio::test]
    async fn cancel_all() {
        let sink = VecEventSink::new();
        let mut resolver = PermissionResolver::new();

        let req = make_request("sess-1");
        let rx1 = resolver.request(&req, &sink);
        let rx2 = resolver.request(&req, &sink);

        assert_eq!(resolver.pending_count(), 2);
        resolver.cancel_all();
        assert_eq!(resolver.pending_count(), 0);

        let r1 = rx1.await.unwrap();
        let r2 = rx2.await.unwrap();
        assert!(matches!(r1.outcome, RequestPermissionOutcome::Cancelled));
        assert!(matches!(r2.outcome, RequestPermissionOutcome::Cancelled));
    }

    #[test]
    fn resolve_unknown_id_does_nothing() {
        let mut resolver = PermissionResolver::new();
        resolver.resolve("nonexistent", "opt-1");
    }
}
