//! MidStream Text Transform - Tier 1 Static Transformations
//!
//! Simple lookup-table based text transformation for voice-to-text punctuation.
//! NO regex, just fast HashMap lookups with context-aware spacing.
//!
//! # Example
//! ```
//! use midstreamer_text_transform::transform;
//!
//! let result = transform("Hello comma world period");
//! assert_eq!(result, "Hello, world.");
//! ```
//!
//! # Text Transform v3 (New!)
//!
//! Evolution of v2 with intelligent fuzzy temporal matching:
//! ```no_run
//! use midstreamer_text_transform::v3::{TransformV3, TransformConfig};
//!
//! let config = TransformConfig::default();
//! let mut transformer = TransformV3::new(config).unwrap();
//!
//! // Three-tier system: User overrides → Fuzzy matching → Static rules
//! let result = transformer.transform("arkon");  // → "archon" (if learned)
//! ```

mod rules;
mod spacing;

#[cfg(feature = "pyo3")]
mod python_bindings;

// Text Transform v3: Intelligent pattern matching
pub mod v3;

pub use rules::TransformRule;
use rules::{STATIC_MAPPINGS, NUMBER_WORDS, CONTEXTUAL_NUMBER_TRIGGERS};

/// Parse number words starting at `start_idx` and return (number_string, words_consumed)
///
/// Intelligently handles various number patterns:
/// - Single: "five" → "5"
/// - Compound: "forty two" → "42"
/// - Years: "nineteen fifty" → "1950", "twenty twenty five" → "2025"
/// - Codes: "four oh four" → "404", "eighty eighty" → "8080"
/// - Decades: "nineteen fifties" → "1950s"
fn parse_number_words(words_lower: &[String], start_idx: usize) -> (String, usize) {
    if start_idx >= words_lower.len() {
        return (String::new(), 0);
    }

    // Helper: Check number type
    let is_teen = |n: i32| n >= 13 && n <= 19;
    let is_decade = |n: i32| n >= 10 && n <= 90 && n % 10 == 0;
    let is_tens = |n: i32| n >= 20 && n <= 90 && n % 10 == 0;  // 20, 30, ..., 90
    let is_ones = |n: i32| n >= 1 && n <= 9;

    // Try 3-word patterns first
    if start_idx + 2 < words_lower.len() {
        if let (Some(&first), Some(&second), Some(&third)) = (
            NUMBER_WORDS.get(words_lower[start_idx].as_str()),
            NUMBER_WORDS.get(words_lower[start_idx + 1].as_str()),
            NUMBER_WORDS.get(words_lower[start_idx + 2].as_str()),
        ) {
            // Pattern: X oh X → "404" (e.g., "four oh four")
            if second == 0 && words_lower[start_idx + 1] == "oh" {
                return (format!("{}{}{}", first, second, third), 3);
            }
            // Year: teen + tens + ones → "1999" (e.g., "nineteen ninety nine")
            if is_teen(first) && is_tens(second) && is_ones(third) {
                return (format!("{}", first * 100 + second + third), 3);
            }
            // Year: decade + decade + ones → "2025" (e.g., "twenty twenty five")
            if is_decade(first) && is_decade(second) && is_ones(third) {
                return (format!("{}", first * 100 + second + third), 3);
            }
        }
    }

    // Try 2-word patterns
    if start_idx + 1 < words_lower.len() {
        // Check for decade plural: "nineteen fifties" → "1950s"
        let second_word = &words_lower[start_idx + 1];
        if second_word.ends_with('s') {
            // Try to derive base word: "fifties" → "fifty", "eighties" → "eighty"
            let base = if second_word.ends_with("ies") && second_word.len() > 3 {
                format!("{}y", &second_word[..second_word.len()-3])
            } else {
                second_word[..second_word.len()-1].to_string()
            };

            if let (Some(&first), Some(&second)) = (
                NUMBER_WORDS.get(words_lower[start_idx].as_str()),
                NUMBER_WORDS.get(base.as_str()),
            ) {
                if is_teen(first) && is_decade(second) {
                    return (format!("{}s", first * 100 + second), 2);
                }
            }
        }

        if let (Some(&first), Some(&second)) = (
            NUMBER_WORDS.get(words_lower[start_idx].as_str()),
            NUMBER_WORDS.get(words_lower[start_idx + 1].as_str()),
        ) {
            // Year: teen + decade → "1950" (e.g., "nineteen fifty")
            if is_teen(first) && is_decade(second) {
                return (format!("{}", first * 100 + second), 2);
            }
            // Year: decade + decade → "2020" (e.g., "twenty twenty")
            if is_decade(first) && is_decade(second) {
                return (format!("{}", first * 100 + second), 2);
            }
            // Compound: tens + ones → "42" (e.g., "forty two")
            if is_tens(first) && is_ones(second) {
                return ((first + second).to_string(), 2);
            }
        }
    }

    // Single number word
    if let Some(&val) = NUMBER_WORDS.get(words_lower[start_idx].as_str()) {
        return (val.to_string(), 1);
    }

    (String::new(), 0)
}

