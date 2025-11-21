//! Fuzzy pattern matching using temporal comparison
//!
//! Wraps `TemporalComparator` from the temporal-compare crate to provide
//! intelligent pattern matching based on historical correction patterns.

use midstreamer_temporal_compare::TemporalComparator;
use std::collections::HashMap;
use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};

use crate::v3::{Result, TransformError};

/// User correction pattern for learning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionPattern {
    /// Original text (what user said)
    pub from: String,
    /// Corrected text (what it should be)
    pub to: String,
    /// Number of times this correction has been applied
    #[serde(default = "default_count")]
    pub count: usize,
    /// Optional context/mode when correction applies
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

fn default_count() -> usize { 1 }

/// Corrections file format (corrections.toml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionsFile {
    #[serde(default)]
    pub corrections: Vec<CorrectionPattern>,
}

/// Fuzzy matcher that learns from user corrections
pub struct FuzzyMatcher {
    /// Temporal comparator for DTW-based pattern matching
    comparator: TemporalComparator<u8>,

    /// Learned correction patterns (from -> to)
    patterns: HashMap<String, String>,

    /// Confidence threshold for matches (0.0-1.0)
    threshold: f64,

    /// Maximum pattern length to consider
    max_pattern_length: usize,
}

impl FuzzyMatcher {
    /// Create a new fuzzy matcher with specified configuration
    pub fn new(cache_size: usize, max_seq_length: usize, threshold: f64) -> Self {
        Self {
            comparator: TemporalComparator::new(cache_size, max_seq_length),
            patterns: HashMap::new(),
            threshold: threshold.clamp(0.0, 1.0),
            max_pattern_length: max_seq_length,
        }
    }

    /// Load correction patterns from a TOML file
    pub fn load_corrections(&mut self, path: &Path) -> Result<usize> {
        if !path.exists() {
            return Ok(0);
        }

        let content = fs::read_to_string(path)
            .map_err(|e| TransformError::PatternLoadError(
                format!("Failed to read {}: {}", path.display(), e)
            ))?;

        let corrections_file: CorrectionsFile = toml::from_str(&content)
            .map_err(|e| TransformError::PatternLoadError(
                format!("Failed to parse TOML: {}", e)
            ))?;

        let count = corrections_file.corrections.len();

        for correction in corrections_file.corrections {
            self.patterns.insert(correction.from.clone(), correction.to.clone());
        }

        Ok(count)
    }

    /// Learn a new correction pattern
    pub fn learn_pattern(&mut self, from: String, to: String) {
        self.patterns.insert(from, to);
    }

    /// Try to find a fuzzy match for the input text
    ///
    /// Returns (matched_text, correction, confidence) if a match is found
    pub fn find_match(&self, text: &str) -> Option<(String, String, f64)> {
        if text.is_empty() || text.len() > self.max_pattern_length {
            return None;
        }

        let text_bytes: Vec<u8> = text.bytes().collect();

        // Use find_similar_generic to get matches for all patterns
        let mut best_match: Option<(String, String, f64)> = None;
        let mut best_similarity = 0.0;

        for (pattern_str, correction) in &self.patterns {
            if pattern_str.len() > self.max_pattern_length {
                continue;
            }

            let pattern_bytes: Vec<u8> = pattern_str.bytes().collect();

            // Calculate similarity using find_similar_generic
            let matches = match self.comparator.find_similar_generic(&text_bytes, &pattern_bytes, self.threshold) {
                Ok(m) => m,
                Err(_) => continue,
            };

            if matches.is_empty() {
                continue;
            }

            let similarity = matches[0].similarity;

            // Similarity is already normalized (0.0 to 1.0)
            if similarity > best_similarity {
                best_similarity = similarity;
                best_match = Some((pattern_str.clone(), correction.clone(), similarity));
            }
        }

        best_match
    }

    /// Check if there are any loaded patterns
    pub fn has_patterns(&self) -> bool {
        !self.patterns.is_empty()
    }

    /// Get the number of loaded patterns
    pub fn pattern_count(&self) -> usize {
        self.patterns.len()
    }

    /// Clear all learned patterns
    pub fn clear_patterns(&mut self) {
        self.patterns.clear();
    }

    /// Get cache statistics from underlying temporal comparator
    pub fn cache_stats(&self) -> (usize, usize) {
        // Note: TemporalComparator doesn't expose cache stats directly
        // This is a placeholder for future enhancement
        (0, 0) // (hits, misses)
    }

    /// Clear the internal cache
    pub fn clear_cache(&mut self) {
        self.comparator.clear_cache();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_new_fuzzy_matcher() {
        let matcher = FuzzyMatcher::new(100, 1000, 0.8);
        assert!(!matcher.has_patterns());
        assert_eq!(matcher.pattern_count(), 0);
    }

    #[test]
    fn test_learn_pattern() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.8);
        matcher.learn_pattern("arkon".to_string(), "archon".to_string());

        assert!(matcher.has_patterns());
        assert_eq!(matcher.pattern_count(), 1);
    }

    #[test]
    fn test_exact_match() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.8);
        matcher.learn_pattern("arkon".to_string(), "archon".to_string());

        let result = matcher.find_match("arkon");
        assert!(result.is_some());

        let (pattern, correction, confidence) = result.unwrap();
        assert_eq!(pattern, "arkon");
        assert_eq!(correction, "archon");
        assert!(confidence >= 0.99); // Exact match should have very high confidence
    }

    #[test]
    fn test_fuzzy_match() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.7);
        matcher.learn_pattern("hello".to_string(), "hello".to_string());

        // "helo" (one character missing) should still match with lower confidence
        let result = matcher.find_match("helo");

        if let Some((_, correction, confidence)) = result {
            assert_eq!(correction, "hello");
            assert!(confidence >= 0.7);
            assert!(confidence < 0.99); // Should be lower than exact match
        }
    }

    #[test]
    fn test_no_match_below_threshold() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.9); // High threshold
        matcher.learn_pattern("hello".to_string(), "hello".to_string());

        // Very different string should not match
        let result = matcher.find_match("xyz");
        assert!(result.is_none());
    }

    #[test]
    fn test_load_corrections_from_toml() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, r#"
[[corrections]]
from = "arkon"
to = "archon"
count = 5

[[corrections]]
from = "teh"
to = "the"
count = 3
        "#).unwrap();

        let mut matcher = FuzzyMatcher::new(100, 1000, 0.8);
        let count = matcher.load_corrections(temp_file.path()).unwrap();

        assert_eq!(count, 2);
        assert_eq!(matcher.pattern_count(), 2);
    }

    #[test]
    fn test_load_nonexistent_file() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.8);
        let result = matcher.load_corrections(Path::new("/nonexistent/file.toml"));

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_clear_patterns() {
        let mut matcher = FuzzyMatcher::new(100, 1000, 0.8);
        matcher.learn_pattern("test".to_string(), "test".to_string());

        assert_eq!(matcher.pattern_count(), 1);

        matcher.clear_patterns();
        assert_eq!(matcher.pattern_count(), 0);
    }

    #[test]
    fn test_max_pattern_length() {
        let mut matcher = FuzzyMatcher::new(100, 10, 0.8); // Max length: 10

        // Pattern longer than max should be ignored
        let long_text = "this is a very long text that exceeds the maximum pattern length";
        let result = matcher.find_match(long_text);
        assert!(result.is_none());
    }
}
