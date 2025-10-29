# 📦 Midstreamer Usage Guide

## ✅ Correct Usage

When you install midstreamer locally (npm install midstreamer), you must use 'npx' to run it:

```bash
npx midstreamer help
npx midstreamer version
npx midstreamer benchmark
```

## ❌ Common Error

```bash
midstreamer  # ❌ This won't work (command not found)
```

## 🔧 Why?

- Local npm packages are installed in ./node_modules/.bin/
- They're not added to your system PATH
- npx automatically finds and runs them

## 📦 Installation Options

### Option 1: Local (Recommended for projects)
```bash
npm install midstreamer
npx midstreamer help
```

### Option 2: Global (For system-wide use)
```bash
npm install -g midstreamer
midstreamer help  # Now this works\!
```

### Option 3: Direct npx (No installation needed)
```bash
npx midstreamer@latest help
```

## 🚀 Quick Examples

```bash
# Benchmark performance
npx midstreamer benchmark

# Compare sequences
npx midstreamer compare 1,2,3,4,5 1,2,4,3,5

# Real-time streaming
echo "1,2,3,4,5" | npx midstreamer stream --reference "1,2,3"

# Watch a file
npx midstreamer watch sensor.log --format json

# AgentDB integration
npx midstreamer agentdb-store data.csv
npx midstreamer agentdb-search "45,50,55"
```

