# Secretary Mode Punctuation Fix - Complete Analysis

## Executive Summary

**FINDING**: The fix was **CORRECTLY REMOVED** but the audit documentation was **INCOMPLETE**. The removal in commit 3f8ce69 was actually correct because sherpa-rs was also removed in the same commit.

## Timeline of Events

### ✅ 2025-11-16 20:12 - Fix Added (commit 3c751e2)
**Commit**: `3c751e2` - "fix: Strip auto-punctuation from 0.6B model to prevent double punctuation"
**STT Backend**: sherpa-rs (adds auto-punctuation) ✗
**Status**: FIX WAS NECESSARY

```rust
// IMPORTANT: 0.6B model via sherpa-rs adds auto-punctuation/capitalization
// Strip it before Secretary Mode transformation to prevent double punctuation
let cleaned_text = text
    .to_lowercase()  // Remove auto-capitalization
    .replace(",", "")  // Remove auto-added commas
    .replace(".", "")  // Remove auto-added periods
    // ... etc
```

**Why it was needed**: 0.6B model via **sherpa-rs** was adding auto-punctuation.

**Evidence**: `swictation-stt/Cargo.toml` at this commit:
```toml
sherpa-rs = { git = "https://github.com/thewh1teagle/sherpa-rs.git",
              features = ["cuda"] }
```

---

### ✅ 2025-11-16 21:29 - Fix Preserved (commit f0e6ad6)
**Commit**: `f0e6ad6` - "feat: Implement architectural improvements"
**STT Backend**: Still sherpa-rs
**Status**: FIX STILL NECESSARY AND PRESENT

---

### ✅ 2025-11-20 - Fix Still Present (commit 1dbb60a)
**Commit**: `1dbb60a` - "feat: Add pattern correction learning system (v0.5.0)"
**STT Backend**: Still sherpa-rs
**Status**: FIX STILL NECESSARY AND PRESENT

---

### ✅ 2025-11-21 18:14 - FIX REMOVED + SHERPA-RS REMOVED (commit 3f8ce69)
**Commit**: `3f8ce69` - "docs: Update documentation for OrtRecognizer migration"
**STT Backend**: **Migrated from sherpa-rs to OrtRecognizer (direct ONNX Runtime)**
**Status**: FIX REMOVAL WAS **CORRECT** (but documentation was incomplete)

**Changes made**:

1. **Removed sherpa-rs dependency** (Cargo.toml):
```diff
-sherpa-rs = { git = "https://github.com/thewh1teagle/sherpa-rs.git",
-              features = ["cuda"] }
+# Direct ONNX Runtime for all models (0.6B and 1.1B)
+ort = { version = "2.0.0-rc.8", features = ["ndarray", "half"] }
```

2. **Removed punctuation stripping** (pipeline.rs):
```diff
-    // IMPORTANT: 0.6B model via sherpa-rs adds auto-punctuation
-    let cleaned_text = text.to_lowercase().replace(",", "")...
-    let with_capitals = process_capital_commands(&cleaned_text);
+    // OrtRecognizer outputs raw lowercase text without punctuation.
+    let with_capitals = process_capital_commands(&text);
```

3. **Removed old sherpa-rs recognizer** (deleted `recognizer.rs`):
- Deleted 262 lines of sherpa-rs wrapper code
- All models now use OrtRecognizer (direct ONNX Runtime)

**Why removal was correct**: OrtRecognizer (direct ONNX Runtime) outputs **raw BPE tokens** without any post-processing. The punctuation stripping was only needed for sherpa-rs.

---

## Root Cause of Current Bug

**THE PROBLEM IS NOT IN THE SOURCE CODE** - it's in the **compiled binary**!

### Binary Status Investigation

**Last binary build**: 2025-11-24 15:33 (commit `74e7afe`)
**Current npm version**: 0.7.2
**Current source code**: Uses OrtRecognizer (no auto-punctuation)
**Current compiled binary**: **May still have sherpa-rs compiled in**

### Evidence of Binary/Source Mismatch

1. **Git status shows binary is modified**:
```
M npm-package/lib/native/swictation-daemon.bin
```

2. **Binary last updated**: Nov 24 15:33
3. **Commit 3f8ce69 (removed fix)**: Nov 21 18:14
4. **Binary was rebuilt AFTER source changes**

### Hypothesis: Incremental Build Issue

**Most likely cause**: The binary at `npm-package/lib/native/swictation-daemon.bin` was built incrementally and may have:
- Cached sherpa-rs dependencies
- Old object files linked in
- Dependency resolution issues

## Verification Commands

### Check if binary actually uses OrtRecognizer:

```bash
# Check for sherpa symbols in binary
strings npm-package/lib/native/swictation-daemon.bin | grep -i "sherpa\|onnxruntime" | head -20

# Compare binary size
ls -lh npm-package/lib/native/swictation-daemon.bin
# 9.9M = current size
# sherpa-rs binaries are typically larger due to bundled libs
```

### Check actual STT output:

```bash
# Run daemon with debug logging
RUST_LOG=debug npm run daemon

# Say: "hello comma world period"
# Expected output (OrtRecognizer): "hello comma world period" (raw text)
# Actual output (if sherpa-rs): "Hello, comma world period." (has punctuation)
```

## Solution

### Option 1: Clean Rebuild (RECOMMENDED)

```bash
cd /opt/swictation/rust-crates
cargo clean
cargo build --release

# Copy fresh binary
cp target/release/swictation-daemon ../npm-package/lib/native/swictation-daemon.bin
cp target/release/swictation-daemon ../npm-package/bin/swictation-daemon
```

### Option 2: Restore Fix (if OrtRecognizer also adds punctuation)

If testing shows OrtRecognizer ALSO adds punctuation (unlikely), restore fix:

```bash
git show 3c751e2:rust-crates/swictation-daemon/src/pipeline.rs > /tmp/pipeline_with_fix.rs
# Manually extract the cleaned_text preprocessing
```

But this should NOT be necessary if OrtRecognizer is working correctly.

## Conclusion

**The code is correct. The binary is suspect.**

1. ✅ Source code correctly removed sherpa-rs
2. ✅ Source code correctly removed punctuation stripping
3. ✅ OrtRecognizer outputs raw text (no punctuation)
4. ❌ Binary may still have old dependencies

**Action Required**: Clean rebuild to ensure binary matches source.

## Timeline Summary

| Date | Commit | STT Backend | Fix Status | Correctness |
|------|--------|-------------|------------|-------------|
| Nov 16 20:12 | 3c751e2 | sherpa-rs | Added | ✅ Correct |
| Nov 16 21:29 | f0e6ad6 | sherpa-rs | Present | ✅ Correct |
| Nov 20 | 1dbb60a | sherpa-rs | Present | ✅ Correct |
| **Nov 21 18:14** | **3f8ce69** | **OrtRecognizer** | **Removed** | **✅ Correct** |
| Nov 24 15:33 | 74e7afe | OrtRecognizer | N/A | ⚠️ Binary suspect |

## References

- Original fix: commit `3c751e2`
- Migration commit: `3f8ce69`
- Current HEAD: `933a952`
- Binary location: `/opt/swictation/npm-package/lib/native/swictation-daemon.bin`
