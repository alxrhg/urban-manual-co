# iOS Compatibility Checking

This directory contains tools and scripts to verify iOS compatibility for the Urban Manual project.

## Quick Check

Run the iOS compatibility checker:

```bash
npm run check:ios
```

This will verify:
- ✅ System requirements (Node.js, npm, Xcode, CocoaPods)
- ✅ Capacitor configuration
- ✅ iOS dependencies
- ✅ iOS project structure
- ✅ Build output readiness
- ✅ Native Swift app status

## Available iOS Scripts

```bash
# Check iOS compatibility
npm run check:ios

# Sync web build with iOS project (requires macOS)
npm run ios:sync

# Open iOS project in Xcode (requires macOS)
npm run ios:open
```

## Documentation

For complete iOS compatibility information, see:
- [`IOS_COMPATIBILITY_REPORT.md`](../IOS_COMPATIBILITY_REPORT.md) - Full compatibility report
- [`IOS_DEPLOYMENT_GUIDE.md`](../IOS_DEPLOYMENT_GUIDE.md) - Deployment instructions
- [`IOS_QUICK_START.md`](../IOS_QUICK_START.md) - Quick start guide
- [`ios-app/UrbanManual/README.md`](../ios-app/UrbanManual/README.md) - Native Swift app

## Understanding the Results

### ✅ Green (Success)
Everything is configured correctly and ready to use.

### ⚠️ Yellow (Warning)
Not critical, but recommended to address for optimal functionality.

### ❌ Red (Error)
Must be fixed before iOS development can proceed.

## Common Issues

### "Xcode not available"
- **Solution:** Install Xcode from the Mac App Store (macOS only)
- **Note:** This is expected on non-macOS systems

### "CocoaPods not installed"
- **Solution:** `sudo gem install cocoapods` (macOS only)
- **Note:** This is expected on non-macOS systems

### "Web directory does not exist"
- **Solution:** Run `npm run build` to generate web assets
- **Note:** This is a warning and only affects Capacitor-based deployment

## iOS Implementation Options

The project supports two iOS implementations:

1. **Capacitor-based** (`ios/` directory) - Hybrid web app wrapper
2. **Native SwiftUI** (`ios-app/UrbanManual/`) - Full native iOS app

See [`IOS_COMPATIBILITY_REPORT.md`](../IOS_COMPATIBILITY_REPORT.md) for detailed comparison and recommendations.

## Development on Non-macOS Systems

While iOS building requires macOS, you can:
- ✅ Run the compatibility checker
- ✅ Develop the web app that Capacitor wraps
- ✅ Develop the Swift code (with proper tooling)
- ✅ Review iOS configurations
- ❌ Cannot build or run iOS simulator
- ❌ Cannot deploy to iOS devices
- ❌ Cannot submit to App Store

## CI/CD Integration

The compatibility check can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Check iOS Compatibility
  run: npm run check:ios
```

For actual iOS builds, use a macOS runner with Xcode installed.
