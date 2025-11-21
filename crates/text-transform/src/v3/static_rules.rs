//! Static transformation rules (v2 compatibility layer)
//!
//! Provides proven transformation rules from v2 as a fallback
//! when fuzzy matching doesn't find a suitable match.

use std::collections::HashMap;
use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};

use crate::v3::{Result, TransformError, TransformMode};

/// Static rule definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaticRule {
    /// Input pattern to match
    pub from: String,
    /// Output replacement
    pub to: String,
    /// Optional mode restriction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// Whether this is a word boundary match (default: false)
    #[serde(default)]
    pub word_boundary: bool,
    /// Whether this is case-sensitive (default: false)
    #[serde(default)]
    pub case_sensitive: bool,
}

/// Static rules file format (rules.toml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaticRulesFile {
    #[serde(default)]
    pub rules: Vec<StaticRule>,
}

/// Static rules engine (v2 compatibility)
pub struct StaticRules {
    /// Rules organized by mode
    rules: HashMap<String, Vec<StaticRule>>,

    /// Global rules (apply to all modes)
    global_rules: Vec<StaticRule>,

    /// Case-insensitive lookup cache
    case_insensitive_map: HashMap<String, String>,
}

impl StaticRules {
    /// Create a new static rules engine
    pub fn new() -> Self {
        Self {
            rules: HashMap::new(),
            global_rules: Vec::new(),
            case_insensitive_map: HashMap::new(),
        }
    }

    /// Create with default v2 rules
    pub fn with_defaults() -> Self {
        let mut engine = Self::new();
        engine.load_default_rules();
        engine
    }

