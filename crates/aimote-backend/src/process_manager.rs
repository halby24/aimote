use tokio::process::{Child, Command};
use tracing::info;

use crate::agent_registry::AgentConfig;

#[derive(Debug)]
pub struct SpawnResult {
    pub child: Child,
    pub stdin: tokio::process::ChildStdin,
    pub stdout: tokio::process::ChildStdout,
}

/// Spawn an agent process based on its config.
/// Returns the child process and its stdin/stdout for ACP communication.
pub fn spawn_agent(config: &AgentConfig) -> Result<SpawnResult, SpawnError> {
    let mut cmd = Command::new(&config.command);
    cmd.args(&config.args);
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    if let Some(env) = &config.env {
        for (k, v) in env {
            cmd.env(k, v);
        }
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    info!(agent = %config.name, command = %config.command, "Spawning agent process");

    let mut child = cmd.spawn().map_err(|e| SpawnError {
        agent_name: config.name.clone(),
        message: e.to_string(),
    })?;

    let stdin = child.stdin.take().ok_or_else(|| SpawnError {
        agent_name: config.name.clone(),
        message: "Failed to capture stdin".into(),
    })?;

    let stdout = child.stdout.take().ok_or_else(|| SpawnError {
        agent_name: config.name.clone(),
        message: "Failed to capture stdout".into(),
    })?;

    Ok(SpawnResult {
        child,
        stdin,
        stdout,
    })
}

#[derive(Debug, thiserror::Error)]
#[error("Failed to spawn agent \"{agent_name}\": {message}")]
pub struct SpawnError {
    pub agent_name: String,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn spawn_nonexistent_command_fails() {
        let config = AgentConfig {
            name: "nonexistent".into(),
            command: "this_command_does_not_exist_12345".into(),
            args: vec![],
            env: None,
        };
        let result = spawn_agent(&config);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.agent_name, "nonexistent");
    }

    #[tokio::test]
    async fn spawn_echo_command() {
        let config = AgentConfig {
            name: "echo-test".into(),
            command: if cfg!(windows) {
                "cmd".into()
            } else {
                "echo".into()
            },
            args: if cfg!(windows) {
                vec!["/c".into(), "echo".into(), "hello".into()]
            } else {
                vec!["hello".into()]
            },
            env: None,
        };
        let result = spawn_agent(&config);
        assert!(result.is_ok());
        let mut sr = result.unwrap();
        let status = sr.child.wait().await.unwrap();
        assert!(status.success());
    }
}
