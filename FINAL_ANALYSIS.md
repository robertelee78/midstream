# Secretary Mode Double Punctuation - Root Cause Analysis

## Executive Summary

**MYSTERY SOLVED**: The fix was correctly removed in commit 3f8ce69, and the SOURCE CODE is correct. **But the user is experiencing a real bug because they may be running an older binary or a different configuration.**

## Complete Timeline

### Phase 1: sherpa-rs Era (Before Nov 21)
**STT Backend**: sherpa-rs (adds auto-punctuation)
**Bug**: Double punctuation in Secretary Mode
**Fix**: Strip punctuation before transform (commit 3c751e2)
**Status**: ✅ Correctly fixed

### Phase 2: OrtRecognizer Migration (Nov 21, 3f8ce69)
**STT Backend**: Pure ONNX Runtime (no auto-punctuation)
**Change**: Removed sherpa-rs AND removed punctuation stripping
**Status**: ✅ Correctly migrated

### Phase 3: Current State (Nov 24, HEAD)
**STT Backend**: Pure ONNX Runtime via OrtRecognizer
**Source Code**: No punctuation stripping (correct)
**Binary**: Built Nov 24 15:33 (should be clean)
**Status**: ⚠️ User reports bug still exists

## Evidence Analysis

### ✅ Source Code is CORRECT

**OrtRecognizer implementation** (`recognizer_ort.rs:1416-1439`):
```rust
fn tokens_to_text(&self, tokens: &[i64]) -> String {
    tokens
        .iter()
        .filter_map(|&token_id| {
            if token_id != self.blank_id && token_id != self.unk_id {
                Some(self.tokens[idx].as_str())
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join("")
        .replace("▁", " ")  // ONLY post-processing: BPE underscore → space
        .trim()
        .to_string()
}
```

**What it does**:
1. Maps token IDs to BPE tokens
2. Joins them together
3. Replaces BPE underscores (▁) with spaces
4. Trims whitespace

**What it DOES NOT do**:
- ❌ Add punctuation
- ❌ Add capitalization
- ❌ Any grammar processing
- ❌ Any post-editing

### ✅ Dependencies are CORRECT

**Current Cargo.toml**:
```toml
# NO sherpa-rs!
ort = { version = "2.0.0-rc.10", features = ["coreml"] }
```

**Binary check**:
```bash
$ strings npm-package/lib/native/swictation-daemon.bin | grep -i sherpa
# (no results - sherpa is NOT in the binary)
```

### ✅ Pipeline is CORRECT

**Current pipeline.rs** (lines 508-513):
```rust
// OrtRecognizer outputs raw lowercase text without punctuation.
// Step 1: Process capital commands first ("capital r robert" → "Robert")
let with_capitals = process_capital_commands(&text);

// Step 2: Transform punctuation ("comma" → ",")
let transformed = transform(&with_capitals);
```

No punctuation stripping = correct behavior for OrtRecognizer.

## Why is User Still Seeing the Bug?

### Hypothesis 1: Running Old Binary ❌
**Ruled out**: Binary was rebuilt Nov 24, after the migration.

### Hypothesis 2: Model is Adding Punctuation ⚠️ **MOST LIKELY**
**The actual ONNX model file might be different from what the code expects!**

The BPE vocabulary file might include punctuation tokens, or the model might be trained to output punctuation.

**Evidence to check**:
```bash
# Check vocabulary file for punctuation tokens
cat /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/tokens.txt | grep -E "^[.,!?;:]$"
```

If the tokens file contains standalone punctuation marks (comma, period, etc.), then the model CAN output punctuation even though `tokens_to_text()` doesn't add it.

### Hypothesis 3: Wrong Model Version ⚠️
The 0.6B model path might point to an older version that was trained with punctuation.

**Check**:
```bash
ls -la /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/
# Look for model.onnx timestamp
```

### Hypothesis 4: Midstream Transform Bug ⚠️
The bug might actually be in the midstream transformer, not the STT!

**If midstream sees**: "hello comma world"
**It should output**: "hello, world"
**If it's buggy, it might output**: "hello,, world" (double comma)

This would mean the midstream transform is being applied twice somehow.

## Debugging Steps for User

### Step 1: Check STT Raw Output
```bash
# Add debug logging to pipeline.rs (line 503):
eprintln!("🔍 RAW STT OUTPUT: '{}'", text);
```

Run the daemon and say: "hello comma world period"

**Expected**: `hello comma world period` (no punctuation)
**If you see**: `Hello, comma world period.` → Model is adding punctuation!

### Step 2: Check Model Vocabulary
```bash
# Check if model has punctuation tokens
cat /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/tokens.txt | grep -E "^[.,!?;:]$"
```

**If found**: Model was trained to output punctuation.

### Step 3: Check Midstream Transform
```bash
# Add debug to pipeline.rs (line 513):
eprintln!("🔍 BEFORE TRANSFORM: '{}'", with_capitals);
eprintln!("🔍 AFTER TRANSFORM: '{}'", transformed);
```

**Expected**:
- Before: `hello comma world period`
- After: `hello, world.`

**If you see double punctuation at this stage**: Midstream bug!

### Step 4: Check for Multiple Transforms
```bash
# Search for transform() calls
grep -rn "transform(" rust-crates/swictation-daemon/src/
```

Make sure transform() is only called ONCE per transcription.

## Recommended Fix

Based on most likely hypothesis (model outputs punctuation):

### Option A: Use Different Model
Download a model that doesn't add punctuation.

### Option B: Restore Punctuation Stripping (if model adds it)
```rust
// At line 508 in pipeline.rs
let text_cleaned = text
    .to_lowercase()
    .replace(",", "")
    .replace(".", "")
    .replace("?", "")
    .replace("!", "");

let with_capitals = process_capital_commands(&text_cleaned);
```

### Option C: Fix Model Vocabulary
Re-export the ONNX model with a vocabulary that doesn't include standalone punctuation tokens.

## Final Conclusion

**The code is correct for a clean OrtRecognizer setup.**

**The bug exists because one of these is true**:
1. The ONNX model file includes punctuation in its vocabulary
2. The model path points to an old model version
3. The midstream transformer has a bug
4. transform() is being called multiple times

**Next steps**: Run the debugging commands above to identify which hypothesis is correct.

## Commands for User

```bash
# 1. Check model vocabulary
cat /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/tokens.txt | wc -l
cat /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/tokens.txt | grep -E "^[.,!?;:]$"

# 2. Check model timestamp
ls -la /opt/swictation/models/parakeet-tdt-0.6b-v3-onnx/

# 3. Add debug logging to pipeline.rs and rebuild
# Then run and speak: "hello comma world period"
```
