//! Context-aware spacing logic for transformations
//!
//! Determines when to add spaces before/after replacements based on context.

#[derive(Debug, PartialEq)]
pub enum SpacingContext {
    /// Add space before the replacement
    NeedSpaceBefore,
    /// No space before (e.g., after opening bracket)
    NoSpaceBefore,
    /// No space before, but may need space after
    SpaceAfterOnly,
}

impl SpacingContext {
    /// Analyze the current result and replacement to determine spacing
    pub fn analyze(result: &str, replacement: &str) -> Self {
        if result.is_empty() {
            return Self::NoSpaceBefore;
        }

        let last_char = result.chars().last();
        let first_replacement_char = replacement.chars().next();

        match (last_char, first_replacement_char) {
            // After opening brackets, no space needed
            (Some('('), _) | (Some('['), _) | (Some('{'), _) => Self::NoSpaceBefore,

            // After quotes, no space for operators but space for words
            (Some('"'), Some(c)) if c.is_alphanumeric() => Self::NeedSpaceBefore,
            (Some('"'), _) => Self::NoSpaceBefore,
            (Some('\''), Some(c)) if c.is_alphanumeric() => Self::NeedSpaceBefore,
            (Some('\''), _) => Self::NoSpaceBefore,

            // Before operators, need space
            (Some(c), _) if c.is_alphanumeric() => match replacement {
                "=" | "==" | "===" | "!=" | "<" | ">" | "<=" | ">="
                | "+" | "-" | "*" | "/" | "%" | "&" | "&&" | "|" | "||"
                | "^" | "~" | "@" | "#" | "$" => Self::NeedSpaceBefore,

                // Opening brackets after words
                "(" | "[" | "{" => Self::NeedSpaceBefore,

                // Quotes
                "\"" | "'" | "`" => Self::NeedSpaceBefore,

                // Arrows and special operators
                "=>" | "->" | "::" | "..." => Self::NeedSpaceBefore,

                _ => Self::NoSpaceBefore,
            },

            // Fallback: if result ends with whitespace, no additional space
            (Some(c), _) if c.is_whitespace() => Self::NoSpaceBefore,

            // Default: add space
            _ => Self::NeedSpaceBefore,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_result() {
        assert_eq!(SpacingContext::analyze("", "="), SpacingContext::NoSpaceBefore);
    }

    #[test]
    fn test_after_opening_bracket() {
        assert_eq!(SpacingContext::analyze("test(", "x"), SpacingContext::NoSpaceBefore);
        assert_eq!(SpacingContext::analyze("arr[", "0"), SpacingContext::NoSpaceBefore);
    }

    #[test]
    fn test_before_operators() {
        assert_eq!(SpacingContext::analyze("x", "="), SpacingContext::NeedSpaceBefore);
        assert_eq!(SpacingContext::analyze("a", "+"), SpacingContext::NeedSpaceBefore);
        assert_eq!(SpacingContext::analyze("b", "=="), SpacingContext::NeedSpaceBefore);
    }

    #[test]
    fn test_quotes() {
        assert_eq!(SpacingContext::analyze("say", "\""), SpacingContext::NeedSpaceBefore);
    }
}
