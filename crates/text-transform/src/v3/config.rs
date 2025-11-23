//! Configuration for Text Transform v3

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Transform mode for context-aware corrections
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransformMode {
    /// Secretary/dictation mode - natural language
    Secretary,
    /// Code/programming mode - technical terms
    Code,
    /// Math mode - mathematical notation
    Math,
    /// Command-line mode - shell commands
    CommandLine,
    /// Minimal mode - only high-confidence corrections
    Minimal,
}

impl Default for TransformMode {
    fn default() -> Self {
        TransformMode::Secretary
    }
}

/// Configuration for Text Transform v3
#[derive(Debug, Clone)]
pub struct TransformConfig {
    // === Fuzzy Matching Settings ===
    /// Enable fuzzy temporal matching
    pub fuzzy_enabled: bool,

    /// Confidence threshold for fuzzy matches (0.0-1.0)
    /// Higher = more strict, only exact matches
    /// Lower = more lenient, catches more variations
    /// Recommended: 0.8 (user preference: accuracy > speed)
    pub fuzzy_threshold: f64,

    /// LRU cache size for fuzzy matching performance
    pub fuzzy_cache_size: usize,

    /// Maximum pattern length to consider
    pub max_pattern_length: usize,

    // === Static Rules Settings (v2 compatibility) ===
    /// Enable static v2 rules as fallback
    pub static_rules_enabled: bool,

    /// Path to custom static rules (optional)
    pub static_rules_path: Option<PathBuf>,

    // === User Overrides (highest priority) ===
    /// Path to user corrections file (corrections.toml)
    pub corrections_path: Option<PathBuf>,

    /// Learn from corrections in real-time
    pub learn_on_correction: bool,

    // === Context & Mode ===
    /// Current transformation mode
    pub mode: TransformMode,

    // === Performance Tuning ===
    /// Maximum time in milliseconds for fuzzy matching
    /// User preference: accuracy > speed, but minimize delay
    pub max_fuzzy_time_ms: u64,
}

impl Default for TransformConfig {
    fn default() -> Self {
        Self {
            // Fuzzy matching
            fuzzy_enabled: true,
            fuzzy_threshold: 0.8, // Balance: catches variations but maintains accuracy
            fuzzy_cache_size: 1000,
            max_pattern_length: 20,

            // Static rules
            static_rules_enabled: true,
            static_rules_path: None,

            // User overrides
            corrections_path: None,
            learn_on_correction: true,

            // Context
            mode: TransformMode::Secretary,

            // Performance
            max_fuzzy_time_ms: 50, // <50ms latency increase target
        }
    }
}

impl TransformConfig {
    /// Create a new config with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a v2-compatible config (fuzzy disabled, static only)
    pub fn v2_compatible() -> Self {
        Self {
            fuzzy_enabled: false,
            static_rules_enabled: true,
            ..Default::default()
        }
    }

    /// Builder: Set fuzzy matching threshold
    pub fn with_fuzzy_threshold(mut self, threshold: f64) -> Self {
        self.fuzzy_threshold = threshold.clamp(0.0, 1.0);
        self
    }

    /// Builder: Set fuzzy matching enabled/disabled
    pub fn with_fuzzy_enabled(mut self, enabled: bool) -> Self {
        self.fuzzy_enabled = enabled;
        self
    }

    /// Builder: Set static rules enabled/disabled
    pub fn with_static_rules_enabled(mut self, enabled: bool) -> Self {
        self.static_rules_enabled = enabled;
        self
    }

    /// Builder: Set corrections file path
    pub fn with_corrections_path(mut self, path: impl Into<PathBuf>) -> Self {
        self.corrections_path = Some(path.into());
        self
    }

    /// Builder: Set transformation mode
    pub fn with_mode(mut self, mode: TransformMode) -> Self {
        self.mode = mode;
        self
    }

    /// Builder: Set cache size
    pub fn with_cache_size(mut self, size: usize) -> Self {
        self.fuzzy_cache_size = size;
        self
    }

    /// Builder: Set maximum fuzzy matching time
    pub fn with_max_fuzzy_time(mut self, ms: u64) -> Self {
        self.max_fuzzy_time_ms = ms;
        self
    }

    /// Validate configuration
    pub fn validate(&self) -> crate::v3::Result<()> {
        if self.fuzzy_threshold < 0.0 || self.fuzzy_threshold > 1.0 {
            return Err(crate::v3::TransformError::ConfigError(format!(
                "Invalid fuzzy_threshold: {} (must be 0.0-1.0)",
                self.fuzzy_threshold
            )));
        }

        if self.fuzzy_cache_size == 0 {
            return Err(crate::v3::TransformError::ConfigError(
                "fuzzy_cache_size must be > 0".to_string(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = TransformConfig::default();
        assert!(config.fuzzy_enabled);
        assert_eq!(config.fuzzy_threshold, 0.8);
        assert!(config.static_rules_enabled);
    }

    #[test]
    fn test_v2_compatible() {
        let config = TransformConfig::v2_compatible();
        assert!(!config.fuzzy_enabled);
        assert!(config.static_rules_enabled);
    }

    #[test]
    fn test_builder_pattern() {
        let config = TransformConfig::new()
            .with_fuzzy_threshold(0.9)
            .with_mode(TransformMode::Code)
            .with_cache_size(2000);

        assert_eq!(config.fuzzy_threshold, 0.9);
        assert_eq!(config.mode, TransformMode::Code);
        assert_eq!(config.fuzzy_cache_size, 2000);
    }

    #[test]
    fn test_threshold_clamping() {
        let config = TransformConfig::new().with_fuzzy_threshold(1.5);
        assert_eq!(config.fuzzy_threshold, 1.0);

        let config = TransformConfig::new().with_fuzzy_threshold(-0.5);
        assert_eq!(config.fuzzy_threshold, 0.0);
    }

    #[test]
    fn test_validation() {
        let config = TransformConfig::default();
        assert!(config.validate().is_ok());

        let mut invalid = TransformConfig::default();
        invalid.fuzzy_cache_size = 0;
        assert!(invalid.validate().is_err());
    }
}
