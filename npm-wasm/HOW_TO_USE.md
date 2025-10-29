# How to Make Midstreamer Work - Complete Guide

## 🎯 The Issue You're Seeing

When you run `npm install midstreamer`, you get:
```bash
midstreamer
# bash: midstreamer: command not found
```

This is **NORMAL** for locally installed npm packages!

## ✅ Solution: Three Options

### Option 1: Use npx (Recommended for Most Users)

```bash
npm install midstreamer

# Use npx to run it
npx midstreamer help
npx midstreamer benchmark
npx midstreamer stream
```

**Why npx?**
- Works immediately after local install
- No PATH configuration needed
- Always uses the project's version

### Option 2: Install Globally (For System-Wide Access)

```bash
# Install globally
npm install -g midstreamer

# Now you can use it without npx
midstreamer help
midstreamer benchmark
midstreamer stream
```

**When to use global install:**
- You want to use it as a system tool
- You use it across multiple projects
- You prefer shorter commands

### Option 3: Add to package.json Scripts

```json
{
  "scripts": {
    "analyze": "midstreamer stream --reference 1,2,3",
    "benchmark": "midstreamer benchmark"
  }
}
```

Then run:
```bash
npm run analyze
npm run benchmark
```

## 🔧 How It Works

### The bin Configuration (Already Correct)

In `package.json`:
```json
{
  "bin": {
    "midstreamer": "./cli.js"
  }
}
```

This tells npm to:
1. **Local install** → Create link in `./node_modules/.bin/midstreamer`
2. **Global install** → Create link in system PATH (e.g., `/usr/local/bin/midstreamer`)

### Local vs Global Install

**Local Install:**
```
npm install midstreamer
→ Creates: ./node_modules/.bin/midstreamer
→ Use with: npx midstreamer
```

**Global Install:**
```
npm install -g midstreamer
→ Creates: /usr/local/bin/midstreamer (or similar)
→ Use with: midstreamer (added to PATH)
```

## 📝 Quick Reference

| Installation Method | How to Run | Best For |
|---------------------|------------|----------|
| `npm install midstreamer` | `npx midstreamer help` | Project-specific use |
| `npm install -g midstreamer` | `midstreamer help` | System-wide tool |
| Package.json script | `npm run <script>` | CI/CD, team projects |

## 🚀 Examples

### Using npx (After local install)
```bash
npm install midstreamer

npx midstreamer version
npx midstreamer benchmark
npx midstreamer compare 1,2,3,4,5 1,2,4,3,5
echo "1,2,3" | npx midstreamer stream --reference "1,2,3"
npx midstreamer watch sensor.log
npx midstreamer agentdb-store data.csv
```

### Using global install
```bash
npm install -g midstreamer

midstreamer version
midstreamer benchmark
midstreamer compare 1,2,3,4,5 1,2,4,3,5
echo "1,2,3" | midstreamer stream --reference "1,2,3"
```

### Using package.json scripts
```json
{
  "scripts": {
    "test:performance": "midstreamer benchmark",
    "analyze:stream": "midstreamer stream --window 100",
    "watch:logs": "midstreamer watch logs/sensor.log --format json"
  }
}
```

```bash
npm run test:performance
npm run analyze:stream
npm run watch:logs
```

## 🐛 Troubleshooting

### "command not found" after local install
✅ **Solution**: Use `npx midstreamer` instead of `midstreamer`

### "command not found" after global install
❌ **Problem**: Global install failed or PATH not configured

✅ **Solution**:
```bash
# Check if globally installed
npm list -g midstreamer

# Check global bin directory
npm bin -g

# Ensure PATH includes npm global bin
echo $PATH | grep -o "$(npm bin -g)"
```

### Permission errors on global install
✅ **Solution**: Use sudo (Linux/Mac) or run as administrator (Windows)
```bash
sudo npm install -g midstreamer
```

## 🎯 Recommended Approach

**For development projects:**
```bash
npm install midstreamer
# Add to package.json scripts
# Use with npx or npm run
```

**For personal use/tooling:**
```bash
npm install -g midstreamer
# Use directly from command line
```

**For CI/CD:**
```bash
npm install midstreamer
# Use in package.json scripts
# CI runs: npm run <script>
```

## 📚 More Examples

### Real-time streaming
```bash
# Generate random data and analyze
node -e "setInterval(() => console.log(Math.random()), 100)" | npx midstreamer stream

# Monitor system metrics
tail -f /var/log/system.log | npx midstreamer stream --format json
```

### File analysis
```bash
# Compare two CSV files
npx midstreamer file data1.csv data2.csv --format json

# Benchmark with custom parameters
npx midstreamer benchmark --length 1000 --iterations 100
```

### AgentDB integration
```bash
# Store patterns in semantic database
npx midstreamer agentdb-store sensor-data.csv --namespace production

# Search for similar patterns
npx midstreamer agentdb-search "45,50,55,60,65" --limit 10

# Auto-tune parameters with RL
npx midstreamer agentdb-tune --auto --interval 5000
```

---

**Bottom Line**: The package is configured correctly. You just need to use `npx` for local installs or install it globally!
