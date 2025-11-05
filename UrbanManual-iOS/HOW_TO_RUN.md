# 🚀 How to Run Urban Manual iOS App

**3 ways to run the app, from easiest to most control**

---

## ⚡ Method 1: Quick Start (Easiest - 5 minutes)

### **What You Need:**
- Mac computer (or cloud Mac like MacinCloud)
- Xcode 16.0+ installed

### **Steps:**

1. **Navigate to project**
```bash
cd urban-manual/UrbanManual-iOS
```

2. **Run setup script**
```bash
./setup.sh
```

3. **Enter your Supabase credentials**
```
Supabase URL: https://your-project.supabase.co
Supabase Key: your-anon-key
```

4. **Open in Xcode** (script will ask)
```
Press 'y' to open Xcode
```

5. **Run the app**
```
In Xcode:
- Select scheme: UrbanManual
- Select device: iPhone 15 Pro
- Press ⌘R (or click Play button)
```

**That's it!** App launches in simulator 🎉

---

## 📱 Method 2: Open Package Directly (Recommended)

### **Swift Package Manager** (No Xcode project needed)

1. **Open Package.swift**
```bash
cd urban-manual/UrbanManual-iOS
open Package.swift
```

2. **Wait for Xcode to load**
   - Xcode opens
   - Resolves dependencies (Supabase SDK)
   - Creates scheme automatically

3. **Configure Supabase**

Edit `Core/Configuration.swift`:
```swift
static var supabaseURL: URL {
    URL(string: "https://YOUR_PROJECT.supabase.co")!
}

static var supabaseAnonKey: String {
    "YOUR_ANON_KEY"
}
```

4. **Select target and run**
```
Top bar: UrbanManual > iPhone 15 Pro
Press: ⌘R
```

**Done!** App runs 🚀

---

## 🏗️ Method 3: Create Full Xcode Project (Most Control)

### **For Traditional Xcode Workflow**

1. **Create New Project**
```
Xcode → File → New → Project
iOS → App
Product Name: UrbanManual
Interface: SwiftUI
Language: Swift
```

2. **Add Source Files**
```
Delete default files
Drag folders into Xcode:
- App/
- Core/
- Features/
- DesignSystem/

Check: "Copy items if needed"
Check: "Create groups"
```

3. **Add Dependencies**
```
File → Add Package Dependencies
URL: https://github.com/supabase/supabase-swift
Version: 2.0.0
Add to target: UrbanManual
```

4. **Configure**
```
Add Info.plist (already created)
Set deployment target: iOS 17.0
Set Swift version: 6.0
```

5. **Build & Run**
```
⌘R
```

---

## ☁️ Method 4: Cloud Build (No Mac Needed!)

### **Using GitHub Actions**

1. **Push code to GitHub** (already done ✅)

2. **View build in Actions tab**
```
https://github.com/avmlo/urban-manual/actions
```

3. **Download IPA** (when build completes)
```
Click on workflow run
Download artifacts
```

4. **Install on device**
```
Use TestFlight or install directly
```

---

## 🎯 Which Method Should You Use?

| Method | Time | Difficulty | Best For |
|--------|------|------------|----------|
| **Method 1: Setup Script** | 5 min | ⭐ Easy | First time |
| **Method 2: Open Package** | 3 min | ⭐⭐ Easy | Development |
| **Method 3: Full Project** | 10 min | ⭐⭐⭐ Medium | Full control |
| **Method 4: Cloud Build** | 2 min | ⭐ Easy | No Mac |

---

## 📋 Prerequisites Checklist

### For Local Development:

- [ ] macOS 15.0 or later
- [ ] Xcode 16.0 or later installed
- [ ] Apple Developer account (for device testing)
- [ ] Git installed
- [ ] Repository cloned

### For Cloud Development:

- [ ] MacinCloud or MacStadium account
- [ ] Remote Desktop installed (Windows/Linux)
- [ ] Apple Developer account
- [ ] Repository cloned on cloud Mac

---

## 🔧 Configuration Required

### Before First Run:

**1. Add Supabase Credentials**

Edit `Core/Configuration.swift`:
```swift
static var supabaseURL: URL {
    URL(string: "https://XXXXX.supabase.co")! // ← Replace
}

static var supabaseAnonKey: String {
    "eyJhbGci..." // ← Replace with your key
}
```

**Get credentials:**
- Go to https://supabase.com/dashboard
- Select your project
- Settings → API
- Copy URL and anon key

**2. (Optional) Enable Sign in with Apple**

In Xcode:
- Target → Signing & Capabilities
- Click "+ Capability"
- Add "Sign in with Apple"

---

## 🎮 Running the App

### Simulator (Default):

```
1. Select target: iPhone 15 Pro
2. Press ⌘R
3. Simulator launches with app
```

### Physical Device:

```
1. Connect iPhone via USB
2. Trust computer on device
3. Select your iPhone in Xcode
4. Press ⌘R
5. Trust developer on device (Settings → General → Device Management)
```

---

## 🐛 Troubleshooting

### "Cannot find 'Supabase' in scope"

**Cause:** Dependencies not resolved

**Fix:**
```
File → Packages → Resolve Package Versions
File → Packages → Update to Latest Package Versions
Clean Build Folder (⌘⇧K)
Build (⌘B)
```

### "No scheme found"

**Cause:** Xcode didn't create scheme

**Fix:**
```
Product → Scheme → Manage Schemes
Click "+" to add new scheme
Select target: UrbanManual
```

### "Signing requires a development team"

**Cause:** No Apple Developer account selected

**Fix:**
```
Target → Signing & Capabilities
Team: Select your team (or "Personal Team")
```

### "Module not found: SwiftUI"

**Cause:** Wrong deployment target

**Fix:**
```
Target → General
iOS Deployment Target: 17.0
```

### App crashes on launch

**Check:**
1. Supabase credentials are correct
2. Internet connection available
3. View Console (⌘⇧Y) for errors

---

## 📱 What You'll See

### Launch Flow:

1. **Splash Screen** → App icon
2. **Loading** → "Loading..." (checks auth)
3. **Welcome Screen** → Sign in options
   - OR -
4. **Main App** → Tab bar (if already signed in)

### Features to Test:

✅ Sign up with email
✅ Sign in with email
✅ Browse 897 destinations
✅ Search destinations
✅ View destination details
✅ Save/unsave destinations
✅ View map
✅ AI chat assistant
✅ Profile view
✅ Sign out

---

## 🚀 Quick Commands Reference

```bash
# Navigate to project
cd urban-manual/UrbanManual-iOS

# Run setup
./setup.sh

# Open in Xcode
open Package.swift

# Or create new project
# (then follow Method 3 steps)

# Build from command line
xcodebuild -scheme UrbanManual \
           -sdk iphonesimulator \
           -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
           build

# Run tests
xcodebuild test -scheme UrbanManual \
                -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Clean
xcodebuild clean
```

---

## 📚 Next Steps After Running

1. ✅ Test all features
2. ✅ Add real Supabase credentials
3. ✅ Test on physical device
4. ✅ Deploy to TestFlight
5. ✅ Gather feedback
6. ✅ Submit to App Store

---

## 🆘 Still Need Help?

### Documentation:
- `SETUP_GUIDE.md` - Detailed setup
- `BACKEND_INTEGRATION.md` - Backend configuration
- `PROJECT_SETUP.md` - Xcode project setup
- `README.md` - Project overview

### Support:
- GitHub Issues: https://github.com/avmlo/urban-manual/issues
- Email: dev@urbanmanual.co

---

**You're ready to run the app!** 🎉

Choose a method above and start developing!
