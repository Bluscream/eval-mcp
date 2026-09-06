//! What this server is allowed to run.

use mcp_toolkit::{ToolFailure, ToolResult};

#[derive(Debug, Clone, Default)]
pub struct Policy {
    allow_execution: bool,
    /// Languages the operator restricted this server to. Empty means all.
    allowed_languages: Vec<String>,
}

impl Policy {
    pub fn new(allow_execution: bool, allowed_languages: &[String]) -> Self {
        Self {
            allow_execution,
            allowed_languages: allowed_languages.iter().map(|l| l.to_lowercase()).collect(),
        }
    }

    /// Fails unless execution was enabled.
    ///
    /// This server runs arbitrary code as the user who started it. That should
    /// be a deliberate choice, not the consequence of installing a binary.
    pub fn require_execution(&self) -> ToolResult<()> {
        if self.allow_execution {
            return Ok(());
        }
        Err(ToolFailure::Denied(
            "code execution is disabled; start this server with --allow-execution to enable it"
                .into(),
        ))
    }

    /// Fails if the operator restricted which languages may run.
    pub fn require_language(&self, language: &str) -> ToolResult<()> {
        if self.allowed_languages.is_empty()
            || self.allowed_languages.iter().any(|l| l == &language.to_lowercase())
        {
            return Ok(());
        }
        Err(ToolFailure::Denied(format!(
            "language {language:?} is not in this server's --language allowlist ({})",
            self.allowed_languages.join(", ")
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execution_is_denied_by_default() {
        let err = Policy::default().require_execution().unwrap_err();
        assert!(matches!(err, ToolFailure::Denied(_)));
        assert!(err.to_string().contains("--allow-execution"), "{err}");
    }

    #[test]
    fn execution_is_permitted_once_enabled() {
        assert!(Policy::new(true, &[]).require_execution().is_ok());
    }

    #[test]
    fn an_empty_allowlist_permits_every_language() {
        let policy = Policy::new(true, &[]);
        assert!(policy.require_language("python").is_ok());
        assert!(policy.require_language("bash").is_ok());
    }

    #[test]
    fn an_allowlist_restricts_to_its_members() {
        let policy = Policy::new(true, &["python".into(), "NODE".into()]);
        assert!(policy.require_language("python").is_ok());
        // Matching is case-insensitive in both directions.
        assert!(policy.require_language("Node").is_ok());

        let err = policy.require_language("bash").unwrap_err();
        assert!(matches!(err, ToolFailure::Denied(_)));
        assert!(err.to_string().contains("allowlist"), "{err}");
    }
}
