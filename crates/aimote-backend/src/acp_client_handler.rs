use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use agent_client_protocol::{
    Client, RequestPermissionRequest, RequestPermissionResponse, SessionNotification,
    CreateTerminalRequest, CreateTerminalResponse, TerminalExitStatus,
    TerminalOutputRequest, TerminalOutputResponse,
    WaitForTerminalExitRequest, WaitForTerminalExitResponse,
    KillTerminalRequest, KillTerminalResponse,
    ReleaseTerminalRequest, ReleaseTerminalResponse,
    ReadTextFileRequest, ReadTextFileResponse,
    WriteTextFileRequest, WriteTextFileResponse,
    Error as AcpError, Result as AcpResult,
};
use tokio::io::AsyncReadExt;

use crate::event_sink::EventSink;
use crate::permission_resolver::PermissionResolver;
use crate::session_update_mapper::map_session_update;

struct TerminalEntry {
    child: tokio::process::Child,
    output: Arc<Mutex<String>>,
    exit_result: Arc<Mutex<Option<ExitResult>>>,
}

#[derive(Clone)]
struct ExitResult {
    code: Option<i32>,
}

pub struct AcpClientHandler {
    sink: Arc<dyn EventSink>,
    permission_resolver: Arc<Mutex<PermissionResolver>>,
    terminals: Mutex<HashMap<String, TerminalEntry>>,
}

impl AcpClientHandler {
    pub fn new(
        sink: Arc<dyn EventSink>,
        permission_resolver: Arc<Mutex<PermissionResolver>>,
    ) -> Self {
        Self {
            sink,
            permission_resolver,
            terminals: Mutex::new(HashMap::new()),
        }
    }

    pub async fn release_all(&self) {
        let mut terminals = self.terminals.lock().await;
        for (_, mut entry) in terminals.drain() {
            let _ = entry.child.kill().await;
        }
    }
}

#[async_trait::async_trait(?Send)]
impl Client for AcpClientHandler {
    async fn session_notification(&self, args: SessionNotification) -> AcpResult<()> {
        let session_id = args.session_id.to_string();
        let events = map_session_update(&session_id, &args.update);
        for event in events {
            self.sink.emit(event);
        }
        Ok(())
    }

    async fn request_permission(
        &self,
        args: RequestPermissionRequest,
    ) -> AcpResult<RequestPermissionResponse> {
        let rx = {
            let mut resolver = self.permission_resolver.lock().await;
            resolver.request(&args, self.sink.as_ref())
        };
        let response = rx.await.map_err(|e| {
            AcpError::internal_error().data(format!("Permission request channel closed: {}", e))
        })?;
        Ok(response)
    }

    async fn read_text_file(&self, args: ReadTextFileRequest) -> AcpResult<ReadTextFileResponse> {
        match tokio::fs::read_to_string(&args.path).await {
            Ok(content) => Ok(ReadTextFileResponse::new(content)),
            Err(_) => Err(AcpError::resource_not_found(Some(
                args.path.to_string_lossy().to_string(),
            ))),
        }
    }

    async fn write_text_file(
        &self,
        args: WriteTextFileRequest,
    ) -> AcpResult<WriteTextFileResponse> {
        tokio::fs::write(&args.path, &args.content)
            .await
            .map_err(|e| AcpError::internal_error().data(e.to_string()))?;
        Ok(WriteTextFileResponse::new())
    }

