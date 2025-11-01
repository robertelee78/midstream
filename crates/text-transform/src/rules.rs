//! Transformation rules - 55+ static mappings from task 4422a000
//!
//! Simple lookup tables mapping verbal punctuation to symbols.
//! NO regex patterns, just HashMap<&str, TransformRule>.

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

/// Static mapping table - initialized once at startup
pub static STATIC_MAPPINGS: Lazy<HashMap<&'static str, TransformRule>> = Lazy::new(|| {
    let mut map = HashMap::new();

    // ========================================
    // PUNCTUATION (attach_to_prev = true)
    // ========================================
    map.insert("comma", TransformRule::new(",", true));
    map.insert("period", TransformRule::new(".", true));
    // "dot" in contexts like "example dot com" should be "example.com" (no spaces)
    map.insert("dot", TransformRule::compact("."));
    map.insert("question mark", TransformRule::new("?", true));
    map.insert("exclamation point", TransformRule::new("!", true));
    map.insert("exclamation mark", TransformRule::new("!", true));
    map.insert("bang", TransformRule::new("!", true));
    map.insert("colon", TransformRule::new(":", true));
    map.insert("semicolon", TransformRule::new(";", true));
    map.insert("apostrophe", TransformRule::new("'", true));
    map.insert("ellipsis", TransformRule::new("...", true));

    // ========================================
    // QUOTES (context-dependent - track open/close state)
    // ========================================
    map.insert("quote", TransformRule::opening("\""));
    map.insert("double quote", TransformRule::opening("\""));
    map.insert("single quote", TransformRule::opening("'"));
    map.insert("backtick", TransformRule::opening("`")); // Toggles like quotes

    // ========================================
    // BRACKETS - Opening (attach_to_prev = false)
    // ========================================
    map.insert("open paren", TransformRule::opening("("));
    map.insert("open parenthesis", TransformRule::opening("("));
    map.insert("left paren", TransformRule::opening("("));
    map.insert("open bracket", TransformRule::opening("["));
    map.insert("left bracket", TransformRule::opening("["));
    map.insert("open brace", TransformRule::opening("{"));
    map.insert("left brace", TransformRule::opening("{"));
    map.insert("open angle bracket", TransformRule::opening("<"));
    map.insert("left angle", TransformRule::opening("<"));

    // ========================================
    // BRACKETS - Closing (attach_to_prev = true)
    // ========================================
    map.insert("close paren", TransformRule::new(")", true));
    map.insert("close parenthesis", TransformRule::new(")", true));
    map.insert("right paren", TransformRule::new(")", true));
    map.insert("close bracket", TransformRule::new("]", true));
    map.insert("right bracket", TransformRule::new("]", true));
    map.insert("close brace", TransformRule::new("}", true));
    map.insert("right brace", TransformRule::new("}", true));
    map.insert("close angle bracket", TransformRule::new(">", true));
    map.insert("right angle", TransformRule::new(">", true));

    // ========================================
    // OPERATORS (attach_to_prev = false)
    // ========================================
    map.insert("equals", TransformRule::new("=", false));
    map.insert("plus", TransformRule::new("+", false));
    map.insert("minus", TransformRule::new("-", false));
    // hyphen has space before but NOT after (for CLI flags like "-m")
    map.insert("hyphen", TransformRule::no_space_after("-"));
    map.insert("dash", TransformRule::new("-", false));
    map.insert("asterisk", TransformRule::new("*", false));
    map.insert("star", TransformRule::new("*", false));
    map.insert("slash", TransformRule::new("/", false));
    map.insert("forward slash", TransformRule::new("/", false));
    map.insert("backslash", TransformRule::new("\\", false));
    map.insert("back slash", TransformRule::new("\\", false));
    map.insert("pipe", TransformRule::new("|", false));
    map.insert("ampersand", TransformRule::new("&", false));
    map.insert("and sign", TransformRule::new("&", false));

    // ========================================
    // COMPARISON OPERATORS
    // ========================================
    map.insert("less than", TransformRule::new("<", false));
    map.insert("greater than", TransformRule::new(">", false));
    map.insert("double equals", TransformRule::new("==", false));
    map.insert("triple equals", TransformRule::new("===", false));
    map.insert("not equals", TransformRule::new("!=", false));
    // These are 4-word patterns! "less than or equal"
    map.insert("less than or equal", TransformRule::new("<=", false));
    map.insert("greater than or equal", TransformRule::new(">=", false));

    // ========================================
    // LOGICAL OPERATORS
    // ========================================
    map.insert("double ampersand", TransformRule::new("&&", false));
    map.insert("and and", TransformRule::new("&&", false));
    map.insert("double pipe", TransformRule::new("||", false));
    map.insert("or or", TransformRule::new("||", false));

    // ========================================
    // SYMBOLS (attach_to_prev = false)
    // ========================================
    map.insert("underscore", TransformRule::new("_", false));
    map.insert("at sign", TransformRule::new("@", false));
    map.insert("at", TransformRule::new("@", false));
    map.insert("hash", TransformRule::new("#", false));
    map.insert("hash hashtag", TransformRule::new("#", false)); // 2-word version (redundant but explicit)
    map.insert("hashtag", TransformRule::new("#", false)); // Single word version
    map.insert("pound", TransformRule::new("#", false));
    map.insert("dollar sign", TransformRule::new("$", false));
    map.insert("dollarsign", TransformRule::new("$", false));
    map.insert("percent", TransformRule::new("%", false));
    map.insert("percent sign", TransformRule::new("%", false));
    map.insert("tilde", TransformRule::new("~", false));
    map.insert("caret", TransformRule::new("^", false));
    map.insert("carrot", TransformRule::new("^", false)); // Common misspelling

    // ========================================
    // PROGRAMMING SYMBOLS
    // ========================================
    map.insert("arrow", TransformRule::new("=>", false));
    map.insert("fat arrow", TransformRule::new("=>", false));
    map.insert("thin arrow", TransformRule::new("->", false));
    map.insert("right arrow", TransformRule::new("->", false));
    map.insert("double colon", TransformRule::new("::", false));
    map.insert("triple dot", TransformRule::new("...", false));
    map.insert("spread", TransformRule::new("...", false));

    // ========================================
    // SPECIAL CHARACTERS
    // ========================================
    map.insert("newline", TransformRule::new("\n", false));
    map.insert("tab", TransformRule::new("\t", false));
    map.insert("space", TransformRule::new(" ", false));

    // ========================================
    // WHITESPACE CONTROL
    // ========================================
    map.insert("no space", TransformRule::new("", false));

    map
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mapping_count() {
        // Should have 55+ mappings
        assert!(STATIC_MAPPINGS.len() >= 55,
            "Expected at least 55 mappings, got {}", STATIC_MAPPINGS.len());
    }

    #[test]
    fn test_punctuation_attach_to_prev() {
        assert!(STATIC_MAPPINGS.get("comma").unwrap().attach_to_prev);
        assert!(STATIC_MAPPINGS.get("period").unwrap().attach_to_prev);
        assert!(STATIC_MAPPINGS.get("question mark").unwrap().attach_to_prev);
    }

    #[test]
    fn test_operators_spacing() {
        assert!(!STATIC_MAPPINGS.get("equals").unwrap().attach_to_prev);
        assert!(!STATIC_MAPPINGS.get("plus").unwrap().attach_to_prev);
    }

    #[test]
    fn test_all_mappings_accessible() {
        // Verify no panics when accessing mappings
        for (key, rule) in STATIC_MAPPINGS.iter() {
            assert!(!key.is_empty(), "Key should not be empty");
            assert!(!rule.replacement.is_empty() || *key == "no space",
                "Replacement should not be empty except for 'no space'");
        }
    }
}
