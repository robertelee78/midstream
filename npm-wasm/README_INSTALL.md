# 📦 How to Make Midstreamer Work After Installation

## TL;DR - The Answer

**Midstreamer IS working correctly!** You just need to use it the right way:

```bash
npm install midstreamer

# ✅ CORRECT - Use npx
npx midstreamer help

# ❌ WRONG - Direct command (only works after global install)
midstreamer help
```

---

## Why "command not found"?

This is **normal behavior** for npm packages installed locally. Here's why:

1. **Local install** creates: `./node_modules/.bin/midstreamer`
2. This directory is **NOT in your system PATH**
3. So typing `midstreamer` doesn't find it

**Solution:** Use `npx` - it automatically finds and runs local packages!

---

## Three Ways to Use Midstreamer

### 🥇 Method 1: npx (Recommended)

```bash
npm install midstreamer
npx midstreamer version
npx midstreamer benchmark
npx midstreamer help
```

**Pros:**
- Works immediately
- No PATH configuration
- Always uses project's version
- Standard npm best practice

### 🥈 Method 2: Global Install

```bash
npm install -g midstreamer
midstreamer version
midstreamer benchmark
midstreamer help
```

**Pros:**
- Shorter commands (no `npx`)
- Available system-wide
- Works from any directory

**Cons:**
- Only one version system-wide
- May require sudo/admin rights

### 🥉 Method 3: Direct Path

```bash
npm install midstreamer
./node_modules/.bin/midstreamer version
```

**Pros:**
- No npx needed

**Cons:**
- Long command
- Must be in project directory

---

## Verification Test

Let's verify it works:

```bash
# Install in a test directory
cd /tmp && mkdir test && cd test
npm install midstreamer

# Test with npx
npx midstreamer version
```

**Expected output:**
```
Midstream v0.2.3
WebAssembly-powered temporal analysis toolkit

Rust crates:
  - midstreamer-temporal-compare v0.1.0
  - midstreamer-scheduler v0.1.0
  - midstreamer-neural-solver v0.1.0
  - midstreamer-attractor v0.1.0
  - midstreamer-quic v0.1.0
  - midstreamer-strange-loop v0.1.0
```

✅ **If you see this, midstreamer is working perfectly!**

---

## For Your Specific Case

You installed it and got "command not found". Here's the fix:

```bash
# You probably tried this:
npm install midstreamer
midstreamer  # ❌ command not found

# Try this instead:
npx midstreamer help  # ✅ Works!
```

**That's all you need to change!** Add `npx` before `midstreamer`.

---

## Package.json Configuration (Already Correct)

The package is properly configured with a `bin` field:

```json
{
  "bin": {
    "midstreamer": "./cli.js"
  }
}
```

This tells npm:
- **Local install**: Create symlink in `node_modules/.bin/`
- **Global install**: Create symlink in system PATH

Both work - you just need to access them correctly!

---

## Real-World Examples

```bash
# After npm install midstreamer:

# Benchmark
npx midstreamer benchmark

# Compare sequences
npx midstreamer compare 1,2,3,4,5 1,2,4,3,5

# Stream analysis
echo "1,2,3,4,5" | npx midstreamer stream

# File watching
npx midstreamer watch sensor.log

# AgentDB integration
npx midstreamer agentdb-store data.csv
npx midstreamer agentdb-search "45,50,55"
npx midstreamer agentdb-tune --auto
```

---

## Bottom Line

**Your package is configured correctly.** The "command not found" error is expected behavior for local npm installs. Just use `npx midstreamer` instead of `midstreamer`, and everything works perfectly!

**Alternative:** If you want to use `midstreamer` without `npx`, install it globally:
```bash
npm install -g midstreamer
```

---

## Still Having Issues?

Check these:

1. **Verify npm installation:**
   ```bash
   npm list midstreamer
   # Should show: midstreamer@0.2.3
   ```

2. **Check if bin was created:**
   ```bash
   ls -la node_modules/.bin/midstreamer
   # Should exist and be executable
   ```

3. **Try direct path:**
   ```bash
   ./node_modules/.bin/midstreamer version
   # Should work
   ```

If all these work, then **midstreamer is installed correctly** - you just need to use `npx`!

---

**Need more help?** See:
- [QUICKSTART.md](./QUICKSTART.md) - 30-second getting started guide
- [HOW_TO_USE.md](./HOW_TO_USE.md) - Complete usage guide with examples
- Run `npx midstreamer help` for all commands
