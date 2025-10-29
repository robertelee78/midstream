# 🚀 Midstreamer Quick Start

## Installation & First Command (30 seconds)

```bash
# Install the package
npm install midstreamer

# Run your first command
npx midstreamer version
```

**Output:**
```
Midstream v0.2.3
WebAssembly-powered temporal analysis toolkit
```

✅ **That's it! You're ready to use midstreamer.**

---

## Why Use `npx`?

When you install a package locally with `npm install`, it goes into `./node_modules/`. 

**This WON'T work:**
```bash
midstreamer version  # ❌ command not found
```

**These WILL work:**
```bash
npx midstreamer version              # ✅ Use npx
./node_modules/.bin/midstreamer version  # ✅ Direct path
npm install -g midstreamer && midstreamer version  # ✅ Global install
```

**Best practice:** Use `npx` - it's simple and always works!

---

## Quick Examples

### 1. Benchmark Performance (5 seconds)
```bash
npx midstreamer benchmark
```

### 2. Compare Two Sequences (10 seconds)
```bash
npx midstreamer compare 1,2,3,4,5 1,2,4,3,5
```

### 3. Real-time Streaming (15 seconds)
```bash
echo "1,2,3,4,5,6,7,8,9,10" | npx midstreamer stream --reference "1,2,3"
```

### 4. See All Commands (5 seconds)
```bash
npx midstreamer help
```

---

## For System-Wide Use

If you want to use `midstreamer` without `npx`:

```bash
# Install globally
npm install -g midstreamer

# Now use it directly
midstreamer version
midstreamer benchmark
midstreamer help
```

---

## Common Use Cases

### Performance Testing
```bash
npx midstreamer benchmark --length 1000 --iterations 100
```

### File Comparison
```bash
npx midstreamer file data1.csv data2.csv
```

### Real-time Monitoring
```bash
tail -f sensor.log | npx midstreamer stream --window 100
```

### AgentDB Integration (AI-Powered)
```bash
npx midstreamer agentdb-store patterns.csv --namespace production
npx midstreamer agentdb-search "45,50,55,60" --limit 5
```

---

## Next Steps

- Read full documentation: `npx midstreamer help`
- Check out examples in `./node_modules/midstreamer/examples/`
- See [HOW_TO_USE.md](./HOW_TO_USE.md) for detailed guide

---

## Troubleshooting

**Q: Why "command not found"?**  
A: Use `npx midstreamer` instead of just `midstreamer`

**Q: How to avoid typing `npx`?**  
A: Install globally with `npm install -g midstreamer`

**Q: Can I add it to package.json scripts?**  
A: Yes! See [HOW_TO_USE.md](./HOW_TO_USE.md) for examples

---

**Ready to go!** Start with `npx midstreamer help` to see all available commands.
