//! Tests for programming-specific transformations (underscore, parentheses, etc.)

use midstreamer_text_transform::transform;

#[test]
fn test_function_definitions() {
    assert_eq!(
        transform("def hello underscore world open parenthesis close parenthesis colon"),
        "def hello_world():"
    );
    assert_eq!(
        transform("function calculate underscore sum open paren nums close paren"),
        "function calculate_sum(nums)"
    );
}

#[test]
fn test_snake_case_identifiers() {
    assert_eq!(transform("snake underscore case"), "snake_case");
    assert_eq!(
        transform("my underscore var underscore name"),
        "my_var_name"
    );
    // v2: Use explicit triggers for "equals" and numbers
    assert_eq!(
        transform("user underscore id equals sign number five"),
        "user_id = 5"
    );
}

#[test]
fn test_function_calls() {
    assert_eq!(transform("print open paren close paren"), "print()");
    assert_eq!(
        transform("func open parenthesis close parenthesis"),
        "func()"
    );
    assert_eq!(transform("call me open paren close paren"), "call me()");
}

#[test]
fn test_parameters() {
    assert_eq!(
        transform("def add open paren x comma y close paren"),
        "def add(x, y)"
    );
    assert_eq!(
        transform("function foo open parenthesis a comma b comma c close parenthesis"),
        "function foo(a, b, c)"
    );
}

#[test]
fn test_mixed_programming() {
    // Note: Per v2 design, numbers require "number X" prefix to convert
    assert_eq!(
        transform("if count underscore total less than number ten colon"),
        "if count_total < 10:"
    );
    assert_eq!(
        transform("my underscore func open paren number one comma number two close paren"),
        "my_func(1, 2)"
    );
}

#[test]
fn test_array_indexing_still_works() {
    // Ensure we didn't break array indexing with bracket fixes
    assert_eq!(transform("arr open bracket i close bracket"), "arr[i]");
    // v2: "zero" passes through - use "number zero" for digit
    assert_eq!(
        transform("list open bracket number zero close bracket"),
        "list[0]"
    );
}
