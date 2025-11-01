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
    let mut map = HashMap::with_capacity(250); // Pre-allocate for performance (increased for numbers)

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
    // underscore is compact (no spaces) for snake_case identifiers
    map.insert("underscore", TransformRule::compact("_"));
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
    map.insert("new line", TransformRule::new("\n", false));
    map.insert("tab", TransformRule::new("\t", false));
    map.insert("space", TransformRule::new(" ", false));

    // ========================================
    // KEYBOARD ACTIONS (special markers for key presses)
    // ========================================
    map.insert("backspace", TransformRule::new("<KEY:BackSpace>", false));
    map.insert("delete", TransformRule::new("<KEY:Delete>", false));
    map.insert("enter", TransformRule::new("<KEY:Return>", false));
    map.insert("return", TransformRule::new("<KEY:Return>", false));
    map.insert("escape", TransformRule::new("<KEY:Escape>", false));
    map.insert("tab key", TransformRule::new("<KEY:Tab>", false));

    // ========================================
    // CTRL KEY COMBINATIONS (Unix/terminal control sequences)
    // ========================================
    // Line editing
    map.insert("control a", TransformRule::new("<KEY:ctrl-a>", false));  // Move to start of line
    map.insert("control e", TransformRule::new("<KEY:ctrl-e>", false));  // Move to end of line
    map.insert("control u", TransformRule::new("<KEY:ctrl-u>", false));  // Delete line before cursor
    map.insert("control k", TransformRule::new("<KEY:ctrl-k>", false));  // Delete line after cursor
    map.insert("control w", TransformRule::new("<KEY:ctrl-w>", false));  // Delete word before cursor

    // Clipboard
    map.insert("control c", TransformRule::new("<KEY:ctrl-c>", false));  // Copy / Interrupt
    map.insert("control x", TransformRule::new("<KEY:ctrl-x>", false));  // Cut
    map.insert("control v", TransformRule::new("<KEY:ctrl-v>", false));  // Paste

    // File operations
    map.insert("control s", TransformRule::new("<KEY:ctrl-s>", false));  // Save
    map.insert("control o", TransformRule::new("<KEY:ctrl-o>", false));  // Open
    map.insert("control n", TransformRule::new("<KEY:ctrl-n>", false));  // New

    // Undo/Redo
    map.insert("control z", TransformRule::new("<KEY:ctrl-z>", false));  // Undo
    map.insert("control y", TransformRule::new("<KEY:ctrl-y>", false));  // Redo

    // Search/Find
    map.insert("control f", TransformRule::new("<KEY:ctrl-f>", false));  // Find
    map.insert("control r", TransformRule::new("<KEY:ctrl-r>", false));  // Reverse search (terminal)
    map.insert("control g", TransformRule::new("<KEY:ctrl-g>", false));  // Cancel (vim/emacs)

    // Navigation
    map.insert("control p", TransformRule::new("<KEY:ctrl-p>", false));  // Previous line
    map.insert("control n", TransformRule::new("<KEY:ctrl-n>", false));  // Next line (duplicate with "new")
    map.insert("control b", TransformRule::new("<KEY:ctrl-b>", false));  // Back one character
    map.insert("control f", TransformRule::new("<KEY:ctrl-f>", false));  // Forward one character (duplicate with "find")

    // Terminal control
    map.insert("control d", TransformRule::new("<KEY:ctrl-d>", false));  // EOF / Exit
    map.insert("control l", TransformRule::new("<KEY:ctrl-l>", false));  // Clear screen
    map.insert("control t", TransformRule::new("<KEY:ctrl-t>", false));  // Transpose characters

    // ========================================
    // SUPER/MOD4 KEY COMBINATIONS (Sway/i3 window management)
    // ========================================
    // Arrow key navigation - focus windows
    map.insert("super left", TransformRule::new("<KEY:super-Left>", false));   // Focus left window
    map.insert("super right", TransformRule::new("<KEY:super-Right>", false)); // Focus right window
    map.insert("super up", TransformRule::new("<KEY:super-Up>", false));       // Focus up window
    map.insert("super down", TransformRule::new("<KEY:super-Down>", false));   // Focus down window

    // Workspace switching (1-10)
    map.insert("super one", TransformRule::new("<KEY:super-1>", false));
    map.insert("super two", TransformRule::new("<KEY:super-2>", false));
    map.insert("super three", TransformRule::new("<KEY:super-3>", false));
    map.insert("super four", TransformRule::new("<KEY:super-4>", false));
    map.insert("super five", TransformRule::new("<KEY:super-5>", false));
    map.insert("super six", TransformRule::new("<KEY:super-6>", false));
    map.insert("super seven", TransformRule::new("<KEY:super-7>", false));
    map.insert("super eight", TransformRule::new("<KEY:super-8>", false));
    map.insert("super nine", TransformRule::new("<KEY:super-9>", false));
    map.insert("super zero", TransformRule::new("<KEY:super-0>", false));

    // Move windows (Super+Shift+arrows)
    map.insert("super shift left", TransformRule::new("<KEY:super-shift-Left>", false));   // Move window left
    map.insert("super shift right", TransformRule::new("<KEY:super-shift-Right>", false)); // Move window right
    map.insert("super shift up", TransformRule::new("<KEY:super-shift-Up>", false));       // Move window up
    map.insert("super shift down", TransformRule::new("<KEY:super-shift-Down>", false));   // Move window down

    // Move to workspace (Super+Shift+number)
    map.insert("super shift one", TransformRule::new("<KEY:super-shift-1>", false));
    map.insert("super shift two", TransformRule::new("<KEY:super-shift-2>", false));
    map.insert("super shift three", TransformRule::new("<KEY:super-shift-3>", false));
    map.insert("super shift four", TransformRule::new("<KEY:super-shift-4>", false));
    map.insert("super shift five", TransformRule::new("<KEY:super-shift-5>", false));
    map.insert("super shift six", TransformRule::new("<KEY:super-shift-6>", false));
    map.insert("super shift seven", TransformRule::new("<KEY:super-shift-7>", false));
    map.insert("super shift eight", TransformRule::new("<KEY:super-shift-8>", false));
    map.insert("super shift nine", TransformRule::new("<KEY:super-shift-9>", false));
    map.insert("super shift zero", TransformRule::new("<KEY:super-shift-0>", false));

    // Layout commands
    map.insert("super h", TransformRule::new("<KEY:super-h>", false));      // Horizontal split
    map.insert("super v", TransformRule::new("<KEY:super-v>", false));      // Vertical split
    map.insert("super s", TransformRule::new("<KEY:super-s>", false));      // Stacking layout
    map.insert("super w", TransformRule::new("<KEY:super-w>", false));      // Tabbed layout
    map.insert("super e", TransformRule::new("<KEY:super-e>", false));      // Toggle split
    map.insert("super f", TransformRule::new("<KEY:super-f>", false));      // Fullscreen

    // Floating and misc
    map.insert("super shift space", TransformRule::new("<KEY:super-shift-space>", false)); // Toggle floating
    map.insert("super space", TransformRule::new("<KEY:super-space>", false));             // Focus mode toggle
    map.insert("super a", TransformRule::new("<KEY:super-a>", false));                     // Focus parent
    map.insert("super shift q", TransformRule::new("<KEY:super-shift-q>", false));         // Kill window
    map.insert("super shift c", TransformRule::new("<KEY:super-shift-c>", false));         // Reload config
    map.insert("super shift e", TransformRule::new("<KEY:super-shift-e>", false));         // Exit sway

    // ========================================
    // WHITESPACE CONTROL
    // ========================================
    map.insert("no space", TransformRule::new("", false));

    // ========================================
    // NUMBERS (0-9, 10-19, 20-90, 100-900)
    // ========================================
    // Basic digits (0-9)
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

    // Teens (10-19)
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

    // Tens (20-90)
    map.insert("twenty", TransformRule::new("20", false));
    map.insert("thirty", TransformRule::new("30", false));
    map.insert("forty", TransformRule::new("40", false));
    map.insert("fifty", TransformRule::new("50", false));
    map.insert("sixty", TransformRule::new("60", false));
    map.insert("seventy", TransformRule::new("70", false));
    map.insert("eighty", TransformRule::new("80", false));
    map.insert("ninety", TransformRule::new("90", false));

    // Compound numbers (20-99) - two-word patterns
    // Twenties (21-29)
    map.insert("twenty one", TransformRule::new("21", false));
    map.insert("twenty two", TransformRule::new("22", false));
    map.insert("twenty three", TransformRule::new("23", false));
    map.insert("twenty four", TransformRule::new("24", false));
    map.insert("twenty five", TransformRule::new("25", false));
    map.insert("twenty six", TransformRule::new("26", false));
    map.insert("twenty seven", TransformRule::new("27", false));
    map.insert("twenty eight", TransformRule::new("28", false));
    map.insert("twenty nine", TransformRule::new("29", false));

    // Thirties (31-39)
    map.insert("thirty one", TransformRule::new("31", false));
    map.insert("thirty two", TransformRule::new("32", false));
    map.insert("thirty three", TransformRule::new("33", false));
    map.insert("thirty four", TransformRule::new("34", false));
    map.insert("thirty five", TransformRule::new("35", false));
    map.insert("thirty six", TransformRule::new("36", false));
    map.insert("thirty seven", TransformRule::new("37", false));
    map.insert("thirty eight", TransformRule::new("38", false));
    map.insert("thirty nine", TransformRule::new("39", false));

    // Forties (41-49)
    map.insert("forty one", TransformRule::new("41", false));
    map.insert("forty two", TransformRule::new("42", false));
    map.insert("forty three", TransformRule::new("43", false));
    map.insert("forty four", TransformRule::new("44", false));
    map.insert("forty five", TransformRule::new("45", false));
    map.insert("forty six", TransformRule::new("46", false));
    map.insert("forty seven", TransformRule::new("47", false));
    map.insert("forty eight", TransformRule::new("48", false));
    map.insert("forty nine", TransformRule::new("49", false));

    // Fifties (51-59)
    map.insert("fifty one", TransformRule::new("51", false));
    map.insert("fifty two", TransformRule::new("52", false));
    map.insert("fifty three", TransformRule::new("53", false));
    map.insert("fifty four", TransformRule::new("54", false));
    map.insert("fifty five", TransformRule::new("55", false));
    map.insert("fifty six", TransformRule::new("56", false));
    map.insert("fifty seven", TransformRule::new("57", false));
    map.insert("fifty eight", TransformRule::new("58", false));
    map.insert("fifty nine", TransformRule::new("59", false));

    // Sixties (61-69)
    map.insert("sixty one", TransformRule::new("61", false));
    map.insert("sixty two", TransformRule::new("62", false));
    map.insert("sixty three", TransformRule::new("63", false));
    map.insert("sixty four", TransformRule::new("64", false));
    map.insert("sixty five", TransformRule::new("65", false));
    map.insert("sixty six", TransformRule::new("66", false));
    map.insert("sixty seven", TransformRule::new("67", false));
    map.insert("sixty eight", TransformRule::new("68", false));
    map.insert("sixty nine", TransformRule::new("69", false));

    // Seventies (71-79)
    map.insert("seventy one", TransformRule::new("71", false));
    map.insert("seventy two", TransformRule::new("72", false));
    map.insert("seventy three", TransformRule::new("73", false));
    map.insert("seventy four", TransformRule::new("74", false));
    map.insert("seventy five", TransformRule::new("75", false));
    map.insert("seventy six", TransformRule::new("76", false));
    map.insert("seventy seven", TransformRule::new("77", false));
    map.insert("seventy eight", TransformRule::new("78", false));
    map.insert("seventy nine", TransformRule::new("79", false));

    // Eighties (81-89)
    map.insert("eighty one", TransformRule::new("81", false));
    map.insert("eighty two", TransformRule::new("82", false));
    map.insert("eighty three", TransformRule::new("83", false));
    map.insert("eighty four", TransformRule::new("84", false));
    map.insert("eighty five", TransformRule::new("85", false));
    map.insert("eighty six", TransformRule::new("86", false));
    map.insert("eighty seven", TransformRule::new("87", false));
    map.insert("eighty eight", TransformRule::new("88", false));
    map.insert("eighty nine", TransformRule::new("89", false));

    // Nineties (91-99)
    map.insert("ninety one", TransformRule::new("91", false));
    map.insert("ninety two", TransformRule::new("92", false));
    map.insert("ninety three", TransformRule::new("93", false));
    map.insert("ninety four", TransformRule::new("94", false));
    map.insert("ninety five", TransformRule::new("95", false));
    map.insert("ninety six", TransformRule::new("96", false));
    map.insert("ninety seven", TransformRule::new("97", false));
    map.insert("ninety eight", TransformRule::new("98", false));
    map.insert("ninety nine", TransformRule::new("99", false));

    // Hundreds (100-900)
    map.insert("one hundred", TransformRule::new("100", false));
    map.insert("two hundred", TransformRule::new("200", false));
    map.insert("three hundred", TransformRule::new("300", false));
    map.insert("four hundred", TransformRule::new("400", false));
    map.insert("five hundred", TransformRule::new("500", false));
    map.insert("six hundred", TransformRule::new("600", false));
    map.insert("seven hundred", TransformRule::new("700", false));
    map.insert("eight hundred", TransformRule::new("800", false));
    map.insert("nine hundred", TransformRule::new("900", false));

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
