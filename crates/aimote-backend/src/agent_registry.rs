use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Default, Clone)]
pub struct AgentRegistry {
    agents: HashMap<String, AgentConfig>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_defaults(defaults: Vec<AgentConfig>) -> Self {
        let mut registry = Self::new();
        for config in defaults {
            registry.register(config);
        }
        registry
    }

    pub fn get(&self, name: &str) -> Option<&AgentConfig> {
        self.agents.get(name)
    }

    pub fn list(&self) -> Vec<&AgentConfig> {
        self.agents.values().collect()
    }

    pub fn register(&mut self, config: AgentConfig) {
        self.agents.insert(config.name.clone(), config);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_registry_returns_none() {
        let registry = AgentRegistry::new();
        assert!(registry.get("foo").is_none());
        assert!(registry.list().is_empty());
    }

    #[test]
    fn register_and_get() {
        let mut registry = AgentRegistry::new();
        registry.register(AgentConfig {
            name: "claude".into(),
            command: "claude".into(),
            args: vec!["--chat".into()],
            env: None,
        });
        let config = registry.get("claude").unwrap();
        assert_eq!(config.command, "claude");
        assert_eq!(config.args, vec!["--chat"]);
    }

    #[test]
    fn with_defaults() {
        let registry = AgentRegistry::with_defaults(vec![
            AgentConfig {
                name: "a".into(),
                command: "a".into(),
                args: vec![],
                env: None,
            },
            AgentConfig {
                name: "b".into(),
                command: "b".into(),
                args: vec![],
                env: None,
            },
        ]);
        assert_eq!(registry.list().len(), 2);
    }

    #[test]
    fn register_overwrites() {
        let mut registry = AgentRegistry::new();
        registry.register(AgentConfig {
            name: "x".into(),
            command: "old".into(),
            args: vec![],
            env: None,
        });
        registry.register(AgentConfig {
            name: "x".into(),
            command: "new".into(),
            args: vec![],
            env: None,
        });
        assert_eq!(registry.get("x").unwrap().command, "new");
    }
}
