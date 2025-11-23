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
        Self {
            replacement,
            attach_to_prev,
            is_opening: false,
            no_space_after: false,
        }
    }

    const fn opening(replacement: &'static str) -> Self {
        Self {
            replacement,
            attach_to_prev: false,
            is_opening: true,
            no_space_after: false,
        }
    }

    /// Compact: remove space before AND after (for URLs like example.com)
    const fn compact(replacement: &'static str) -> Self {
        Self {
            replacement,
            attach_to_prev: true,
            is_opening: false,
            no_space_after: true,
        }
    }

    /// No space after only (space before is normal) - for CLI flags like "-m"
    const fn no_space_after(replacement: &'static str) -> Self {
        Self {
            replacement,
            attach_to_prev: false,
            is_opening: false,
            no_space_after: true,
        }
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
    map.insert("hyphen", TransformRule::no_space_after("-"));
    map.insert("minus", TransformRule::new("-", false));
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
    map.insert("open brackets", TransformRule::opening("["));
    map.insert("close bracket", TransformRule::new("]", true));
    map.insert("close brackets", TransformRule::new("]", true));

    map.insert("open brace", TransformRule::opening("{"));
    map.insert("open braces", TransformRule::opening("{"));
    map.insert("close brace", TransformRule::new("}", true));
    map.insert("close braces", TransformRule::new("}", true));

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
    // v2: "hash" and "pound" removed - ambiguous, use "hash sign" or "pound sign"
    map.insert("hashtag", TransformRule::new("#", false)); // Keep: unambiguous social media term
    map.insert("forward slash", TransformRule::new("/", false));
    map.insert("slash", TransformRule::new("/", false));
    map.insert("backslash", TransformRule::new("\\", false));

    // ========================================
    // E. Math Symbols
    // v2: "plus" and "equals" removed - ambiguous, use "plus sign" or "equals sign"
    // ========================================
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
    // v2: Titles removed - "doctor" is ambiguous (Dr. vs the word doctor)
    // ========================================
    map.insert("et cetera", TransformRule::new("etc.", true));
    map.insert("versus", TransformRule::new("vs.", false));
    map.insert("post script", TransformRule::new("P.S.", false));

    // ========================================
    // H. Comparison & Logical Operators (v2 PRD)
    // ========================================
    map.insert("double equals", TransformRule::new("==", false));
    map.insert("triple equals", TransformRule::new("===", false));
    map.insert("not equals", TransformRule::new("!=", false));
    map.insert("bang equals", TransformRule::new("!=", false));
    map.insert("strict not equals", TransformRule::new("!==", false));
    map.insert("less than", TransformRule::new("<", false));
    map.insert("greater than", TransformRule::new(">", false));
    map.insert("left angle", TransformRule::new("<", false));
    map.insert("right angle", TransformRule::new(">", false));
    map.insert("less than or equal", TransformRule::new("<=", false));
    map.insert("greater than or equal", TransformRule::new(">=", false));
    map.insert("double ampersand", TransformRule::new("&&", false));
    map.insert("and and", TransformRule::new("&&", false));
    map.insert("double pipe", TransformRule::new("||", false));
    map.insert("or or", TransformRule::new("||", false));

    // ========================================
    // H2. Programming Symbols (v2 PRD - unambiguous)
    // ========================================
    map.insert("underscore", TransformRule::compact("_"));
    map.insert("backtick", TransformRule::opening("`"));
    map.insert("triple backtick", TransformRule::new("```", false));
    map.insert("code fence", TransformRule::new("```", false));
    map.insert("tilde", TransformRule::new("~", false));
    map.insert("caret", TransformRule::new("^", false));
    map.insert("carrot", TransformRule::new("^", false));
    map.insert("double colon", TransformRule::new("::", false));
    map.insert("angle brackets", TransformRule::new("<>", false));

    // ========================================
    // H3. Assignment Operators (v2 PRD)
    // ========================================
    map.insert("plus equals", TransformRule::new("+=", false));
    map.insert("minus equals", TransformRule::new("-=", false));
    map.insert("times equals", TransformRule::new("*=", false));
    map.insert("divide equals", TransformRule::new("/=", false));
    map.insert("increment", TransformRule::new("++", false));
    map.insert("decrement", TransformRule::new("--", false));

    // ========================================
    // H4. Spread/Optional Operators (v2 PRD)
    // ========================================
    map.insert("spread", TransformRule::new("...", false));
    map.insert("splat", TransformRule::new("...", false));
    map.insert("triple dot", TransformRule::new("...", false));
    map.insert("null coalesce", TransformRule::new("??", false));
    map.insert("optional chain", TransformRule::new("?.", false));

    // ========================================
    // I. Explicit Symbol Phrases (v2 - for ambiguous words)
    // ========================================
    map.insert("hash sign", TransformRule::new("#", false));
    map.insert("pound sign", TransformRule::new("#", false));
    map.insert("plus sign", TransformRule::new("+", false));
    map.insert("minus sign", TransformRule::new("-", false));
    map.insert("equals sign", TransformRule::new("=", false));
    map.insert("pipe sign", TransformRule::new("|", false));

    // ========================================
    // I. Directional Arrows (v2)
    // ========================================
    map.insert("right arrow", TransformRule::new("->", false));
    map.insert("left arrow", TransformRule::new("<-", false));
    map.insert("up arrow", TransformRule::new("↑", false));
    map.insert("down arrow", TransformRule::new("↓", false));
    map.insert("fat arrow", TransformRule::new("=>", false));
    map.insert("thin arrow", TransformRule::new("->", false));
    map.insert("rocket", TransformRule::new("=>", false));

    // ========================================
    // J. Number Words - REMOVED in v2
    // v2: Number words pass through unchanged. Use "number X" trigger for conversion.
    // Number words are in NUMBER_WORDS lookup table for use by explicit triggers only.
    // ========================================

    map
});

