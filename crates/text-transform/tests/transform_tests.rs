//! Comprehensive tests for text transformation
//!
//! Tests all 55+ examples from task 4422a000

use midstreamer_text_transform::transform;

#[test]
fn test_basic_punctuation() {
    assert_eq!(transform("Hello comma world period"), "Hello, world.");
    assert_eq!(transform("Stop period"), "Stop.");
    assert_eq!(transform("Really question mark"), "Really?");
    assert_eq!(transform("Wow exclamation point"), "Wow!");
    assert_eq!(transform("Wow exclamation mark"), "Wow!");
    assert_eq!(transform("Nice bang"), "Nice!");
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
    assert_eq!(transform("double quote Test double quote"), "\"Test\"");
    assert_eq!(transform("single quote word single quote"), "'word'");
    assert_eq!(transform("backtick code backtick"), "`code`");
}

#[test]
fn test_brackets_parentheses() {
    assert_eq!(transform("open paren x close paren"), "(x)");
    assert_eq!(transform("open parenthesis y close parenthesis"), "(y)");
    assert_eq!(transform("left paren z right paren"), "(z)");
}

#[test]
fn test_brackets_square() {
    assert_eq!(transform("open bracket a close bracket"), "[a]");
    assert_eq!(transform("left bracket b right bracket"), "[b]");
}

#[test]
fn test_brackets_curly() {
    assert_eq!(transform("open brace c close brace"), "{c}");
    assert_eq!(transform("left brace d right brace"), "{d}");
}

#[test]
fn test_brackets_angle() {
    assert_eq!(transform("open angle bracket T close angle bracket"), "<T>");
    assert_eq!(transform("left angle E right angle"), "<E>");
}

#[test]
fn test_operators_basic() {
    assert_eq!(transform("x equals y"), "x = y");
    assert_eq!(transform("a plus b"), "a + b");
    assert_eq!(transform("c minus d"), "c - d");
    assert_eq!(transform("e asterisk f"), "e * f");
    assert_eq!(transform("e star f"), "e * f");
}

#[test]
fn test_operators_division() {
    assert_eq!(transform("g slash h"), "g / h");
    assert_eq!(transform("i forward slash j"), "i / j");
}

#[test]
fn test_operators_special() {
    assert_eq!(transform("path backslash file"), "path \\ file");
    assert_eq!(transform("path back slash file"), "path \\ file");
    assert_eq!(transform("a pipe b"), "a | b");
    assert_eq!(transform("x ampersand y"), "x & y");
    assert_eq!(transform("x and sign y"), "x & y");
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
    assert_eq!(transform("snake underscore case"), "snake_case");  // Compact underscore for identifiers
    assert_eq!(transform("user at sign example"), "user @ example");
    assert_eq!(transform("user at example"), "user @ example");
}

#[test]
fn test_symbols_hash() {
    assert_eq!(transform("hash tag"), "# tag");
    assert_eq!(transform("hashtag trending"), "# trending");
    assert_eq!(transform("pound define"), "# define");
}

#[test]
fn test_symbols_money() {
    assert_eq!(transform("dollar sign amount"), "$ amount");
    assert_eq!(transform("dollarsign price"), "$ price");
    assert_eq!(transform("fifty percent"), "50 %");  // "fifty" → "5" with number transformations
    assert_eq!(transform("rate percent sign"), "rate %");
}

#[test]
fn test_symbols_special() {
    assert_eq!(transform("tilde home"), "~ home");
    assert_eq!(transform("x caret y"), "x ^ y");
    assert_eq!(transform("x carrot y"), "x ^ y"); // Common misspelling
}

#[test]
fn test_programming_arrows() {
    assert_eq!(transform("arrow function"), "=> function");
    assert_eq!(transform("fat arrow fn"), "=> fn");
    assert_eq!(transform("thin arrow ptr"), "-> ptr");
    assert_eq!(transform("right arrow val"), "-> val");
}

#[test]
fn test_programming_special() {
    assert_eq!(transform("double colon method"), ":: method");
    assert_eq!(transform("triple dot args"), "... args");
    assert_eq!(transform("spread operator"), "... operator");
}

#[test]
fn test_hyphens_and_dashes() {
    assert_eq!(transform("git commit hyphen m"), "git commit -m");
    assert_eq!(transform("long dash separated"), "long - separated");
    assert_eq!(transform("x minus y"), "x - y");
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
        transform("const x equals open paren a plus b close paren"),
        "const x = (a + b)"
    );

    // Python
    assert_eq!(
        transform("if x double equals y colon"),
        "if x == y:"
    );

    // Email
    assert_eq!(
        transform("user at sign example dot com"),
        "user @ example.com"
    );

    // Array access
    assert_eq!(
        transform("arr open bracket i close bracket"),
        "arr[i]"
    );
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
        transform("The value open paren x plus y close paren equals z period"),
        "The value(x + y) = z."  // No space before ( after identifier
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
fn test_performance_regression() {
    use std::time::Instant;

    let inputs = vec![
        "Hello comma world period",
        "git commit hyphen m quote fix quote",
        "if x double equals y colon",
        "arr open bracket i close bracket equals value period",
        "This is a test period It works exclamation point",
    ];

    let start = Instant::now();
    for _ in 0..1000 {
        for input in &inputs {
            let _ = transform(input);
        }
    }
    let elapsed = start.elapsed();

    // 5000 transformations target: <25ms in release, <50ms in debug
    // Debug builds are intentionally slower for faster compilation
    let threshold = if cfg!(debug_assertions) { 50 } else { 25 };

    assert!(
        elapsed.as_millis() < threshold,
        "Performance regression: {}ms for 5000 calls (target: <{}ms)",
        elapsed.as_millis(),
        threshold
    );
}
