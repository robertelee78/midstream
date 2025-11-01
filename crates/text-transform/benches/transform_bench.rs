use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use midstreamer_text_transform::transform;

fn bench_simple_transforms(c: &mut Criterion) {
    let inputs = vec![
        "Hello comma world period",
        "Stop period",
        "x equals y",
    ];

    for input in inputs {
        c.bench_with_input(
            BenchmarkId::new("simple", input),
            &input,
            |b, i| b.iter(|| transform(black_box(i)))
        );
    }
}

fn bench_complex_transforms(c: &mut Criterion) {
    let inputs = vec![
        "git commit hyphen m quote fix bug quote",
        "if x double equals y colon",
        "The value open paren x plus y close paren equals z period",
    ];

    for input in inputs {
        c.bench_with_input(
            BenchmarkId::new("complex", input),
            &input,
            |b, i| b.iter(|| transform(black_box(i)))
        );
    }
}

fn bench_batch_processing(c: &mut Criterion) {
    let batch: Vec<&str> = vec![
        "Hello comma world period",
        "git commit hyphen m",
        "x equals y",
        "open paren test close paren",
        "Really question mark",
    ];

    c.bench_function("batch_5_transforms", |b| {
        b.iter(|| {
            for input in &batch {
                black_box(transform(input));
            }
        })
    });
}

criterion_group!(benches, bench_simple_transforms, bench_complex_transforms, bench_batch_processing);
criterion_main!(benches);
