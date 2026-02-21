# Publishing Guide

## Pre-Publishing Checklist

- [x] Clean repository (removed unused dependencies, debug logs)
- [x] Comprehensive README.md
- [x] Examples for all features
- [x] Test framework set up
- [x] Package.json configured for npm
- [x] .npmignore configured
- [x] .gitignore configured
- [x] Version set to 0.1.0-alpha

## Publishing Steps

### 1. Build the project

```bash
npm run build
```

This will compile TypeScript to JavaScript in the `dist/` directory.

### 2. Run tests (optional but recommended)

```bash
npm test
```

### 3. Verify package contents

Check that `dist/` contains all compiled files:
- `dist/synqra.js`
- `dist/synqra.d.ts`
- `dist/core/*.js`
- `dist/adapters/*.js`
- etc.

### 4. Publish to npm

```bash
npm publish --tag alpha
```

The `--tag alpha` flag publishes it as a pre-release version, so users need to explicitly install with:
```bash
npm install synqra@alpha
```

### 5. Verify publication

Check npm registry:
```bash
npm view synqra versions
npm view synqra@alpha
```

## Post-Publishing

1. Create a GitHub release with the changelog
2. Update documentation if needed
3. Monitor for issues and feedback

## Version Bumping

For future releases:
- `npm version patch` - for bug fixes (0.1.0-alpha -> 0.1.1-alpha)
- `npm version minor` - for new features (0.1.0-alpha -> 0.2.0-alpha)
- `npm version major` - for breaking changes (0.1.0-alpha -> 1.0.0)

Then publish with:
```bash
npm publish --tag alpha
```

## Stable Release

When ready for stable release:
1. Remove `-alpha` suffix from version
2. Publish without `--tag alpha`:
   ```bash
   npm publish
   ```