/// Number word to digit mappings for "number X" and contextual triggers (v2)
/// This is separate from STATIC_MAPPINGS so number words don't convert standalone
pub static NUMBER_WORDS: Lazy<HashMap<&'static str, i32>> = Lazy::new(|| {
    let mut map = HashMap::with_capacity(32);
    map.insert("zero", 0);
    map.insert("one", 1);
    map.insert("two", 2);
    map.insert("three", 3);
    map.insert("four", 4);
    map.insert("five", 5);
    map.insert("six", 6);
    map.insert("seven", 7);
    map.insert("eight", 8);
    map.insert("nine", 9);
    map.insert("ten", 10);
    map.insert("eleven", 11);
    map.insert("twelve", 12);
    map.insert("thirteen", 13);
    map.insert("fourteen", 14);
    map.insert("fifteen", 15);
    map.insert("sixteen", 16);
    map.insert("seventeen", 17);
    map.insert("eighteen", 18);
    map.insert("nineteen", 19);
    map.insert("twenty", 20);
    map.insert("thirty", 30);
    map.insert("forty", 40);
    map.insert("fifty", 50);
    map.insert("sixty", 60);
    map.insert("seventy", 70);
    map.insert("eighty", 80);
    map.insert("ninety", 90);
    map.insert("hundred", 100);
    // Special: "oh" as zero in patterns like "four oh four" → "404"
    map.insert("oh", 0);
    map
});

/// Contextual number triggers that keep the prefix word (v2)
/// "line forty two" → "line 42", "version two" → "version 2"
pub static CONTEXTUAL_NUMBER_TRIGGERS: Lazy<HashMap<&'static str, &'static str>> =
    Lazy::new(|| {
        let mut map = HashMap::with_capacity(8);
        map.insert("line", "line");
        map.insert("version", "version");
        map.insert("step", "step");
        map.insert("option", "option");
        map.insert("error", "error");
        map.insert("port", "port");
        map.insert("release", "release");
        map
    });
