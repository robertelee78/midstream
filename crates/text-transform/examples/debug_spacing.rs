use midstreamer_text_transform::transform;

fn main() {
    println!("=== Testing number transformations with spacing ===\n");

    let tests = vec![
        ("x equals open bracket one close bracket", "x = [1]"),
        ("if count less than five", "if count < 5"),
        ("x equals one", "x = 1"),
        ("arr open bracket i close bracket", "arr[i]"),
    ];

    for (input, expected) in tests {
        let result = transform(input);
        let status = if result == expected {
            "✓ PASS"
        } else {
            "✗ FAIL"
        };
        println!("{} | Input:    '{}'", status, input);
        println!("     | Output:   '{}'", result);
        println!("     | Expected: '{}'", expected);
        if result != expected {
            println!("     | Diff: Got '{}' but expected '{}'", result, expected);
        }
        println!();
    }
}
