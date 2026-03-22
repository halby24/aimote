use std::path::PathBuf;

use aimote_backend::transport_handle::TransportHandle;

pub struct AppState {
    pub transport: TransportHandle,
    pub agents_path: PathBuf,
}
