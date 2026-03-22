use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::agent_registry::{AgentConfig, AgentRegistry};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentsFile {
    pub default_agent: String,
    pub agents: Vec<AgentConfig>,
}

impl Default for AgentsFile {
    fn default() -> Self {
        Self {
            default_agent: "claude".into(),
            agents: vec![AgentConfig {
                name: "claude".into(),
                command: "claude-agent-acp".into(),
                args: vec![],
                env: None,
            }],
        }
    }
}

impl AgentsFile {
    pub fn into_registry(self) -> (String, AgentRegistry) {
        let registry = AgentRegistry::with_defaults(self.agents);
        (self.default_agent, registry)
    }
}

pub fn load_agents_file(path: &Path) -> Result<AgentsFile, AgentsFileError> {
    let contents = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(AgentsFile::default());
        }
        Err(e) => return Err(AgentsFileError::Io(e)),
    };
    let file: AgentsFile = serde_json::from_str(&contents).map_err(AgentsFileError::Parse)?;
    Ok(file)
}

pub fn save_agents_file(path: &Path, file: &AgentsFile) -> Result<(), AgentsFileError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(AgentsFileError::Io)?;
    }
    let contents = serde_json::to_string_pretty(file).map_err(AgentsFileError::Parse)?;
    std::fs::write(path, contents).map_err(AgentsFileError::Io)?;
    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum AgentsFileError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Parse error: {0}")]
    Parse(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn load_missing_file_returns_default() {
        let path = Path::new("/nonexistent/agents.json");
        let result = load_agents_file(path).unwrap();
        assert_eq!(result.default_agent, "claude");
        assert_eq!(result.agents.len(), 1);
        assert_eq!(result.agents[0].command, "claude-agent-acp");
    }

    #[test]
    fn load_valid_file() {
        let mut f = NamedTempFile::new().unwrap();
        write!(
            f,
            r#"{{
                "defaultAgent": "myagent",
                "agents": [
                    {{
                        "name": "myagent",
                        "command": "my-cmd",
                        "args": ["--flag"],
                        "env": {{"KEY": "VAL"}}
                    }}
                ]
            }}"#
        )
        .unwrap();

        let result = load_agents_file(f.path()).unwrap();
        assert_eq!(result.default_agent, "myagent");
        assert_eq!(result.agents.len(), 1);
        assert_eq!(result.agents[0].command, "my-cmd");
        assert_eq!(result.agents[0].args, vec!["--flag"]);
        assert_eq!(
            result.agents[0].env.as_ref().unwrap().get("KEY").unwrap(),
            "VAL"
        );
    }

    #[test]
    fn load_invalid_json_returns_error() {
        let mut f = NamedTempFile::new().unwrap();
        write!(f, "not json").unwrap();
        let result = load_agents_file(f.path());
        assert!(result.is_err());
    }

    #[test]
    fn into_registry_works() {
        let file = AgentsFile {
            default_agent: "a".into(),
            agents: vec![
                AgentConfig {
                    name: "a".into(),
                    command: "cmd-a".into(),
                    args: vec![],
                    env: None,
                },
                AgentConfig {
                    name: "b".into(),
                    command: "cmd-b".into(),
                    args: vec![],
                    env: None,
                },
            ],
        };
        let (default, registry) = file.into_registry();
        assert_eq!(default, "a");
        assert!(registry.get("a").is_some());
        assert!(registry.get("b").is_some());
    }

    #[test]
    fn save_and_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("agents.json");
        let file = AgentsFile::default();
        save_agents_file(&path, &file).unwrap();

        let loaded = load_agents_file(&path).unwrap();
        assert_eq!(loaded.default_agent, file.default_agent);
        assert_eq!(loaded.agents.len(), file.agents.len());
    }
}
