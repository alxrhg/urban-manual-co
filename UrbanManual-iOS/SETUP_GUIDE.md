# Urban Manual iOS - Setup Guide

**Quick start guide for development**

---

## 📋 Prerequisites

- macOS 15.0 or later
- Xcode 16.0 or later (for iOS 26 support)
- Apple Developer Account (for device testing)
- Supabase account with Urban Manual project

---

## 🚀 Quick Setup (5 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/avmlo/urban-manual.git
cd urban-manual/UrbanManual-iOS
```

### 2. Install Dependencies

The app uses Swift Package Manager. Dependencies will be fetched automatically when you open the project.

**Dependencies:**
- Supabase Swift SDK 2.0+

### 3. Configure Supabase

Create or edit `Core/Configuration.swift`:

```swift
enum Configuration {
    static var supabaseURL: URL {
        URL(string: "https://YOUR_PROJECT.supabase.co")!
    }

    static var supabaseAnonKey: String {
        "YOUR_ANON_KEY_HERE"
    }
}
```

**Get your credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon public" key

### 4. Enable Sign in with Apple

**In Xcode:**
1. Select project target
2. Signing & Capabilities tab
3. Click "+ Capability"
4. Add "Sign in with Apple"

**In Supabase:**
1. Dashboard → Authentication → Providers
2. Enable "Apple"
3. Add bundle ID: `co.urbanmanual.ios`
4. Save

### 5. Build and Run

1. Open `UrbanManual.xcodeproj` in Xcode
2. Select target device (iPhone 15 Pro recommended)
3. Press ⌘R to build and run

---

## 🔧 Project Structure

```
UrbanManual-iOS/
├── App/                        # App entry point
│   ├── UrbanManualApp.swift   # Main app
│   └── MainTabView.swift       # Tab bar
├── Core/                       # Infrastructure
│   ├── Configuration.swift     # App config
│   ├── Supabase/              # Supabase client
│   ├── Authentication/         # Auth manager
│   ├── Storage/               # Image cache
│   ├── Network/               # Network client
│   └── AI/                    # AI service
├── Features/                   # Feature modules
│   ├── Authentication/         # Login, signup
│   ├── Destinations/          # Browse, detail
│   ├── Collections/           # Saved, lists
│   ├── Map/                   # Map view
│   ├── Profile/               # User profile
│   └── AI/                    # AI chat
├── DesignSystem/              # Design system
│   ├── Theme/                 # Colors, fonts, spacing
│   └── Components/            # Reusable components
└── Resources/                 # Assets
```

---

## 🧪 Testing

### Run Unit Tests

```bash
xcodebuild test \
  -scheme UrbanManual \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Run UI Tests

```bash
xcodebuild test \
  -scheme UrbanManualUITests \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

---

## 🐛 Troubleshooting

### Build Errors

**Error: Cannot find 'Supabase' in scope**

Solution: Wait for SPM to download dependencies
1. File → Packages → Update to Latest Package Versions
2. Clean Build Folder (⌘⇧K)
3. Build (⌘B)

**Error: Invalid Supabase URL**

Solution: Check Configuration.swift has valid URL

**Error: Sign in with Apple not working**

Solution:
1. Verify capability is enabled in Xcode
2. Check bundle ID matches Apple Developer Portal
3. Verify Supabase Apple provider is configured

### Runtime Errors

**App crashes on launch**

Check:
1. Supabase URL and key are correct
2. Internet connection is available
3. Console for detailed error messages

**Authentication fails**

Check:
1. Email/password are correct
2. User exists in Supabase Auth
3. Sign in with Apple is configured correctly

**No destinations showing**

Check:
1. Supabase database has destinations table
2. Table has data
3. Network requests are succeeding (check logs)

---

## 📱 Device Testing

### TestFlight

1. Archive app (Product → Archive)
2. Upload to App Store Connect
3. Add to TestFlight
4. Invite testers via email

### Physical Device

1. Connect iPhone via USB
2. Select device in Xcode
3. Trust certificate on device (Settings → General → Device Management)
4. Build and run (⌘R)

---

## 🔐 Environment Variables

For production, use environment variables instead of hardcoding:

**In Xcode:**
1. Edit Scheme → Run → Arguments
2. Add Environment Variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your anon key

**In Configuration.swift:**
```swift
static var supabaseURL: URL {
    if let urlString = ProcessInfo.processInfo.environment["SUPABASE_URL"],
       let url = URL(string: urlString) {
        return url
    }
    return URL(string: "https://default.supabase.co")!
}
```

---

## 📊 Performance Tips

### 1. Enable Debug Performance

In Xcode:
- Debug → View Debugging → Show FPS
- Instrument → Time Profiler

### 2. Monitor Memory

- Debug Navigator → Memory
- Watch for leaks with Instruments

### 3. Network Performance

- Network Link Conditioner (Xcode → Open Developer Tool)
- Test on slow connections

---

## 🚀 Deploy to App Store

### 1. Prepare Build

1. Update version in project settings
2. Update build number
3. Archive build (Product → Archive)

### 2. App Store Connect

1. Go to appstoreconnect.apple.com
2. Create new app
3. Upload build
4. Fill metadata:
   - Screenshots (all device sizes)
   - Description
   - Keywords
   - Privacy policy URL

### 3. Submit for Review

1. Select build
2. Add test notes for reviewers
3. Submit

**Review time**: 1-3 days typically

---

## 📚 Additional Resources

- [iOS 26 Documentation](https://developer.apple.com/documentation/ios)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

## 🆘 Support

- **Issues**: Open GitHub issue
- **Email**: dev@urbanmanual.co
- **Slack**: #ios-dev channel

---

**Happy coding!** 🎉
