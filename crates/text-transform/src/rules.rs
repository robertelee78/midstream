//! Transformation rules - RESET FOR SECRETARY DICTATION MODE
//!
//! IMPORTANT: Rules were reset to empty on 2025-11-09
//! Old 268-rule programming mode has been cleared.
//! New rules will be built based on actual Parakeet-TDT STT behavior.
//!
//! See task 4218691c: Document Parakeet-TDT patterns first
//! See task 3393b914: Implement secretary dictation mode (30-50 rules)

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformRule {
    pub replacement: &'static str,
    /// If true, remove space before the replacement (e.g., punctuation)
    pub attach_to_prev: bool,
    /// If true, don't add space before opening (for quotes/brackets that enclose)
    pub is_opening: bool,
    /// If true, next word attaches without space (e.g., CLI flags like -m)
    pub no_space_after: bool,
}

impl TransformRule {
    const fn new(replacement: &'static str, attach_to_prev: bool) -> Self {
        Self { replacement, attach_to_prev, is_opening: false, no_space_after: false }
    }

    const fn opening(replacement: &'static str) -> Self {
        Self { replacement, attach_to_prev: false, is_opening: true, no_space_after: false }
    }

    /// Compact: remove space before AND after (for URLs like example.com)
    const fn compact(replacement: &'static str) -> Self {
        Self { replacement, attach_to_prev: true, is_opening: false, no_space_after: true }
    }

    /// No space after only (space before is normal) - for CLI flags like "-m"
    const fn no_space_after(replacement: &'static str) -> Self {
        Self { replacement, attach_to_prev: false, is_opening: false, no_space_after: true }
    }
}

/// Static mapping table - EMPTY until we document Parakeet-TDT behavior
/// Will be rebuilt for secretary dictation mode (task 3393b914)
pub static STATIC_MAPPINGS: Lazy<HashMap<&'static str, TransformRule>> = Lazy::new(|| {
    let map = HashMap::with_capacity(50); // Start small for dictation mode

    // ========================================
    // SECRETARY DICTATION MODE - EMPTY (0 RULES)
    // ========================================
    // Rules will be added after documenting Parakeet-TDT behavior (task 4218691c)
    // Target: 30-50 basic dictation rules (punctuation, formatting)
    //
    // DO NOT add programming operators, math symbols, or CLI patterns
    // Those belong in separate modes (code/math/command-line)
    //
    // Workflow:
    // 1. Test Parakeet-TDT with voice commands → document actual output
    // 2. Design minimal rule set matching STT behavior
    // 3. Implement rules here
    // 4. Test with real voice samples
    //
    // Example rules to add later (after testing):
    // map.insert("comma", TransformRule::new(",", true));
    // map.insert("period", TransformRule::new(".", true));
    // map.insert("question mark", TransformRule::new("?", true));
    // map.insert("exclamation point", TransformRule::new("!", true));
    // map.insert("new line", TransformRule::new("\n", true));
    // map.insert("new paragraph", TransformRule::new("\n\n", true));

    map
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mappings_empty() {
        // Verify map is currently empty (waiting for Parakeet-TDT analysis)
        assert_eq!(STATIC_MAPPINGS.len(), 0, "Rules should be empty until task 4218691c completes");
    }

    #[test]
    fn test_rule_constructors() {
        // Test that rule constructors work correctly
        let attach = TransformRule::new(",", true);
        assert_eq!(attach.replacement, ",");
        assert!(attach.attach_to_prev);
        assert!(!attach.is_opening);
        assert!(!attach.no_space_after);

        let opening = TransformRule::opening("(");
        assert_eq!(opening.replacement, "(");
        assert!(!opening.attach_to_prev);
        assert!(opening.is_opening);
        assert!(!opening.no_space_after);

        let compact = TransformRule::compact(".");
        assert_eq!(compact.replacement, ".");
        assert!(compact.attach_to_prev);
        assert!(!compact.is_opening);
        assert!(compact.no_space_after);

        let no_space = TransformRule::no_space_after("-");
        assert_eq!(no_space.replacement, "-");
        assert!(!no_space.attach_to_prev);
        assert!(!no_space.is_opening);
        assert!(no_space.no_space_after);
    }
}
