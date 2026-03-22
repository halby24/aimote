use serde::{Deserialize, Serialize};

use crate::agent_registry::AgentConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigValidationResult {
    pub valid: bool,
    pub errors: Vec<ConfigValidationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigValidationError {
    pub code: String,
    pub message: String,
}

pub fn validate_agent_config(config: &AgentConfig) -> ConfigValidationResult {
    let mut errors = Vec::new();

    if which::which(&config.command).is_err() {
        errors.push(ConfigValidationError {
            code: "COMMAND_NOT_FOUND".into(),
            message: format!(
                "Command \"{}\" not found in PATH. Please install it or check the command path in agents.json.",
                config.command
            ),
        });
    }

    ConfigValidationResult {
        valid: errors.is_empty(),
        errors,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_config(command: &str) -> AgentConfig {
        AgentConfig {
            name: "test".into(),
            command: command.into(),
            args: vec![],
            env: None,
        }
    }

    #[test]
    fn valid_command_passes() {
        // "cargo" should exist in PATH during tests
        let result = validate_agent_config(&make_config("cargo"));
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn missing_command_returns_error() {
        let result = validate_agent_config(&make_config("definitely_not_a_real_command_xyz_123"));
        assert!(!result.valid);
        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.errors[0].code, "COMMAND_NOT_FOUND");
    }
}
