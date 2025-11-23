//! Hybrid transformation engine
//!
//! Coordinates three-tier transformation system:
//! 1. User overrides (highest priority)
//! 2. Fuzzy temporal matching (learned patterns)
//! 3. Static rules (v2 fallback)

use std::collections::HashMap;

use crate::v3::{FuzzyMatcher, Result, StaticRules, TransformConfig, TransformMode};

/// User override (highest priority corrections)
#[derive(Debug, Clone)]
pub struct UserOverride {
    from: String,
    to: String,
}

/// Main Text Transform v3 engine
pub struct TransformV3 {
    /// Configuration
    config: TransformConfig,

    /// Fuzzy temporal matcher (tier 2)
    fuzzy_matcher: Option<FuzzyMatcher>,

    /// Static rules engine (tier 3)
    static_rules: StaticRules,

    /// User overrides (tier 1 - highest priority)
    user_overrides: HashMap<String, String>,

    /// Statistics
    stats: TransformStats,
}

/// Transformation statistics
#[derive(Debug, Clone, Default)]
pub struct TransformStats {
    /// Total transformations attempted
    pub total_attempts: usize,

    /// Successful transformations
    pub successful: usize,

    /// Matches by tier
    pub user_override_matches: usize,
    pub fuzzy_matches: usize,
    pub static_matches: usize,

    /// Cache hits
    pub cache_hits: usize,
}

impl TransformV3 {
    /// Create a new Text Transform v3 engine
    pub fn new(config: TransformConfig) -> Result<Self> {
        config.validate()?;

        // Initialize fuzzy matcher if enabled
        let fuzzy_matcher = if config.fuzzy_enabled {
            let mut matcher = FuzzyMatcher::new(
                config.fuzzy_cache_size,
                config.max_pattern_length,
                config.fuzzy_threshold,
            );

            // Load correction patterns if path provided
            if let Some(ref path) = config.corrections_path {
                matcher.load_corrections(path)?;
            }

            Some(matcher)
        } else {
            None
        };

        // Initialize static rules
        let mut static_rules = if config.static_rules_enabled {
            StaticRules::with_defaults()
        } else {
            StaticRules::new()
        };

        // Load custom static rules if path provided
        if let Some(ref path) = config.static_rules_path {
            static_rules.load_rules_file(path)?;
        }

        Ok(Self {
            config,
            fuzzy_matcher,
            static_rules,
            user_overrides: HashMap::new(),
            stats: TransformStats::default(),
        })
    }

    /// Transform text using three-tier system
    pub fn transform(&mut self, text: &str) -> String {
        self.stats.total_attempts += 1;

        // Tier 1: User overrides (highest priority)
        if let Some(override_text) = self.check_user_overrides(text) {
            self.stats.successful += 1;
            self.stats.user_override_matches += 1;
            return override_text;
        }

        // Tier 2: Fuzzy temporal matching (learned patterns)
        if let Some(ref matcher) = self.fuzzy_matcher {
            if let Some((_, correction, _confidence)) = matcher.find_match(text) {
                self.stats.successful += 1;
                self.stats.fuzzy_matches += 1;

                // Learn this correction if enabled
                if self.config.learn_on_correction {
                    // This would save to corrections.toml in production
                    // For now, just track the stat
                }

                return correction;
            }
        }

        // Tier 3: Static rules (v2 compatibility fallback)
        if let Some(static_result) = self.static_rules.transform(text, self.config.mode) {
            self.stats.successful += 1;
            self.stats.static_matches += 1;
            return static_result;
        }

        // No transformation found - return original
        text.to_string()
    }

    /// Check user overrides (tier 1)
    fn check_user_overrides(&self, text: &str) -> Option<String> {
        // Exact match first
        if let Some(override_text) = self.user_overrides.get(text) {
            return Some(override_text.clone());
        }

        // Case-insensitive match
        let text_lower = text.to_lowercase();
        for (key, value) in &self.user_overrides {
            if key.to_lowercase() == text_lower {
                return Some(value.clone());
            }
        }

        None
    }

    /// Add a user override correction
    pub fn add_user_override(&mut self, from: String, to: String) {
        self.user_overrides.insert(from, to);
    }

    /// Learn a correction pattern (adds to fuzzy matcher)
    pub fn learn_correction(&mut self, from: String, to: String) {
        if let Some(ref mut matcher) = self.fuzzy_matcher {
            matcher.learn_pattern(from.clone(), to.clone());
        }

        // Also add as user override for immediate effect
        if self.config.learn_on_correction {
            self.add_user_override(from, to);
        }
    }

    /// Change transformation mode
    pub fn set_mode(&mut self, mode: TransformMode) {
        self.config.mode = mode;
    }

    /// Get current mode
    pub fn mode(&self) -> TransformMode {
        self.config.mode
    }

    /// Get transformation statistics
    pub fn stats(&self) -> &TransformStats {
        &self.stats
    }

    /// Reset statistics
    pub fn reset_stats(&mut self) {
        self.stats = TransformStats::default();
    }

