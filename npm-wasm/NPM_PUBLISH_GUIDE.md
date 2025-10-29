# Publishing midstreamer to npm

This guide explains how to publish the `midstreamer` WebAssembly package to npm.

## Pre-Publication Checklist

✅ **Package renamed** from "midstream" to "midstreamer" (avoiding name conflict)
✅ **All WASM targets built**: web, nodejs, bundler
✅ **CLI tested** and working with all commands
✅ **package.json configured** with correct entry points and bin
✅ **README.md created** with comprehensive documentation
✅ **Files array updated** to include all necessary artifacts

## Package Details

- **Name**: midstreamer
- **Version**: 0.1.0
- **Description**: WebAssembly-powered temporal analysis toolkit
- **License**: MIT
- **Repository**: https://github.com/ruvnet/midstream

## Package Contents

The published package will include:

```
midstreamer/
├── cli.js                          # CLI entry point (npx midstreamer)
├── README.md                       # Package documentation
├── package.json                    # Package metadata
├── pkg/                            # Web target (ES modules)
│   ├── midstream_wasm.js
│   ├── midstream_wasm.d.ts
│   └── midstream_wasm_bg.wasm
├── pkg-node/                       # Node.js target (CommonJS)
│   ├── midstream_wasm.js
│   ├── midstream_wasm.d.ts
│   └── midstream_wasm_bg.wasm
├── pkg-bundler/                    # Bundler target (ES modules)
│   ├── midstream_wasm.js
│   ├── midstream_wasm.d.ts
│   └── midstream_wasm_bg.wasm
└── dist/                           # Webpack bundle
    └── index.js
```

## Publishing Steps

### 1. Verify Build

```bash
cd /workspaces/midstream/npm-wasm

# Ensure all WASM targets are built
npm run build

# Verify CLI works
./cli.js version
./cli.js help
./cli.js benchmark
```

### 2. Login to npm

```bash
npm login
# Enter your npm username, password, and email
```

### 3. Publish to npm

```bash
# Publish with public access (required for scoped or new packages)
npm publish --access public

# Or use dry-run first to see what would be published
npm publish --dry-run
```

### 4. Verify Publication

```bash
# Check the package is live
npm view midstreamer

# Test installation in a clean directory
cd /tmp
mkdir test-midstreamer && cd test-midstreamer
npm init -y
npm install midstreamer

# Test the installed package
npx midstreamer version
```

## Expected Output After Publishing

```bash
$ npm publish --access public

npm notice
npm notice 📦  midstreamer@0.1.0
npm notice === Tarball Contents ===
npm notice 1.1kB   package.json
npm notice 7.3kB   README.md
npm notice 3.4kB   cli.js
npm notice 45.2kB  pkg/midstream_wasm_bg.wasm
npm notice 1.2kB   pkg/midstream_wasm.js
npm notice 856B    pkg/midstream_wasm.d.ts
npm notice 45.2kB  pkg-node/midstream_wasm_bg.wasm
npm notice 1.3kB   pkg-node/midstream_wasm.js
npm notice 856B    pkg-node/midstream_wasm.d.ts
npm notice 45.2kB  pkg-bundler/midstream_wasm_bg.wasm
npm notice 1.2kB   pkg-bundler/midstream_wasm.js
npm notice 856B    pkg-bundler/midstream_wasm.d.ts
npm notice === Tarball Details ===
npm notice name:          midstreamer
npm notice version:       0.1.0
npm notice filename:      midstreamer-0.1.0.tgz
npm notice package size:  52.1 kB
npm notice unpacked size: 153.7 kB
npm notice shasum:        [sha]
npm notice integrity:     [integrity]
npm notice total files:   13
npm notice
npm notice Publishing to https://registry.npmjs.org/
+ midstreamer@0.1.0
```

## Post-Publication

### Update Documentation

After publishing, update the following files:

1. `/workspaces/midstream/README.md` - Update npm badge and installation command
2. `/workspaces/midstream/PUBLICATION_SUCCESS.md` - Mark npm package as published
3. GitHub repository description - Add "Available on npm"

### Add npm Badge

Add this badge to README files:

```markdown
[![npm version](https://img.shields.io/npm/v/midstreamer.svg)](https://www.npmjs.com/package/midstreamer)
```

### Monitor Package

- **npm page**: https://www.npmjs.com/package/midstreamer
- **Download stats**: `npm info midstreamer`
- **Version check**: `npm view midstreamer version`

## Updating the Package

For future updates:

1. Update version in `package.json` (use semantic versioning)
2. Rebuild WASM targets: `npm run build`
3. Test CLI: `./cli.js version`
4. Publish: `npm publish`

### Versioning Guide

- **Patch** (0.1.X): Bug fixes, no new features
- **Minor** (0.X.0): New features, backward compatible
- **Major** (X.0.0): Breaking changes

## Troubleshooting

### Issue: "Package name already exists"

If you get this error, the package name is taken. We already changed from "midstream" to "midstreamer" to avoid this.

### Issue: "Authentication required"

Run `npm login` and enter your credentials.

### Issue: "Missing files in tarball"

Check the `files` array in package.json includes all necessary directories.

### Issue: "WASM file not loading"

Ensure all three WASM targets (pkg, pkg-node, pkg-bundler) are built before publishing.

## Links

- **npm Registry**: https://www.npmjs.com/
- **Package Documentation**: https://docs.npmjs.com/cli/v8/commands/npm-publish
- **Semantic Versioning**: https://semver.org/

---

**Ready to publish!** Just run `npm login` and `npm publish --access public` from the `/workspaces/midstream/npm-wasm` directory.