    /// Load default v2 transformation rules
    fn load_default_rules(&mut self) {
        // Punctuation rules (Secretary mode)
        let punctuation_rules = vec![
            StaticRule {
                from: "period".to_string(),
                to: ".".to_string(),
                mode: Some("Secretary".to_string()),
                word_boundary: true,
                case_sensitive: false,
            },
            StaticRule {
                from: "comma".to_string(),
                to: ",".to_string(),
                mode: Some("Secretary".to_string()),
                word_boundary: true,
                case_sensitive: false,
            },
            StaticRule {
                from: "question mark".to_string(),
                to: "?".to_string(),
                mode: Some("Secretary".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
            StaticRule {
                from: "exclamation point".to_string(),
                to: "!".to_string(),
                mode: Some("Secretary".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
            StaticRule {
                from: "new line".to_string(),
                to: "\n".to_string(),
                mode: Some("Secretary".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
        ];

        // Code mode rules
        let code_rules = vec![
            StaticRule {
                from: "equals equals".to_string(),
                to: "==".to_string(),
                mode: Some("Code".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
            StaticRule {
                from: "not equals".to_string(),
                to: "!=".to_string(),
                mode: Some("Code".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
            StaticRule {
                from: "plus equals".to_string(),
                to: "+=".to_string(),
                mode: Some("Code".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
        ];

        // Math mode rules
        let math_rules = vec![
            StaticRule {
                from: "times".to_string(),
                to: "×".to_string(),
                mode: Some("Math".to_string()),
                word_boundary: true,
                case_sensitive: false,
            },
            StaticRule {
                from: "divided by".to_string(),
                to: "÷".to_string(),
                mode: Some("Math".to_string()),
                word_boundary: false,
                case_sensitive: false,
            },
        ];

        // Load rules into engine
        for rule in punctuation_rules {
            self.add_rule(rule);
        }
        for rule in code_rules {
            self.add_rule(rule);
        }
        for rule in math_rules {
            self.add_rule(rule);
        }
    }

    /// Load rules from a TOML file
    pub fn load_rules_file(&mut self, path: &Path) -> Result<usize> {
        if !path.exists() {
            return Ok(0);
        }

        let content = fs::read_to_string(path)
            .map_err(|e| TransformError::PatternLoadError(
                format!("Failed to read {}: {}", path.display(), e)
            ))?;

        let rules_file: StaticRulesFile = toml::from_str(&content)
            .map_err(|e| TransformError::PatternLoadError(
                format!("Failed to parse TOML: {}", e)
            ))?;

        let count = rules_file.rules.len();

        for rule in rules_file.rules {
            self.add_rule(rule);
        }

        Ok(count)
    }

    /// Add a single rule to the engine
    pub fn add_rule(&mut self, rule: StaticRule) {
        // Build case-insensitive lookup if needed
        if !rule.case_sensitive {
            self.case_insensitive_map.insert(
                rule.from.to_lowercase(),
                rule.to.clone(),
            );
        }

        // Organize by mode
        if let Some(mode) = &rule.mode {
            self.rules
                .entry(mode.clone())
                .or_insert_with(Vec::new)
                .push(rule);
        } else {
            self.global_rules.push(rule);
        }
    }

    /// Apply static rules to text for a given mode
    pub fn transform(&self, text: &str, mode: TransformMode) -> Option<String> {
        let mode_str = format!("{:?}", mode);

        // Try mode-specific rules first
        if let Some(rules) = self.rules.get(&mode_str) {
            for rule in rules {
                if let Some(result) = self.apply_rule(text, rule) {
                    return Some(result);
                }
            }
        }

        // Try global rules
        for rule in &self.global_rules {
            if let Some(result) = self.apply_rule(text, rule) {
                return Some(result);
            }
        }

        None
    }

    /// Apply a single rule to text
    fn apply_rule(&self, text: &str, rule: &StaticRule) -> Option<String> {
        let text_lower = text.to_lowercase();
        let from_lower = rule.from.to_lowercase();

        // Case-sensitive exact match
        if rule.case_sensitive {
            if rule.word_boundary {
                // Word boundary match (surrounded by non-alphanumeric)
                if text == rule.from {
                    return Some(rule.to.clone());
                }
            } else {
                // Substring match
                if text.contains(&rule.from) {
                    return Some(text.replace(&rule.from, &rule.to));
                }
            }
        } else {
            // Case-insensitive match
            if rule.word_boundary {
                if text_lower == from_lower {
                    return Some(rule.to.clone());
                }
            } else {
                if text_lower.contains(&from_lower) {
                    // Replace preserving case context
                    return Some(text.replace(&rule.from, &rule.to));
                }
            }
        }

        None
    }

    /// Get all rules for a specific mode
    pub fn rules_for_mode(&self, mode: TransformMode) -> Vec<&StaticRule> {
        let mode_str = format!("{:?}", mode);
        let mut result = Vec::new();

        if let Some(rules) = self.rules.get(&mode_str) {
            result.extend(rules.iter());
        }

        result.extend(self.global_rules.iter());
        result
    }

    /// Get total rule count
    pub fn rule_count(&self) -> usize {
        let mode_count: usize = self.rules.values().map(|v| v.len()).sum();
        mode_count + self.global_rules.len()
    }
}

impl Default for StaticRules {
    fn default() -> Self {
        Self::with_defaults()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_new_static_rules() {
        let rules = StaticRules::new();
        assert_eq!(rules.rule_count(), 0);
    }

    #[test]
    fn test_with_defaults() {
        let rules = StaticRules::with_defaults();
        assert!(rules.rule_count() > 0);
    }

    #[test]
    fn test_add_rule() {
        let mut rules = StaticRules::new();
        rules.add_rule(StaticRule {
            from: "test".to_string(),
            to: "TEST".to_string(),
            mode: None,
            word_boundary: false,
            case_sensitive: false,
        });

        assert_eq!(rules.rule_count(), 1);
    }

    #[test]
    fn test_transform_punctuation() {
        let rules = StaticRules::with_defaults();
        let result = rules.transform("period", TransformMode::Secretary);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), ".");
    }

    #[test]
    fn test_transform_code_mode() {
        let rules = StaticRules::with_defaults();
        let result = rules.transform("equals equals", TransformMode::Code);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), "==");
    }

    #[test]
    fn test_transform_math_mode() {
        let rules = StaticRules::with_defaults();
        let result = rules.transform("times", TransformMode::Math);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), "×");
    }

    #[test]
    fn test_no_match() {
        let rules = StaticRules::with_defaults();
        let result = rules.transform("nonexistent", TransformMode::Secretary);

        assert!(result.is_none());
    }

    #[test]
    fn test_case_insensitive() {
        let rules = StaticRules::with_defaults();
        let result = rules.transform("PERIOD", TransformMode::Secretary);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), ".");
    }

    #[test]
    fn test_word_boundary() {
        let mut rules = StaticRules::new();
        rules.add_rule(StaticRule {
            from: "test".to_string(),
            to: "TEST".to_string(),
            mode: None,
            word_boundary: true,
            case_sensitive: false,
        });

        // Should match exact word
        let result = rules.transform("test", TransformMode::Secretary);
        assert!(result.is_some());

        // Should NOT match as substring
        let result = rules.transform("testing", TransformMode::Secretary);
        assert!(result.is_none());
    }

    #[test]
    fn test_load_rules_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, r#"
[[rules]]
from = "arkon"
to = "archon"
mode = "Secretary"
word_boundary = true
case_sensitive = false

[[rules]]
from = "teh"
to = "the"
        "#).unwrap();

        let mut rules = StaticRules::new();
        let count = rules.load_rules_file(temp_file.path()).unwrap();

        assert_eq!(count, 2);
        assert_eq!(rules.rule_count(), 2);
    }

    #[test]
    fn test_rules_for_mode() {
        let rules = StaticRules::with_defaults();
        let secretary_rules = rules.rules_for_mode(TransformMode::Secretary);

        assert!(secretary_rules.len() > 0);
        assert!(secretary_rules.iter().any(|r| r.from == "period"));
    }
}
