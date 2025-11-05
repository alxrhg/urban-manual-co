# Urban Manual iOS - Project Setup

## Quick Start

### Prerequisites
- macOS 15.0+
- Xcode 16.0+
- Apple Developer Account

### Setup Steps

#### 1. Open in Xcode

Since this is a Swift Package Manager project, you can open it directly:

```bash
cd UrbanManual-iOS
open Package.swift
```

Or create a new Xcode project and add files manually (see below).

#### 2. Create Xcode Project (If Needed)

If you need a full `.xcodeproj`:

1. **Open Xcode**
2. **File → New → Project**
3. **iOS → App**
4. **Configure:**
   - Product Name: `UrbanManual`
   - Team: Your team
   - Organization Identifier: `co.urbanmanual`
   - Bundle ID: `co.urbanmanual.UrbanManual`
   - Interface: SwiftUI
   - Language: Swift
   - Storage: None

5. **Save in:** `urban-manual/UrbanManual-iOS/`

6. **Add Files:**
   - Delete default files (ContentView.swift, etc.)
   - Drag folders into project:
     - App/
     - Core/
     - Features/
     - DesignSystem/
   - Check "Copy items if needed"
   - Check "Create groups"

7. **Add Dependencies:**
   - File → Add Package Dependencies
   - URL: `https://github.com/supabase/supabase-swift`
   - Version: 2.0.0
   - Add to target

8. **Configure Info.plist:**
   - Add your Supabase credentials (see Info.plist)

9. **Build Settings:**
   - iOS Deployment Target: 17.0
   - Swift Language Version: 6.0

#### 3. Configure Supabase

Edit `Info.plist` or `Core/Configuration.swift`:

```swift
static var supabaseURL: URL {
    URL(string: "https://YOUR_PROJECT.supabase.co")!
}

static var supabaseAnonKey: String {
    "YOUR_ANON_KEY"
}
```

#### 4. Run

```
⌘R (or Product → Run)
Select: iPhone 15 Pro Simulator
```

---

## File Structure

```
UrbanManual-iOS/
├── Package.swift              ← Swift Package Manager manifest
├── Info.plist                 ← App configuration
├── App/                       ← App entry point
│   ├── UrbanManualApp.swift  ← Main app
│   └── MainTabView.swift      ← Tab navigation
├── Core/                      ← Core infrastructure
├── Features/                  ← Feature modules
├── DesignSystem/             ← Reusable UI
└── Resources/                ← Assets (create if needed)
```

---

## Running the App

### Option A: Swift Package Manager

```bash
# Open as SPM package
open Package.swift
```

### Option B: Xcode Project

```bash
# If you created .xcodeproj
open UrbanManual.xcodeproj
```

### Option C: Xcode Workspace (with CocoaPods)

```bash
# If using CocoaPods
open UrbanManual.xcworkspace
```

---

## Building

### Simulator

```bash
xcodebuild -scheme UrbanManual \
           -sdk iphonesimulator \
           -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
           build
```

### Physical Device

```bash
xcodebuild -scheme UrbanManual \
           -sdk iphoneos \
           -configuration Release \
           archive
```

---

## Troubleshooting

### "Cannot find 'Supabase' in scope"

**Solution:** Add Supabase package
```
File → Add Package Dependencies
https://github.com/supabase/supabase-swift
```

### "No such module 'SwiftUI'"

**Solution:** Check deployment target
```
Build Settings → iOS Deployment Target → 17.0
```

### Missing .xcodeproj file

**Solution:** Create new project (see steps above)

---

## Alternative: Using SPM Directly

This project uses Swift Package Manager. You can:

1. **Open Package.swift in Xcode**
2. Xcode will automatically:
   - Resolve dependencies
   - Create build scheme
   - Enable running

---

## Next Steps

1. ✅ Open in Xcode
2. ✅ Add Supabase credentials
3. ✅ Run on simulator
4. ✅ Test features
5. ✅ Deploy to TestFlight

---

**Ready to build!** 🚀