    async fn create_terminal(
        &self,
        args: CreateTerminalRequest,
    ) -> AcpResult<CreateTerminalResponse> {
        let terminal_id = uuid::Uuid::new_v4().to_string();

        let mut cmd = tokio::process::Command::new(&args.command);
        cmd.args(&args.args);
        if let Some(ref cwd) = args.cwd {
            cmd.current_dir(cwd);
        }
        cmd.stdin(std::process::Stdio::null());
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        let mut child = cmd.spawn().map_err(|e| {
            AcpError::internal_error().data(format!("Failed to spawn terminal: {}", e))
        })?;

        let output = Arc::new(Mutex::new(String::new()));
        let exit_result = Arc::new(Mutex::new(None));

        if let Some(stdout) = child.stdout.take() {
            let output_clone = output.clone();
            tokio::spawn(async move {
                let mut reader = tokio::io::BufReader::new(stdout);
                let mut buf = [0u8; 4096];
                loop {
                    match reader.read(&mut buf).await {
                        Ok(0) => break,
                        Ok(n) => {
                            let text = String::from_utf8_lossy(&buf[..n]);
                            output_clone.lock().await.push_str(&text);
                        }
                        Err(_) => break,
                    }
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let output_clone = output.clone();
            tokio::spawn(async move {
                let mut reader = tokio::io::BufReader::new(stderr);
                let mut buf = [0u8; 4096];
                loop {
                    match reader.read(&mut buf).await {
                        Ok(0) => break,
                        Ok(n) => {
                            let text = String::from_utf8_lossy(&buf[..n]);
                            output_clone.lock().await.push_str(&text);
                        }
                        Err(_) => break,
                    }
                }
            });
        }

        let entry = TerminalEntry {
            child,
            output,
            exit_result,
        };

        self.terminals
            .lock()
            .await
            .insert(terminal_id.clone(), entry);

        Ok(CreateTerminalResponse::new(terminal_id))
    }

    async fn terminal_output(
        &self,
        args: TerminalOutputRequest,
    ) -> AcpResult<TerminalOutputResponse> {
        let tid = args.terminal_id.to_string();
        let terminals = self.terminals.lock().await;
        let entry = terminals
            .get(&tid)
            .ok_or_else(|| AcpError::resource_not_found(Some(tid.clone())))?;

        let output = entry.output.lock().await.clone();
        let exit = entry.exit_result.lock().await.clone();

        let mut response = TerminalOutputResponse::new(output, false);
        if let Some(exit_result) = exit {
            let mut exit_status = TerminalExitStatus::new();
            if let Some(code) = exit_result.code {
                exit_status = exit_status.exit_code(code as u32);
            }
            response = response.exit_status(exit_status);
        }

        Ok(response)
    }

    async fn wait_for_terminal_exit(
        &self,
        args: WaitForTerminalExitRequest,
    ) -> AcpResult<WaitForTerminalExitResponse> {
        let tid = args.terminal_id.to_string();

        // Check if already exited
        {
            let terminals = self.terminals.lock().await;
            let entry = terminals
                .get(&tid)
                .ok_or_else(|| AcpError::resource_not_found(Some(tid.clone())))?;

            let existing = entry.exit_result.lock().await;
            if let Some(ref result) = *existing {
                let mut exit_status = TerminalExitStatus::new();
                if let Some(code) = result.code {
                    exit_status = exit_status.exit_code(code as u32);
                }
                return Ok(WaitForTerminalExitResponse::new(exit_status));
            }
        }

        // Wait for child
        let exit_result_arc;
        {
            let mut terminals = self.terminals.lock().await;
            let entry = terminals
                .get_mut(&tid)
                .ok_or_else(|| AcpError::resource_not_found(Some(tid.clone())))?;

            exit_result_arc = entry.exit_result.clone();
            let status = entry.child.wait().await;
            let result = match status {
                Ok(s) => ExitResult { code: s.code() },
                Err(_) => ExitResult { code: None },
            };
            *exit_result_arc.lock().await = Some(result);
        }

        let result = exit_result_arc.lock().await;
        let mut exit_status = TerminalExitStatus::new();
        if let Some(ref r) = *result {
            if let Some(code) = r.code {
                exit_status = exit_status.exit_code(code as u32);
            }
        }
        Ok(WaitForTerminalExitResponse::new(exit_status))
    }

    async fn kill_terminal(&self, args: KillTerminalRequest) -> AcpResult<KillTerminalResponse> {
        let tid = args.terminal_id.to_string();
        let mut terminals = self.terminals.lock().await;
        let entry = terminals
            .get_mut(&tid)
            .ok_or_else(|| AcpError::resource_not_found(Some(tid)))?;

        let _ = entry.child.kill().await;
        Ok(KillTerminalResponse::new())
    }

    async fn release_terminal(
        &self,
        args: ReleaseTerminalRequest,
    ) -> AcpResult<ReleaseTerminalResponse> {
        let tid = args.terminal_id.to_string();
        let mut terminals = self.terminals.lock().await;
        if let Some(mut entry) = terminals.remove(&tid) {
            let _ = entry.child.kill().await;
        }
        Ok(ReleaseTerminalResponse::new())
    }
}
