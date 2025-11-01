//! Tests for number word-to-digit transformations

use midstreamer_text_transform::transform;

#[test]
fn test_single_digits() {
    assert_eq!(transform("zero"), "0");
    assert_eq!(transform("one"), "1");
    assert_eq!(transform("two"), "2");
    assert_eq!(transform("three"), "3");
    assert_eq!(transform("four"), "4");
    assert_eq!(transform("five"), "5");
    assert_eq!(transform("six"), "6");
    assert_eq!(transform("seven"), "7");
    assert_eq!(transform("eight"), "8");
    assert_eq!(transform("nine"), "9");
}

#[test]
fn test_teens() {
    assert_eq!(transform("ten"), "10");
    assert_eq!(transform("eleven"), "11");
    assert_eq!(transform("twelve"), "12");
    assert_eq!(transform("thirteen"), "13");
    assert_eq!(transform("fourteen"), "14");
    assert_eq!(transform("fifteen"), "15");
    assert_eq!(transform("sixteen"), "16");
    assert_eq!(transform("seventeen"), "17");
    assert_eq!(transform("eighteen"), "18");
    assert_eq!(transform("nineteen"), "19");
}

#[test]
fn test_tens() {
    assert_eq!(transform("twenty"), "20");
    assert_eq!(transform("thirty"), "30");
    assert_eq!(transform("forty"), "40");
    assert_eq!(transform("fifty"), "50");
    assert_eq!(transform("sixty"), "60");
    assert_eq!(transform("seventy"), "70");
    assert_eq!(transform("eighty"), "80");
    assert_eq!(transform("ninety"), "90");
}

#[test]
fn test_compound_numbers() {
    assert_eq!(transform("twenty one"), "21");
    assert_eq!(transform("twenty three"), "23");
    assert_eq!(transform("forty two"), "42");
    assert_eq!(transform("fifty five"), "55");
    assert_eq!(transform("sixty nine"), "69");
    assert_eq!(transform("seventy seven"), "77");
    assert_eq!(transform("eighty eight"), "88");
    assert_eq!(transform("ninety nine"), "99");
}

#[test]
fn test_hundreds() {
    assert_eq!(transform("one hundred"), "100");
    assert_eq!(transform("two hundred"), "200");
    assert_eq!(transform("five hundred"), "500");
    assert_eq!(transform("nine hundred"), "900");
}

#[test]
fn test_numbers_in_arrays() {
    // The original bug report case
    assert_eq!(
        transform("x equals open bracket one comma two comma three close bracket"),
        "x = [1, 2, 3]"
    );
}

#[test]
fn test_numbers_with_punctuation() {
    assert_eq!(transform("one comma two comma three"), "1, 2, 3");
    assert_eq!(transform("count equals five period"), "count = 5.");
    assert_eq!(transform("value open paren ten close paren"), "value(10)");  // No space before ( after identifier
}

#[test]
fn test_numbers_in_sentences() {
    assert_eq!(transform("I have three cats period"), "I have 3 cats.");
    assert_eq!(transform("Buy five apples comma two oranges period"), "Buy 5 apples, 2 oranges.");
}

#[test]
fn test_mixed_numbers_and_operators() {
    assert_eq!(transform("x equals one plus two"), "x = 1 + 2");
    assert_eq!(transform("if count less than five"), "if count < 5");
    assert_eq!(transform("total equals twenty three"), "total = 23");
}
