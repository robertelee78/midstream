//! # Text Transform v3 - Intelligent Pattern Matching
//!
//! Evolution of v2's static rules with intelligent fuzzy temporal matching.
//!
//! ## Architecture
//!
//! Three-tier hybrid system:
//! 1. **Fuzzy Temporal Matching** - Learned patterns with DTW-based similarity
//! 2. **Static Rules** - v2 proven rules as fallback
//! 3. **User Overrides** - Manual corrections always win
//!
//! ## Example
//!
//! ```
//! use midstreamer_text_transform::v3::{TransformV3, TransformConfig};
//!
//! let config = TransformConfig::default()
//!     .with_fuzzy_threshold(0.8);
//!
//! let mut transformer = TransformV3::new(config).unwrap();
//!
//! // Static rules work out of the box
//! assert_eq!(transformer.transform("period"), ".");
//!
//! // Learn a correction pattern
//! transformer.learn_correction("arkon".to_string(), "archon".to_string());
//! assert_eq!(transformer.transform("arkon"), "archon");
//! ```

mod config;
mod fuzzy_matcher;
mod hybrid_engine;
mod static_rules;

pub use config::{TransformConfig, TransformMode};
pub use fuzzy_matcher::FuzzyMatcher;
pub use hybrid_engine::TransformV3;
pub use static_rules::StaticRules;

use thiserror::Error;

/// Errors that can occur during v3 transformation
#[derive(Debug, Error)]
pub enum TransformError {
    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Pattern loading error: {0}")]
    PatternLoadError(String),

    #[error("Fuzzy matching error: {0}")]
    FuzzyMatchError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Temporal comparison error: {0}")]
    TemporalError(String),
}

pub type Result<T> = std::result::Result<T, TransformError>;