/// Transform text by replacing verbal punctuation with actual symbols.
///
/// This uses simple O(1) lookup tables with context-aware spacing rules.
/// Multi-word patterns (e.g., "question mark") are checked before single words.
///
/// # Performance
/// - Lookup: O(1) per word via HashMap
/// - Target: <5ms for typical 10-word input
/// - No regex, no complex parsing
///
/// # Examples
/// ```
/// use midstreamer_text_transform::transform;
///
/// // Basic punctuation
/// assert_eq!(transform("Hello comma world"), "Hello, world");
/// assert_eq!(transform("Stop period"), "Stop.");
///
/// // Operators with explicit triggers (v2)
/// assert_eq!(transform("x equals sign y"), "x = y");
/// assert_eq!(transform("a plus sign b"), "a + b");
///
/// // Brackets
/// assert_eq!(transform("open paren x close paren"), "(x)");
///
/// // Programming symbols
/// assert_eq!(transform("git commit hyphen m"), "git commit -m");
/// ```
pub fn transform(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = String::with_capacity(text.len() + 20); // Pre-allocate with buffer
    let mut i = 0;
    let mut quote_state = QuoteState::default();
    let mut last_rule_no_space_after = false;
    let mut last_rule_is_opening = false;

    // Pre-lowercase all words once to avoid repeated allocations
    let words_lower: Vec<String> = words.iter().map(|w| w.to_lowercase()).collect();

    // Reusable buffer for pattern matching keys
    let mut key_buf = String::with_capacity(50);

    while i < words.len() {
        // ========================================
        // LAYER 1: Escape/Literal Detection (v2)
        // Process FIRST to override all other layers
        // ========================================
        // Patterns: "literal X", "the word X", "literally X", "say X"
        let escape_trigger = match words_lower[i].as_str() {
            "literal" | "literally" | "say" => Some(1), // single-word trigger
            "the" if i + 1 < words.len() && words_lower[i + 1] == "word" => Some(2), // "the word" trigger
            _ => None,
        };

        if let Some(trigger_len) = escape_trigger {
            let escaped_start = i + trigger_len;
            if escaped_start < words.len() {
                // Check if the next word(s) form a multi-word pattern we should escape
                // e.g., "literal open paren" → "open paren"
                let mut escaped_words = 1;

                // Try to match multi-word patterns (2, 3, 4 words) to escape them fully
                if escaped_start + 1 < words.len() {
                    key_buf.clear();
                    key_buf.push_str(&words_lower[escaped_start]);
                    key_buf.push(' ');
                    key_buf.push_str(&words_lower[escaped_start + 1]);
                    if STATIC_MAPPINGS.contains_key(key_buf.as_str()) {
                        escaped_words = 2;
                    }
                }
                if escaped_start + 2 < words.len() {
                    key_buf.clear();
                    key_buf.push_str(&words_lower[escaped_start]);
                    key_buf.push(' ');
                    key_buf.push_str(&words_lower[escaped_start + 1]);
                    key_buf.push(' ');
                    key_buf.push_str(&words_lower[escaped_start + 2]);
                    if STATIC_MAPPINGS.contains_key(key_buf.as_str()) {
                        escaped_words = 3;
                    }
                }

                // Output the escaped word(s) literally (preserve original casing)
                for j in 0..escaped_words {
                    if !result.is_empty() && !result.ends_with(' ') {
                        result.push(' ');
                    }
                    result.push_str(words[escaped_start + j]);
                }

                last_rule_no_space_after = false;
                last_rule_is_opening = false;
                i = escaped_start + escaped_words;
                continue;
            }
        }

        // ========================================
        // LAYER 2 & 3: Pattern Matching
        // ========================================
        // Check for multi-word patterns first (longest to shortest: 4, 3, 2 words)
        let mut matched = false;

        // Try 4-word pattern
        if i + 3 < words.len() {
            key_buf.clear();
            key_buf.push_str(&words_lower[i]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+1]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+2]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+3]);

            if let Some(rule) = STATIC_MAPPINGS.get(key_buf.as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 4;
                matched = true;
            }
        }

        // Try 3-word pattern
        if !matched && i + 2 < words.len() {
            key_buf.clear();
            key_buf.push_str(&words_lower[i]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+1]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+2]);

            if let Some(rule) = STATIC_MAPPINGS.get(key_buf.as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 3;
                continue;
            }
        }

        // Try 2-word pattern
        if !matched && i + 1 < words.len() {
            key_buf.clear();
            key_buf.push_str(&words_lower[i]);
            key_buf.push(' ');
            key_buf.push_str(&words_lower[i+1]);

            if let Some(rule) = STATIC_MAPPINGS.get(key_buf.as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 2;
                continue;
            }
        }

        if !matched {
            // Check for "number" or "digit" keyword trigger: "number forty two" → "42"
            // v2: Uses NUMBER_WORDS lookup (not STATIC_MAPPINGS) since number words pass through standalone
            let is_number_trigger = words_lower[i] == "number" || words_lower[i] == "digit";
            if is_number_trigger && i + 1 < words.len() {
                let (number_str, words_consumed) = parse_number_words(&words_lower, i + 1);
                if words_consumed > 0 {
                    if !result.is_empty() {
                        let last_char = result.chars().last();
                        let needs_space = match last_char {
                            Some('(') | Some('[') | Some('{') | Some('"') | Some('\'') | Some('`') => false,
                            Some(c) if c.is_whitespace() => false,
                            _ => true,
                        };
                        if needs_space {
                            result.push(' ');
                        }
                    }
                    result.push_str(&number_str);
                    last_rule_no_space_after = false;
                    last_rule_is_opening = false;
                    i += 1 + words_consumed; // "number" + number words
                    continue;
                }
            }

            // ========================================
            // Contextual Number Triggers (v2): "line X", "version X", etc.
            // These keep the prefix word: "line forty two" → "line 42"
            // ========================================
            if let Some(&prefix) = CONTEXTUAL_NUMBER_TRIGGERS.get(words_lower[i].as_str()) {
                if i + 1 < words.len() {
                    // Try to parse number words following the trigger
                    let (number_str, words_consumed) = parse_number_words(&words_lower, i + 1);
                    if words_consumed > 0 {
                        // Output: prefix + space + number
                        if !result.is_empty() && !result.ends_with(' ') {
                            result.push(' ');
                        }
                        result.push_str(prefix);
                        result.push(' ');
                        result.push_str(&number_str);
                        last_rule_no_space_after = false;
                        last_rule_is_opening = false;
                        i += 1 + words_consumed; // trigger + number words
                        continue;
                    }
                }
            }

            // v2: Compound numbers WITHOUT "number" keyword pass through unchanged
            // Use "number forty two" or contextual trigger "line forty two" for conversion

            // Single word pattern or pass-through
            if let Some(rule) = STATIC_MAPPINGS.get(words_lower[i].as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 1;
            } else {
                // Regular word - pass through
                if !result.is_empty() {
                    let last_char = result.chars().last();
                    // Add space unless last rule had no_space_after or is_opening, or last char is quote/whitespace
                    let needs_space = if last_rule_no_space_after || last_rule_is_opening {
                        false
                    } else {
                        match last_char {
                            Some('"') | Some('\'') | Some('`') => false,
                            Some(c) if c.is_whitespace() => false,
                            _ => true,
                        }
                    };

                    if needs_space {
                        result.push(' ');
                    }
                }
                result.push_str(words[i]);
                last_rule_no_space_after = false;
                last_rule_is_opening = false;
                i += 1;
            }
        }
    }

    result
}

