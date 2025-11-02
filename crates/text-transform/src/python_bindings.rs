//! Python bindings for MidStream text transformation
//!
//! Provides PyO3-based Python bindings for the text-transform crate,
//! enabling <1ms overhead direct Rust->Python FFI calls.

use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;

/// Transform voice commands to symbols using MidStream text-transform engine.
///
/// This function provides direct Rust->Python FFI access to the text transformation
/// engine with <1ms overhead (vs 50-100ms for subprocess approaches).
///
/// Args:
///     text (str): Input text with voice commands (e.g., "Hello comma world")
///
/// Returns:
///     str: Transformed text with symbols (e.g., "Hello, world")
///
/// Raises:
///     ValueError: If input text is empty
///
/// Example:
///     >>> from midstreamer_transform import transform
///     >>> transform("Hello comma world period")
///     'Hello, world.'
///     >>> transform("x equals y plus z")
///     'x = y + z'
#[pyfunction]
fn transform(text: &str) -> PyResult<String> {
    if text.is_empty() {
        return Err(PyValueError::new_err("Input text cannot be empty"));
    }

    Ok(crate::transform(text))
}

/// Get transformation engine statistics.
///
/// Returns information about the loaded transformation rules and engine status.
///
/// Returns:
///     tuple[int, str]: (rule_count, status_message)
///         - rule_count: Number of transformation rules loaded
///         - status_message: Human-readable status string
///
/// Example:
///     >>> from midstreamer_transform import get_stats
///     >>> count, msg = get_stats()
///     >>> print(f"Loaded {count} rules")
///     Loaded 60+ rules
#[pyfunction]
fn get_stats() -> PyResult<(usize, String)> {
    use crate::rules::STATIC_MAPPINGS;
    let count = STATIC_MAPPINGS.len();
    Ok((count, format!("{} transformation rules loaded", count)))
}

/// Performance benchmark for transformation engine.
///
/// Runs the transformation engine N times and returns average microseconds per call.
///
/// Args:
///     text (str): Text to transform
///     iterations (int, optional): Number of iterations to run. Default: 1000
///
/// Returns:
///     tuple[float, str]: (avg_micros, result)
///         - avg_micros: Average microseconds per transformation
///         - result: Transformed text result
///
/// Example:
///     >>> from midstreamer_transform import benchmark
///     >>> avg_us, result = benchmark("Hello comma world", 1000)
///     >>> print(f"Average: {avg_us:.2f}μs")
///     Average: 0.85μs
#[pyfunction]
#[pyo3(signature = (text, iterations=1000))]
fn benchmark(text: &str, iterations: usize) -> PyResult<(f64, String)> {
    use std::time::Instant;

    if text.is_empty() {
        return Err(PyValueError::new_err("Input text cannot be empty"));
    }

    let start = Instant::now();
    let mut result = String::new();

    for _ in 0..iterations {
        result = crate::transform(text);
    }

    let elapsed = start.elapsed();
    let avg_micros = elapsed.as_micros() as f64 / iterations as f64;

    Ok((avg_micros, result))
}

/// MidStream Text Transform Python Module
///
/// Fast text transformation for voice dictation using Rust FFI.
/// Provides <1ms overhead direct Rust->Python integration.
///
/// Functions:
///     transform(text: str) -> str: Transform voice commands to symbols
///     get_stats() -> tuple[int, str]: Get engine statistics
///     benchmark(text: str, iterations: int = 1000) -> tuple[float, str]: Performance benchmark
///
/// Example:
///     >>> import midstreamer_transform as mt
///     >>> mt.transform("Hello comma world period")
///     'Hello, world.'
///     >>> count, msg = mt.get_stats()
///     >>> print(msg)
///     60+ transformation rules loaded
#[pymodule]
fn midstreamer_transform(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(transform, m)?)?;
    m.add_function(wrap_pyfunction!(get_stats, m)?)?;
    m.add_function(wrap_pyfunction!(benchmark, m)?)?;

    // Add module metadata
    m.add("__version__", env!("CARGO_PKG_VERSION"))?;
    m.add("__doc__", "Fast text transformation for voice dictation using Rust FFI")?;

    Ok(())
}
