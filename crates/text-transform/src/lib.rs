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

mod rules;
mod spacing;

pub use rules::TransformRule;
use rules::STATIC_MAPPINGS;
use spacing::SpacingContext;

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
/// // Operators with spacing
/// assert_eq!(transform("x equals y"), "x = y");
/// assert_eq!(transform("a plus b"), "a + b");
///
/// // Brackets
/// assert_eq!(transform("open paren x close paren"), "(x)");
///
/// // Programming symbols
/// assert_eq!(transform("git commit hyphen m"), "git commit -m");
/// ```
pub fn transform(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = String::with_capacity(text.len()); // Pre-allocate
    let mut i = 0;
    let mut quote_state = QuoteState::default();
    let mut last_rule_no_space_after = false;
    let mut last_rule_is_opening = false;

    while i < words.len() {
        let word_lower = words[i].to_lowercase();

        // Check for multi-word patterns first (2-4 words)
        let matched = if i + 3 < words.len() {
            // 4-word patterns (e.g., "less than or equal")
            let four_word = format!("{} {} {} {}",
                word_lower,
                words[i+1].to_lowercase(),
                words[i+2].to_lowercase(),
                words[i+3].to_lowercase()
            );

            if let Some(rule) = STATIC_MAPPINGS.get(four_word.as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 4;
                true
            } else if i + 2 < words.len() {
                // 3-word patterns
                let three_word = format!("{} {} {}",
                    word_lower,
                    words[i+1].to_lowercase(),
                    words[i+2].to_lowercase()
                );

                if let Some(rule) = STATIC_MAPPINGS.get(three_word.as_str()) {
                    apply_rule_with_state(&mut result, rule, &mut quote_state);
                    last_rule_no_space_after = rule.no_space_after;
                    last_rule_is_opening = rule.is_opening;
                    i += 3;
                    true
                } else if i + 1 < words.len() {
                    // 2-word patterns
                    let two_word = format!("{} {}", word_lower, words[i+1].to_lowercase());

                    if let Some(rule) = STATIC_MAPPINGS.get(two_word.as_str()) {
                        apply_rule_with_state(&mut result, rule, &mut quote_state);
                        last_rule_no_space_after = rule.no_space_after;
                        last_rule_is_opening = rule.is_opening;
                        i += 2;
                        true
                    } else {
                        false
                    }
                }
                else {
                    false
                }
            } else if i + 1 < words.len() {
                // 2-word patterns
                let two_word = format!("{} {}", word_lower, words[i+1].to_lowercase());

                if let Some(rule) = STATIC_MAPPINGS.get(two_word.as_str()) {
                    apply_rule_with_state(&mut result, rule, &mut quote_state);
                    last_rule_no_space_after = rule.no_space_after;
                    i += 2;
                    true
                } else {
                    false
                }
            } else {
                false
            }
        } else if i + 1 < words.len() {
            // 2-word patterns
            let two_word = format!("{} {}", word_lower, words[i+1].to_lowercase());

            if let Some(rule) = STATIC_MAPPINGS.get(two_word.as_str()) {
                apply_rule_with_state(&mut result, rule, &mut quote_state);
                last_rule_no_space_after = rule.no_space_after;
                last_rule_is_opening = rule.is_opening;
                i += 2;
                true
            } else {
                false
            }
        } else {
            false
        };

        if !matched {
            // Single word pattern or pass-through
            if let Some(rule) = STATIC_MAPPINGS.get(word_lower.as_str()) {
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

/// Apply a transformation rule with proper spacing context
fn apply_rule(result: &mut String, rule: &TransformRule) {
    apply_rule_with_state(result, rule, &mut QuoteState::default());
}

/// Apply transformation with quote state tracking
fn apply_rule_with_state(result: &mut String, rule: &TransformRule, state: &mut QuoteState) {
    if rule.attach_to_prev {
        // Remove trailing space if present, then attach
        // Used for punctuation like "," and "." (and "dot" in compact mode)
        if result.ends_with(' ') {
            result.pop();
        }
        result.push_str(rule.replacement);
        // no_space_after is handled by the flag, not here
    } else if rule.is_opening {
        // Quotes and backticks: check if opening or closing based on state
        let is_actually_closing = match rule.replacement {
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
        };

        if is_actually_closing {
            // Closing quote: remove trailing space and attach
            if result.ends_with(' ') {
                result.pop();
            }
            result.push_str(rule.replacement);
        } else {
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
        }
    } else {
        // For operators and symbols, add space before if result isn't empty
        // and doesn't end with special characters
        if !result.is_empty() {
            let last_char = result.chars().last();
            let needs_space = match last_char {
                Some('(') | Some('[') | Some('{') | Some('"') | Some('\'') => false,
                Some(c) if c.is_whitespace() => false,
                _ => true,
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

    #[test]
    fn test_basic_punctuation() {
        assert_eq!(transform("Hello comma world period"), "Hello, world.");
        assert_eq!(transform("Stop period"), "Stop.");
        assert_eq!(transform("Really question mark"), "Really?");
        assert_eq!(transform("Wow exclamation point"), "Wow!");
    }

    #[test]
    fn test_operators() {
        assert_eq!(transform("x equals y"), "x = y");
        assert_eq!(transform("a plus b"), "a + b");
        assert_eq!(transform("c minus d"), "c - d");
        assert_eq!(transform("e asterisk f"), "e * f");
    }

    #[test]
    fn test_brackets() {
        assert_eq!(transform("open paren x close paren"), "(x)");
        assert_eq!(transform("open bracket a close bracket"), "[a]");
        assert_eq!(transform("open brace b close brace"), "{b}");
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
        assert_eq!(transform("Hash hashtag trending"), "# trending");
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
