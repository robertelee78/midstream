use midstreamer_text_transform::transform;

fn main() {
    let test1 = "x equals open bracket one close bracket";
    let result1 = transform(test1);
    println!("Input:  '{}'", test1);
    println!("Output: '{}'", result1);
    println!("Expected: 'x = [1]'");
    println!();
    
    let test2 = "if count less than five";
    let result2 = transform(test2);
    println!("Input:  '{}'", test2);
    println!("Output: '{}'", result2);
    println!("Expected: 'if count < 5'");
}
