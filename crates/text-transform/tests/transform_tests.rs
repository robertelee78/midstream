//! Comprehensive tests for text transformation
//!
//! Tests aligned with v2 PRD (docs/specs/text-transform-v2-prd.md)

use midstreamer_text_transform::transform;

#[test]
fn test_basic_punctuation() {
    assert_eq!(transform("Hello comma world period"), "Hello, world.");
    assert_eq!(transform("Stop period"), "Stop.");
    assert_eq!(transform("Really question mark"), "Really?");
    assert_eq!(transform("Wow exclamation point"), "Wow!");
    assert_eq!(transform("Wow exclamation mark"), "Wow!");
    // "bang" removed - not in PRD
}

#[test]
fn test_complex_punctuation() {
    assert_eq!(transform("Hello colon world"), "Hello: world");
    assert_eq!(transform("Item semicolon next"), "Item; next");
    assert_eq!(transform("It apostrophe s"), "It's");
    assert_eq!(transform("Wait ellipsis"), "Wait...");
}

#[test]
fn test_quotes() {
    assert_eq!(transform("quote Hello quote"), "\"Hello\"");
    // "double quote" removed - only "quote" in PRD
    assert_eq!(transform("single quote word single quote"), "'word'");
    assert_eq!(transform("backtick code backtick"), "`code`");
}

#[test]
fn test_brackets_parentheses() {
    assert_eq!(transform("open paren x close paren"), "(x)");
    assert_eq!(transform("open parenthesis y close parenthesis"), "(y)");
    // "left paren" / "right paren" removed - only open/close in PRD
}

#[test]
fn test_brackets_square() {
    assert_eq!(transform("open bracket a close bracket"), "[a]");
    // "left bracket" / "right bracket" removed - only open/close in PRD
}

#[test]
fn test_brackets_curly() {
    assert_eq!(transform("open brace c close brace"), "{c}");
    // "left brace" / "right brace" removed - only open/close in PRD
}

#[test]
fn test_angle_brackets() {
    // Per PRD: "left angle" / "right angle" → < >
    // Note: spacing between symbols is expected
    assert_eq!(transform("left angle T right angle"), "< T >");
    // "angle brackets" → "<>"
    assert_eq!(transform("angle brackets"), "<>");
}

#[test]
fn test_operators_basic() {
    // Per PRD: "equals" is ambiguous, needs "equals sign"
    // But we have "double equals" which is unambiguous
    assert_eq!(transform("a plus sign b"), "a + b");
    assert_eq!(transform("c minus d"), "c - d");
    assert_eq!(transform("e asterisk f"), "e * f");
    // "star" removed - ambiguous, use "asterisk"
}

#[test]
fn test_operators_division() {
    assert_eq!(transform("g slash h"), "g / h");
    assert_eq!(transform("i forward slash j"), "i / j");
}

#[test]
fn test_operators_special() {
    assert_eq!(transform("path backslash file"), "path \\ file");
    // "back slash" (two words) removed - only "backslash" in PRD
    assert_eq!(transform("a pipe sign b"), "a | b"); // Per PRD: requires "pipe sign"
    assert_eq!(transform("x ampersand y"), "x & y");
    // "and sign" removed - not in PRD
}

#[test]
fn test_comparison_operators() {
    assert_eq!(transform("x less than y"), "x < y");
    assert_eq!(transform("x greater than y"), "x > y");
    assert_eq!(transform("a double equals b"), "a == b");
    assert_eq!(transform("a triple equals b"), "a === b");
    assert_eq!(transform("a not equals b"), "a != b");
    assert_eq!(transform("x less than or equal y"), "x <= y");
    assert_eq!(transform("x greater than or equal y"), "x >= y");
}

#[test]
fn test_logical_operators() {
    assert_eq!(transform("a double ampersand b"), "a && b");
    assert_eq!(transform("a and and b"), "a && b");
    assert_eq!(transform("c double pipe d"), "c || d");
    assert_eq!(transform("c or or d"), "c || d");
}

#[test]
fn test_symbols_basic() {
    assert_eq!(transform("snake underscore case"), "snake_case");
    assert_eq!(transform("user at sign example"), "user @ example");
    // "at" alone removed - ambiguous per PRD, needs "at sign"
}

#[test]
fn test_symbols_hash() {
    // Per v2 PRD: "hash" alone passes through, need "hash sign"
    assert_eq!(transform("hash sign tag"), "# tag");
    assert_eq!(transform("hashtag trending"), "# trending"); // "hashtag" kept per PRD
    assert_eq!(transform("pound sign define"), "# define");
}

