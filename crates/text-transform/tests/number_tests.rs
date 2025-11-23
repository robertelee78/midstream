//! Tests for number word-to-digit transformations (v2)
//!
//! v2 Design: Number words pass through unchanged UNLESS triggered by:
//! - "number X" → digit conversion
//! - Contextual triggers: "line X", "version X", "step X", etc.

use midstreamer_text_transform::transform;

#[test]
fn test_v2_numbers_pass_through() {
    // v2: Standalone number words pass through unchanged
    assert_eq!(transform("one"), "one");
    assert_eq!(transform("two"), "two");
    assert_eq!(transform("ten"), "ten");
    assert_eq!(transform("twenty"), "twenty");
    assert_eq!(transform("forty two"), "forty two");
    assert_eq!(transform("I have three cats"), "I have three cats");
}

#[test]
fn test_number_keyword_trigger() {
    // "number X" triggers digit conversion
    assert_eq!(transform("number five"), "5");
    assert_eq!(transform("number nine"), "9");
    assert_eq!(transform("number thirteen"), "13");
    assert_eq!(transform("number forty"), "40");
    assert_eq!(transform("number forty two"), "42");
    assert_eq!(transform("number ninety nine"), "99");

    // "digit X" as alternative trigger (v2 PRD)
    assert_eq!(transform("digit five"), "5");
    assert_eq!(transform("digit forty two"), "42");

    // In sentences
    assert_eq!(transform("I have number forty two cats"), "I have 42 cats");
    assert_eq!(transform("count equals sign number five"), "count = 5");
}

#[test]
fn test_contextual_triggers() {
    // Contextual triggers: keep prefix word + convert number
    assert_eq!(transform("line forty two"), "line 42");
    assert_eq!(transform("version two"), "version 2");
    assert_eq!(transform("step one"), "step 1");
    assert_eq!(transform("option three"), "option 3");
    assert_eq!(transform("error four oh four"), "error 404");
    assert_eq!(transform("port eighty eighty"), "port 8080");
    assert_eq!(transform("release twenty five"), "release 25");
}

#[test]
fn test_year_patterns() {
    // Years with "number" trigger
    assert_eq!(transform("number nineteen fifty"), "1950");
    assert_eq!(transform("number nineteen ninety nine"), "1999");
    assert_eq!(transform("number twenty twenty"), "2020");
    assert_eq!(transform("number twenty twenty five"), "2025");

    // Decade plurals
    assert_eq!(transform("number nineteen fifties"), "1950s");
    assert_eq!(transform("number nineteen eighties"), "1980s");

    // In sentences
    assert_eq!(
        transform("Born in number nineteen eighty five"),
        "Born in 1985"
    );
}

#[test]
#[ignore] // TODO: Implement hundreds pattern
fn test_hundreds() {
    assert_eq!(transform("number one hundred"), "100");
    assert_eq!(transform("number two hundred"), "200");
}

#[test]
fn test_numbers_with_explicit_operators() {
    // v2: Use explicit operator triggers with number triggers
    assert_eq!(
        transform("x equals sign number one plus sign number two"),
        "x = 1 + 2"
    );
    assert_eq!(
        transform("total equals sign number twenty three"),
        "total = 23"
    );
}
