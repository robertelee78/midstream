# Scripts Directory

Organized collection of build, deployment, validation, and maintenance scripts for the Midstream project.

## Directory Structure

```
scripts/
├── README.md              # This file
├── install.sh             # Installation script
├── setup.sh               # Initial setup script
├── benchmarks/            # Performance benchmarking scripts
├── build/                 # Build automation scripts
├── fixes/                 # Bug fix and optimization scripts
├── publish/               # Publishing and deployment scripts
├── validation/            # Testing and validation scripts
└── archive/               # Deprecated/obsolete scripts
```

## Categories

### 📦 Installation & Setup
- **install.sh** - Install project dependencies and tools
- **setup.sh** - Initial project configuration

### 🔨 Build Scripts (`build/`)
Build automation and compilation scripts (empty - ready for future scripts).

### 📊 Benchmark Scripts (`benchmarks/`)
- **benchmark_comparison.sh** - Compare performance across versions
- **run_benchmarks.sh** - Execute comprehensive benchmark suite

### 🔧 Fixes & Optimization (`fixes/`)
- **fix-aimds-dependencies.sh** - Fix AIMDS dependency issues
- **fix-npm-critical.sh** - Fix critical NPM security issues
- **fix-npm-security.sh** - Fix NPM security vulnerabilities
- **optimize-aimds-build.sh** - Optimize AIMDS build process

### 🚀 Publishing Scripts (`publish/`)
- **publish_aimds.sh** - Publish AIMDS packages
- **publish_aimds_crates.sh** - Publish AIMDS crates to crates.io
- **publish_aimds_final.sh** - Final AIMDS publication
- **publish_fixed.sh** - Publish fixed versions
- **publish_midstream_crates.sh** - Publish Midstream crates
- **publish_midstreamer_crates.sh** - Publish Midstreamer crates
- **publish_remaining.sh** - Publish remaining packages
- **publish_simple.sh** - Simplified publishing script

### ✅ Validation Scripts (`validation/`)
- **validate-real-integration.ts** - TypeScript integration validation
- **validate_integration.sh** - Shell integration validation
- **verify-npm-optimization.sh** - Verify NPM optimization results

### 📦 Archive (`archive/`)
Deprecated or obsolete scripts kept for reference (empty).

## Usage

### Installation
```bash
# Run installation
./scripts/install.sh

# Run setup
./scripts/setup.sh
```

### Benchmarks
```bash
# Run all benchmarks
./scripts/benchmarks/run_benchmarks.sh

# Compare benchmark results
./scripts/benchmarks/benchmark_comparison.sh
```

### Fixes & Optimization
```bash
# Fix AIMDS dependencies
./scripts/fixes/fix-aimds-dependencies.sh

# Optimize AIMDS build
./scripts/fixes/optimize-aimds-build.sh

# Fix NPM security issues
./scripts/fixes/fix-npm-security.sh
```

### Publishing
```bash
# Publish AIMDS packages
./scripts/publish/publish_aimds_final.sh

# Publish crates to crates.io
./scripts/publish/publish_aimds_crates.sh
```

### Validation
```bash
# Validate integration
./scripts/validation/validate_integration.sh

# Validate real integration (TypeScript)
ts-node scripts/validation/validate-real-integration.ts

# Verify NPM optimization
./scripts/validation/verify-npm-optimization.sh
```

## Best Practices

### Script Organization
- Place new scripts in appropriate category directories
- Use descriptive names (verb-noun pattern)
- Add execute permissions: `chmod +x script.sh`
- Document parameters and usage in script header

### Script Headers
Every script should include:
```bash
#!/bin/bash
# Script Name: script_name.sh
# Description: What this script does
# Usage: ./script_name.sh [options]
# Author: Team/Author name
# Date: YYYY-MM-DD
```

### Error Handling
- Use `set -e` to exit on errors
- Add proper error messages
- Validate prerequisites
- Clean up on exit

### Adding New Scripts

1. Create script in appropriate category:
   ```bash
   touch scripts/category/new-script.sh
   chmod +x scripts/category/new-script.sh
   ```

2. Add script header and documentation

3. Update this README with description

4. Test thoroughly before committing

## Deprecated Scripts

Scripts that are no longer needed should be:
1. Moved to `archive/` directory
2. Documented in this README under "Archive" section
3. Kept for reference but not actively maintained

## Related Documentation

- [Build Documentation](../docs/aimds/implementation/)
- [Testing Documentation](../docs/testing/)
- [Release Documentation](../docs/releases/)
- [Performance Benchmarks](../docs/performance/)

## Support

For issues or questions about scripts:
- Check script header comments for usage
- Review related documentation
- Open an issue on GitHub

---

**Last Updated:** 2025-10-29
**Total Scripts:** 18 (8 publishing, 4 fixes, 3 validation, 2 benchmarks, 1 setup)