#[test]
fn test_symbols_money() {
    assert_eq!(transform("dollar sign amount"), "$ amount");
    // "dollarsign" (no space) removed - not in PRD
    // Per v2 PRD: "fifty" passes through, need "number fifty"
    // Percent attaches to previous (correct behavior)
    assert_eq!(transform("number fifty percent"), "50%");
    // "percent sign" attaches to previous (correct behavior)
    assert_eq!(transform("rate percent sign"), "rate%");
}

#[test]
fn test_symbols_special() {
    assert_eq!(transform("tilde home"), "~ home");
    assert_eq!(transform("x caret y"), "x ^ y");
    assert_eq!(transform("x carrot y"), "x ^ y"); // Common misspelling - in PRD
}

#[test]
fn test_programming_arrows() {
    // Per PRD: directional arrows require modifier
    assert_eq!(transform("fat arrow function"), "=> function");
    assert_eq!(transform("thin arrow ptr"), "-> ptr");
    assert_eq!(transform("right arrow val"), "-> val");
    assert_eq!(transform("left arrow back"), "<- back");
}

#[test]
fn test_programming_special() {
    assert_eq!(transform("double colon method"), ":: method");
    assert_eq!(transform("triple dot args"), "... args");
    assert_eq!(transform("spread operator"), "... operator");
    assert_eq!(transform("splat args"), "... args");
}

#[test]
fn test_hyphens_and_dashes() {
    assert_eq!(transform("git commit hyphen m"), "git commit -m");
    assert_eq!(transform("long dash separated"), "long - separated");
    assert_eq!(transform("x minus d"), "x - d");
}

#[test]
fn test_real_world_examples() {
    // Git command
    assert_eq!(
        transform("git commit hyphen m quote fix bug quote"),
        "git commit -m \"fix bug\""
    );

    // JavaScript
    assert_eq!(
        transform("const x equals sign open paren a plus sign b close paren"),
        "const x = (a + b)"
    );

    // Python - per PRD, "double equals" is unambiguous
    assert_eq!(transform("if x double equals y colon"), "if x == y:");

    // Email - period attaches to previous word (correct behavior)
    assert_eq!(
        transform("user at sign example period com"),
        "user @ example. com"
    );

    // Array access
    assert_eq!(transform("arr open bracket i close bracket"), "arr[i]");
}

#[test]
fn test_sentence_flow() {
    assert_eq!(
        transform("Hello comma how are you question mark"),
        "Hello, how are you?"
    );

    assert_eq!(
        transform("This is a test period It works exclamation point"),
        "This is a test. It works!"
    );
}

#[test]
fn test_mixed_content() {
    assert_eq!(
        transform("The value open paren x plus sign y close paren equals sign z period"),
        "The value(x + y) = z."
    );
}

#[test]
fn test_no_transformation() {
    // Words that aren't in the mapping should pass through
    assert_eq!(transform("hello world"), "hello world");
    assert_eq!(transform("this is normal text"), "this is normal text");
}

#[test]
fn test_empty_input() {
    assert_eq!(transform(""), "");
    assert_eq!(transform("   "), "");
}

#[test]
fn test_v2_pass_through() {
    // Per v2 PRD: These ambiguous words pass through unchanged
    assert_eq!(transform("hash the password"), "hash the password");
    assert_eq!(transform("add one more"), "add one more"); // number words pass through
    assert_eq!(transform("plus that feature"), "plus that feature"); // "plus" passes through
    assert_eq!(transform("doctor this code"), "doctor this code"); // titles pass through
    assert_eq!(transform("equals sign test"), "= test"); // but "equals sign" still works
}

#[test]
fn test_v2_explicit_triggers() {
    // Per v2 PRD: Explicit triggers work
    assert_eq!(transform("hash sign define"), "# define");
    assert_eq!(transform("number one"), "1");
    assert_eq!(transform("plus sign x"), "+ x");
    assert_eq!(transform("pipe sign input"), "| input");
}

#[test]
fn test_performance_regression() {
    use std::time::Instant;

    let inputs = vec![
        "Hello comma world period",
        "git commit hyphen m quote fix quote",
        "if x double equals y colon",
        "arr open bracket i close bracket equals sign value period",
        "This is a test period It works exclamation point",
    ];

    let start = Instant::now();
    for _ in 0..1000 {
        for input in &inputs {
            let _ = transform(input);
        }
    }
    let elapsed = start.elapsed();

    // 5000 transformations target: <25ms in release, <100ms in debug
    // Debug builds are intentionally slower for faster compilation
    let threshold = if cfg!(debug_assertions) { 100 } else { 25 };

    assert!(
        elapsed.as_millis() < threshold,
        "Performance regression: {}ms for 5000 calls (target: <{}ms)",
        elapsed.as_millis(),
        threshold
    );
}
