use aimote_backend::event_sink::EventSink;
use aimote_backend::types::AgentEvent;
use tauri::{AppHandle, Emitter};

#[derive(Clone)]
pub struct TauriEventSink {
    app_handle: AppHandle,
}

impl TauriEventSink {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

impl EventSink for TauriEventSink {
    fn emit(&self, event: AgentEvent) {
        let _ = self.app_handle.emit("agent-event", &event);
    }
}
