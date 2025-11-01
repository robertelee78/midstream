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
    let mut map = HashMap::with_capacity(65); // Pre-allocate for performance

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