    /// Clear all caches
    pub fn clear_caches(&mut self) {
        if let Some(ref mut matcher) = self.fuzzy_matcher {
            matcher.clear_cache();
        }
    }

    /// Get configuration
    pub fn config(&self) -> &TransformConfig {
        &self.config
    }

    /// Check if fuzzy matching is enabled
    pub fn is_fuzzy_enabled(&self) -> bool {
        self.fuzzy_matcher.is_some()
    }

    /// Get fuzzy pattern count
    pub fn fuzzy_pattern_count(&self) -> usize {
        self.fuzzy_matcher
            .as_ref()
            .map(|m| m.pattern_count())
            .unwrap_or(0)
    }

    /// Get static rule count
    pub fn static_rule_count(&self) -> usize {
        self.static_rules.rule_count()
    }

    /// Get user override count
    pub fn user_override_count(&self) -> usize {
        self.user_overrides.len()
    }

    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.stats.total_attempts == 0 {
            return 0.0;
        }
        self.stats.successful as f64 / self.stats.total_attempts as f64
    }
}

impl TransformStats {
    /// Get tier breakdown as percentages
    pub fn tier_breakdown(&self) -> (f64, f64, f64) {
        if self.successful == 0 {
            return (0.0, 0.0, 0.0);
        }

        let total = self.successful as f64;
        (
            self.user_override_matches as f64 / total,
            self.fuzzy_matches as f64 / total,
            self.static_matches as f64 / total,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_transform_v3() {
        let config = TransformConfig::default();
        let transformer = TransformV3::new(config).unwrap();

        assert!(transformer.is_fuzzy_enabled());
        assert!(transformer.static_rule_count() > 0);
    }

    #[test]
    fn test_v2_compatible_mode() {
        let config = TransformConfig::v2_compatible();
        let transformer = TransformV3::new(config).unwrap();

        assert!(!transformer.is_fuzzy_enabled());
        assert!(transformer.static_rule_count() > 0);
    }

    #[test]
    fn test_user_override_priority() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        // Add user override
        transformer.add_user_override("test".to_string(), "USER_OVERRIDE".to_string());

        // Transform should use user override (tier 1)
        let result = transformer.transform("test");
        assert_eq!(result, "USER_OVERRIDE");

        // Check stats
        assert_eq!(transformer.stats().user_override_matches, 1);
    }

    #[test]
    fn test_static_rules_fallback() {
        let config = TransformConfig::default().with_mode(TransformMode::Secretary);
        let mut transformer = TransformV3::new(config).unwrap();

        // "period" should match static rule (tier 3)
        let result = transformer.transform("period");
        assert_eq!(result, ".");

        // Check stats
        assert_eq!(transformer.stats().static_matches, 1);
    }

    #[test]
    fn test_learn_correction() {
        let config = TransformConfig::default().with_fuzzy_enabled(true);
        let mut transformer = TransformV3::new(config).unwrap();

        // Learn a correction
        transformer.learn_correction("arkon".to_string(), "archon".to_string());

        // Should now transform using learned pattern
        let result = transformer.transform("arkon");
        assert_eq!(result, "archon");
    }

    #[test]
    fn test_mode_switching() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        assert_eq!(transformer.mode(), TransformMode::Secretary);

        transformer.set_mode(TransformMode::Code);
        assert_eq!(transformer.mode(), TransformMode::Code);
    }

    #[test]
    fn test_no_transformation() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        // Unknown text should return unchanged
        let result = transformer.transform("unknown_text_xyz");
        assert_eq!(result, "unknown_text_xyz");
    }

    #[test]
    fn test_statistics() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        // Add overrides
        transformer.add_user_override("a".to_string(), "A".to_string());
        transformer.add_user_override("b".to_string(), "B".to_string());

        // Transform multiple times
        transformer.transform("a");
        transformer.transform("b");
        transformer.transform("unknown");

        let stats = transformer.stats();
        assert_eq!(stats.total_attempts, 3);
        assert_eq!(stats.successful, 2);
        assert_eq!(stats.user_override_matches, 2);
    }

    #[test]
    fn test_tier_breakdown() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        transformer.add_user_override("test".to_string(), "TEST".to_string());
        transformer.transform("test");

        let (tier1, tier2, tier3) = transformer.stats().tier_breakdown();
        assert_eq!(tier1, 1.0); // 100% from tier 1
        assert_eq!(tier2, 0.0);
        assert_eq!(tier3, 0.0);
    }

    #[test]
    fn test_success_rate() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        transformer.add_user_override("match".to_string(), "MATCH".to_string());

        transformer.transform("match");
        transformer.transform("nomatch");

        assert_eq!(transformer.success_rate(), 0.5); // 50% success rate
    }

    #[test]
    fn test_reset_stats() {
        let config = TransformConfig::default();
        let mut transformer = TransformV3::new(config).unwrap();

        transformer.add_user_override("test".to_string(), "TEST".to_string());
        transformer.transform("test");

        assert_eq!(transformer.stats().total_attempts, 1);

        transformer.reset_stats();
        assert_eq!(transformer.stats().total_attempts, 0);
    }
}