/// Track quote state for context-aware transformation
#[derive(Default)]
struct QuoteState {
    double_quote_open: bool,
    single_quote_open: bool,
    backtick_open: bool,
}

/// Apply transformation with quote state tracking
fn apply_rule_with_state(result: &mut String, rule: &TransformRule, state: &mut QuoteState) {
    // Special handling for keyboard actions: attach without spaces
    let is_key_action = rule.replacement.starts_with("<KEY:");

    if is_key_action {
        // Keyboard actions: remove trailing space and attach directly
        // This ensures "backspace backspace" → "<KEY:BackSpace><KEY:BackSpace>" (no spaces)
        // The daemon's _inject_text_with_keys() will parse and execute each key separately
        if result.ends_with(' ') {
            result.pop();
        }
        result.push_str(rule.replacement);
        // Don't add space after - let multiple keys concatenate directly
        return;
    }

    if rule.attach_to_prev {
        // Remove trailing space if present, then attach
        // Used for punctuation like "," and "." (and "dot" in compact mode)
        if result.ends_with(' ') {
            result.pop();
        }
        result.push_str(rule.replacement);
        // no_space_after is handled by the flag, not here
    } else if rule.is_opening {
        // Quotes and brackets: distinguish between quotes (toggleable) and brackets (always opening)
        let is_quote = matches!(rule.replacement, "\"" | "'" | "`");
        let is_actually_closing = if is_quote {
            match rule.replacement {
                "\"" => {
                    let closing = state.double_quote_open;
                    state.double_quote_open = !state.double_quote_open;
                    closing
                }
                "'" => {
                    let closing = state.single_quote_open;
                    state.single_quote_open = !state.single_quote_open;
                    closing
                }
                "`" => {
                    let closing = state.backtick_open;
                    state.backtick_open = !state.backtick_open;
                    closing
                }
                _ => false,
            }
        } else {
            // Brackets like "(" "[" "{" "<" are always opening, never closing
            false
        };

        if is_actually_closing {
            // Closing quote: remove trailing space and attach
            if result.ends_with(' ') {
                result.pop();
            }
            result.push_str(rule.replacement);
        } else if is_quote {
            // Opening quote: add space before if needed
            if !result.is_empty() {
                let last_char = result.chars().last();
                let needs_space = match last_char {
                    Some(c) if c.is_whitespace() => false,
                    _ => true,
                };

                if needs_space {
                    result.push(' ');
                }
            }
            result.push_str(rule.replacement);
        } else {
            // Opening bracket: different behavior for brackets vs parens
            // - "[" "{" "<" attach directly ONLY if not after an operator (for "arr[i]", "generic<T>")
            // - Keep space after operators: "x = [1, 2, 3]" not "x =[1, 2, 3]"
            // - "(" has space before (for "value (x + y)")
            let should_attach = matches!(rule.replacement, "[" | "{" | "<");

            if should_attach {
                // Check if last character is an operator that needs space after it
                let last_char = result.chars().last();
                let after_operator = matches!(last_char, Some('=') | Some('<') | Some('>') | Some('+') | Some('-') | Some('*') | Some('/') | Some('&') | Some('|') | Some('!') | Some('%') | Some('^'));

                if after_operator {
                    // Add space after operator before bracket: "x = [" not "x =["
                    result.push(' ');
                } else if result.ends_with(' ') {
                    // Remove trailing space for brackets in other contexts: "arr[i]" not "arr [i]"
                    result.pop();
                }

                result.push_str(rule.replacement);
            } else {
                // Opening paren: context-dependent spacing
                // - "hello_world()" - no space (function call/definition)
                // - "value (x + y)" - space (clarifying parentheses)
                if !result.is_empty() {
                    let last_char = result.chars().last();
                    let needs_space = match last_char {
                        Some(c) if c.is_whitespace() => false,
                        // No space after identifier characters (for function calls)
                        Some(c) if c.is_alphanumeric() || c == '_' => false,
                        // Space after other characters (operators, punctuation)
                        _ => true,
                    };

                    if needs_space {
                        result.push(' ');
                    }
                }
                result.push_str(rule.replacement);
            }
        }
    } else {
        // For operators and symbols (including numbers), add space before if result isn't empty
        // and doesn't end with special characters
        if !result.is_empty() {
            let last_char = result.chars().last();
            // Don't add space after opening brackets/quotes
            // But DO add space after operators like < > = + - etc
            let needs_space = match last_char {
                Some('(') | Some('[') | Some('{') | Some('"') | Some('\'') | Some('`') => false,
                Some(c) if c.is_whitespace() => false,
                _ => true,  // This includes operators like < > = + - * /
            };

            if needs_space {
                result.push(' ');
            }
        }
        result.push_str(rule.replacement);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================
    // Layer 1: Escape/Literal Detection Tests (v2)
    // ========================================
    #[test]
    fn test_escape_literal() {
        assert_eq!(transform("literal comma"), "comma");
        assert_eq!(transform("literal period"), "period");
        assert_eq!(transform("literal hash"), "hash");
    }

    #[test]
    fn test_escape_the_word() {
        assert_eq!(transform("the word period"), "period");
        assert_eq!(transform("the word comma"), "comma");
    }

    #[test]
    fn test_escape_literally() {
        assert_eq!(transform("literally one"), "one");
        assert_eq!(transform("literally two"), "two");
    }

    #[test]
    fn test_escape_say() {
        assert_eq!(transform("say hash"), "hash");
        assert_eq!(transform("say plus"), "plus");
    }

    #[test]
    fn test_escape_multi_word_pattern() {
        // "open paren" is a 2-word pattern - escape should output both words
        assert_eq!(transform("literal open paren"), "open paren");
        assert_eq!(transform("literal question mark"), "question mark");
    }

    #[test]
    fn test_escape_in_sentence() {
        assert_eq!(transform("hello literal comma world"), "hello comma world");
        assert_eq!(transform("in this literal period we saw growth"), "in this period we saw growth");
    }

    #[test]
    fn test_escape_preserves_casing() {
        assert_eq!(transform("literal Comma"), "Comma");
        assert_eq!(transform("literal PERIOD"), "PERIOD");
    }

    // ========================================
    // Layer 2: Explicit Phrase Matching Tests (v2)
    // ========================================
    #[test]
    fn test_explicit_symbol_phrases() {
        assert_eq!(transform("hash sign"), "#");
        assert_eq!(transform("pound sign"), "#");
        assert_eq!(transform("plus sign"), "+");
        assert_eq!(transform("minus sign"), "-");
        assert_eq!(transform("equals sign"), "=");
        assert_eq!(transform("pipe sign"), "|");
    }

    #[test]
    fn test_directional_arrows() {
        assert_eq!(transform("right arrow"), "->");
        assert_eq!(transform("left arrow"), "<-");
        assert_eq!(transform("fat arrow"), "=>");
        assert_eq!(transform("thin arrow"), "->");
        assert_eq!(transform("up arrow"), "↑");
        assert_eq!(transform("down arrow"), "↓");
    }

    #[test]
    fn test_contextual_number_triggers() {
        assert_eq!(transform("line forty two"), "line 42");
        assert_eq!(transform("version two"), "version 2");
        assert_eq!(transform("step one"), "step 1");
        assert_eq!(transform("option three"), "option 3");
    }

    #[test]
    fn test_contextual_error_codes() {
        assert_eq!(transform("error four oh four"), "error 404");
    }

    #[test]
    fn test_contextual_port_numbers() {
        assert_eq!(transform("port eighty eighty"), "port 8080");
    }

    #[test]
    fn test_basic_punctuation() {
        assert_eq!(transform("Hello comma world period"), "Hello, world.");
        assert_eq!(transform("Stop period"), "Stop.");
        assert_eq!(transform("Really question mark"), "Really?");
        assert_eq!(transform("Wow exclamation point"), "Wow!");
    }

    #[test]
    fn test_operators() {
        // v2: "equals" and "plus" pass through - use explicit triggers
        assert_eq!(transform("x equals sign y"), "x = y");
        assert_eq!(transform("a plus sign b"), "a + b");
        assert_eq!(transform("c minus d"), "c - d");  // "minus" kept (unambiguous in context)
        assert_eq!(transform("e asterisk f"), "e * f");
    }

    #[test]
    fn test_brackets() {
        assert_eq!(transform("open paren x close paren"), "(x)");
        assert_eq!(transform("open bracket a close bracket"), "[a]");
        assert_eq!(transform("open brace b close brace"), "{b}");
    }

    #[test]
    fn test_brackets_plural() {
        // Test plural forms (common in natural speech)
        assert_eq!(transform("open parentheses x close parentheses"), "(x)");
        assert_eq!(transform("open brackets a close brackets"), "[a]");
        assert_eq!(transform("open braces b close braces"), "{b}");
    }

    #[test]
    fn test_programming() {
        assert_eq!(transform("git commit hyphen m"), "git commit -m");
        assert_eq!(transform("if x double equals y"), "if x == y");
        assert_eq!(transform("not equals"), "!=");
    }

    #[test]
    fn test_multi_word_patterns() {
        assert_eq!(transform("What question mark"), "What?");
        assert_eq!(transform("Price dollar sign"), "Price $");
        // Note: "hash" alone converts to "#", so use just one trigger
        assert_eq!(transform("hashtag trending"), "# trending");
    }

    #[test]
    fn test_quotes() {
        assert_eq!(transform("quote Hello world quote"), "\"Hello world\"");
        assert_eq!(transform("single quote test single quote"), "'test'");
    }

    #[test]
    fn test_complex_sentence() {
        let input = "git commit hyphen m quote fix bug quote";
        let expected = "git commit -m \"fix bug\"";
        assert_eq!(transform(input), expected);
    }

    #[test]
    fn test_performance_target() {
        use std::time::Instant;

        let input = "Hello comma this is a test period How are you question mark";
        let start = Instant::now();

        for _ in 0..1000 {
            let _ = transform(input);
        }

        let elapsed = start.elapsed();
        let avg_micros = elapsed.as_micros() / 1000;

        // Should be well under 5000 microseconds (5ms) per call
        assert!(avg_micros < 5000, "Average: {}μs (target: <5000μs)", avg_micros);
    }
}
