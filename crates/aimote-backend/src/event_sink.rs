use crate::types::AgentEvent;

/// Abstraction for emitting agent events.
///
/// - Tauri: `TauriEventSink` wraps `AppHandle::emit()`
/// - pc-relay: `WsEventSink` sends JSON over WebSocket
pub trait EventSink: Send + Sync + 'static {
    fn emit(&self, event: AgentEvent);
}

/// Collects events in a Vec for testing.
#[derive(Debug, Default)]
pub struct VecEventSink {
    events: std::sync::Mutex<Vec<AgentEvent>>,
}

impl VecEventSink {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn events(&self) -> Vec<AgentEvent> {
        self.events.lock().unwrap().clone()
    }

    pub fn clear(&self) {
        self.events.lock().unwrap().clear();
    }
}

impl EventSink for VecEventSink {
    fn emit(&self, event: AgentEvent) {
        self.events.lock().unwrap().push(event);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ConnectionStatus;

    #[test]
    fn vec_event_sink_collects_events() {
        let sink = VecEventSink::new();
        sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Connecting,
        });
        sink.emit(AgentEvent::ConnectionStatus {
            status: ConnectionStatus::Ready,
        });
        let events = sink.events();
        assert_eq!(events.len(), 2);
    }

    #[test]
    fn vec_event_sink_clear() {
        let sink = VecEventSink::new();
        sink.emit(AgentEvent::Error {
            code: "X".into(),
            message: "Y".into(),
        });
        assert_eq!(sink.events().len(), 1);
        sink.clear();
        assert_eq!(sink.events().len(), 0);
    }
}
