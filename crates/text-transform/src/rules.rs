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

/// Static mapping table - Secretary Dictation Mode (1950s style)
/// Task 3393b914: Tier 1 static transformations
pub static STATIC_MAPPINGS: Lazy<HashMap<&'static str, TransformRule>> = Lazy::new(|| {
    let mut map = HashMap::with_capacity(80);

    // ========================================
    // A. BASIC PUNCTUATION (attach_to_prev: true)
    // ========================================
    map.insert("comma", TransformRule::new(",", true));
    map.insert("period", TransformRule::new(".", true));
    map.insert("full stop", TransformRule::new(".", true));
    map.insert("question mark", TransformRule::new("?", true));
    map.insert("exclamation point", TransformRule::new("!", true));
    map.insert("exclamation mark", TransformRule::new("!", true));
    map.insert("colon", TransformRule::new(":", true));
    map.insert("semicolon", TransformRule::new(";", true));
    map.insert("dash", TransformRule::new("-", true));
    map.insert("hyphen", TransformRule::new("-", true));
    map.insert("ellipsis", TransformRule::new("...", true));
    map.insert("three dots", TransformRule::new("...", true));

    // ========================================
    // B. PARENTHESES & BRACKETS
    // ========================================
    // Parentheses (singular and plural forms)
    map.insert("open paren", TransformRule::opening("("));
    map.insert("open parenthesis", TransformRule::opening("("));
    map.insert("open parentheses", TransformRule::opening("("));
    map.insert("close paren", TransformRule::new(")", true));
    map.insert("close parenthesis", TransformRule::new(")", true));
    map.insert("close parentheses", TransformRule::new(")", true));

    // Square brackets
    map.insert("open bracket", TransformRule::opening("["));
    map.insert("close bracket", TransformRule::new("]", true));

    // Curly braces
    map.insert("open brace", TransformRule::opening("{"));
    map.insert("close brace", TransformRule::new("}", true));

    // ========================================
    // C. QUOTES (stateful toggle with is_opening)
    // ========================================
    // Double quotes (toggles open/close via QuoteState)
    map.insert("quote", TransformRule::opening("\""));
    map.insert("open quote", TransformRule::opening("\""));
    map.insert("close quote", TransformRule::opening("\"")); // Uses same rule, state toggles

    // Single quotes (toggles open/close via QuoteState)
    map.insert("single quote", TransformRule::opening("'"));

    // Apostrophe for contractions (attach_to_prev)
    map.insert("apostrophe", TransformRule::new("'", true));

    // ========================================
    // D. SPECIAL SYMBOLS
    // ========================================
    map.insert("dollar sign", TransformRule::new("$", false));
    map.insert("percent sign", TransformRule::new("%", false));
    map.insert("percent", TransformRule::new("%", false));
    map.insert("at sign", TransformRule::new("@", false));
    map.insert("ampersand", TransformRule::new("&", false));
    map.insert("asterisk", TransformRule::new("*", false));
    map.insert("hash", TransformRule::new("#", false));
    map.insert("hashtag", TransformRule::new("#", false));
    map.insert("pound", TransformRule::new("#", false));
    map.insert("forward slash", TransformRule::new("/", false));
    map.insert("slash", TransformRule::new("/", false));
    map.insert("backslash", TransformRule::new("\\", false));

    // Math symbols (secretaries use these for lists/math)
    map.insert("plus", TransformRule::new("+", false));
    map.insert("equals", TransformRule::new("=", false));
    map.insert("equal sign", TransformRule::new("=", false));
    map.insert("times", TransformRule::new("×", false));
    map.insert("multiply", TransformRule::new("×", false));

    // ========================================
    // E. FORMATTING COMMANDS
    // ========================================
    map.insert("new line", TransformRule::new("\n", true));
    map.insert("new paragraph", TransformRule::new("\n\n", true));
    map.insert("tab", TransformRule::new("\t", true));

    // ========================================
    // F. ABBREVIATION MARKERS (processed specially)
    // ========================================
    // These are markers that will be post-processed with capitalization
    // The abbreviation logic will be in lib.rs transform()

    // Full forms
    map.insert("mister", TransformRule::new("Mr.", false));
    map.insert("missus", TransformRule::new("Mrs.", false));
    map.insert("doctor", TransformRule::new("Dr.", false));
    map.insert("et cetera", TransformRule::new("etc.", false));
    map.insert("versus", TransformRule::new("vs.", false));
    map.insert("post script", TransformRule::new("P.S.", false));

    // Shortened forms (STT may transcribe these instead)
    map.insert("mr", TransformRule::new("Mr.", false));
    map.insert("mrs", TransformRule::new("Mrs.", false));
    map.insert("dr", TransformRule::new("Dr.", false));
    map.insert("ms", TransformRule::new("Ms.", false));

    // ========================================
    // G. SPECIAL COMMANDS (processed in lib.rs)
    // ========================================
    // "number [words]" - handled by number conversion logic in lib.rs
    // "caps on/off" - handled by caps mode state in lib.rs
    // "all caps [word]" - handled by caps mode state in lib.rs

    map
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mappings_secretary_mode() {
        // Verify secretary dictation mode rules are loaded (task 3393b914)
        assert!(STATIC_MAPPINGS.len() > 50, "Secretary mode should have 50+ rules");

        // Test basic punctuation
        assert!(STATIC_MAPPINGS.contains_key("comma"));
        assert!(STATIC_MAPPINGS.contains_key("period"));
        assert!(STATIC_MAPPINGS.contains_key("question mark"));

        // Test brackets
        assert!(STATIC_MAPPINGS.contains_key("open parenthesis"));
        assert!(STATIC_MAPPINGS.contains_key("close parenthesis"));

        // Test abbreviations
        assert!(STATIC_MAPPINGS.contains_key("mister"));
        assert!(STATIC_MAPPINGS.contains_key("doctor"));
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
