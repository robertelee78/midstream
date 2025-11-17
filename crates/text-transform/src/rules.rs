//! Secretary Mode Transformation Rules v0.3.21
//! Complete rules matching docs/secretary-mode.md specifications

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

pub static STATIC_MAPPINGS: Lazy<HashMap<&'static str, TransformRule>> = Lazy::new(|| {
    let mut map = HashMap::with_capacity(100);

    // ========================================
    // A. Basic Punctuation (all attach to previous)
    // ========================================
    map.insert("comma", TransformRule::new(",", true));
    map.insert("period", TransformRule::new(".", true));
    map.insert("full stop", TransformRule::new(".", true));
    map.insert("question mark", TransformRule::new("?", true));
    map.insert("exclamation point", TransformRule::new("!", true));
    map.insert("exclamation mark", TransformRule::new("!", true));
    map.insert("colon", TransformRule::new(":", true));
    map.insert("semicolon", TransformRule::new(";", true));
    map.insert("dash", TransformRule::new("-", false));
    map.insert("hyphen", TransformRule::new("-", false));
    map.insert("ellipsis", TransformRule::new("...", true));
    map.insert("three dots", TransformRule::new("...", true));

    // ========================================
    // B. Parentheses & Brackets
    // ========================================
    map.insert("open paren", TransformRule::opening("("));
    map.insert("open parenthesis", TransformRule::opening("("));
    map.insert("open parentheses", TransformRule::opening("("));
    map.insert("close paren", TransformRule::new(")", true));
    map.insert("close parenthesis", TransformRule::new(")", true));
    map.insert("close parentheses", TransformRule::new(")", true));

    map.insert("open bracket", TransformRule::opening("["));
    map.insert("close bracket", TransformRule::new("]", true));

    map.insert("open brace", TransformRule::opening("{"));
    map.insert("close brace", TransformRule::new("}", true));

    // ========================================
    // C. Quotes (stateful toggle)
    // ========================================
    map.insert("quote", TransformRule::opening("\""));
    map.insert("open quote", TransformRule::opening("\""));
    map.insert("close quote", TransformRule::new("\"", true));
    map.insert("single quote", TransformRule::opening("'"));
    map.insert("apostrophe", TransformRule::new("'", true));

    // ========================================
    // D. Special Symbols
    // ========================================
    map.insert("dollar sign", TransformRule::new("$", false));
    map.insert("percent sign", TransformRule::new("%", true));
    map.insert("percent", TransformRule::new("%", true));
    map.insert("at sign", TransformRule::new("@", false));
    map.insert("ampersand", TransformRule::new("&", false));
    map.insert("asterisk", TransformRule::new("*", false));
    map.insert("hash", TransformRule::new("#", false));
    map.insert("hashtag", TransformRule::new("#", false));
    map.insert("pound", TransformRule::new("#", false));
    map.insert("forward slash", TransformRule::new("/", false));
    map.insert("slash", TransformRule::new("/", false));
    map.insert("backslash", TransformRule::new("\\", false));

    // ========================================
    // E. Math Symbols
    // ========================================
    map.insert("plus", TransformRule::new("+", false));
    map.insert("equals", TransformRule::new("=", false));
    map.insert("equal sign", TransformRule::new("=", false));
    map.insert("times", TransformRule::new("×", false));
    map.insert("multiply", TransformRule::new("×", false));

    // ========================================
    // F. Formatting Commands
    // ========================================
    map.insert("new line", TransformRule::new("\n", true));
    map.insert("new paragraph", TransformRule::new("\n\n", true));
    map.insert("tab", TransformRule::new("\t", false));

    // ========================================
    // G. Abbreviations/Titles
    // ========================================
    map.insert("mister", TransformRule::new("Mr.", false));
    map.insert("mr", TransformRule::new("Mr.", false));
    map.insert("missus", TransformRule::new("Mrs.", false));
    map.insert("mrs", TransformRule::new("Mrs.", false));
    map.insert("doctor", TransformRule::new("Dr.", false));
    map.insert("dr", TransformRule::new("Dr.", false));
    map.insert("ms", TransformRule::new("Ms.", false));
    map.insert("miss", TransformRule::new("Ms.", false));
    map.insert("et cetera", TransformRule::new("etc.", true));
    map.insert("versus", TransformRule::new("vs.", false));
    map.insert("post script", TransformRule::new("P.S.", false));

    // ========================================
    // H. Number Words (for "number X" pattern)
    // ========================================
    map.insert("zero", TransformRule::new("0", false));
    map.insert("one", TransformRule::new("1", false));
    map.insert("two", TransformRule::new("2", false));
    map.insert("three", TransformRule::new("3", false));
    map.insert("four", TransformRule::new("4", false));
    map.insert("five", TransformRule::new("5", false));
    map.insert("six", TransformRule::new("6", false));
    map.insert("seven", TransformRule::new("7", false));
    map.insert("eight", TransformRule::new("8", false));
    map.insert("nine", TransformRule::new("9", false));
    map.insert("ten", TransformRule::new("10", false));
    map.insert("eleven", TransformRule::new("11", false));
    map.insert("twelve", TransformRule::new("12", false));
    map.insert("thirteen", TransformRule::new("13", false));
    map.insert("fourteen", TransformRule::new("14", false));
    map.insert("fifteen", TransformRule::new("15", false));
    map.insert("sixteen", TransformRule::new("16", false));
    map.insert("seventeen", TransformRule::new("17", false));
    map.insert("eighteen", TransformRule::new("18", false));
    map.insert("nineteen", TransformRule::new("19", false));
    map.insert("twenty", TransformRule::new("20", false));
    map.insert("thirty", TransformRule::new("30", false));
    map.insert("forty", TransformRule::new("40", false));
    map.insert("fifty", TransformRule::new("50", false));
    map.insert("sixty", TransformRule::new("60", false));
    map.insert("seventy", TransformRule::new("70", false));
    map.insert("eighty", TransformRule::new("80", false));
    map.insert("ninety", TransformRule::new("90", false));
    map.insert("hundred", TransformRule::new("100", false));

    map
});