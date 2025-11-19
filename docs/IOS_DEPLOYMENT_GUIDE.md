# iOS App Deployment Guide

## 🎉 Your Travel Guide is Now an iOS App!

Your React web app has been successfully converted into a native iOS app using Capacitor. This guide will help you build, test, and deploy it to the App Store.

---

## 📦 What's Included

### Capacitor Configuration
- **App ID**: `com.travelguide.app`
- **App Name**: Travel Guide
- **Platform**: iOS (with potential for Android)
- **Build Directory**: `dist/public`

### Native Features
✅ **Status Bar** - Styled to match your beige theme (#f5f1e8)
✅ **Splash Screen** - 2-second display with beige background
✅ **Haptic Feedback** - Touch feedback for better UX
✅ **Keyboard Management** - Auto-hide and listeners
✅ **App State Management** - Handle background/foreground
✅ **Deep Linking** - Support for custom URL schemes

### Installed Plugins
- `@capacitor/app` - App state and info
- `@capacitor/splash-screen` - Launch screen
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/haptics` - Vibration feedback
- `@capacitor/keyboard` - Keyboard control

---

## 🛠️ Prerequisites

### Required Software
1. **macOS** - iOS development requires a Mac
2. **Xcode 15+** - Download from Mac App Store
3. **CocoaPods** - Install with: `sudo gem install cocoapods`
4. **Apple Developer Account** - Required for App Store deployment

### Check Installation
```bash
# Check Xcode
xcodebuild -version

# Check CocoaPods
pod --version

# Check Node.js
node --version
```

---

## 🚀 Building the iOS App

### Step 1: Build the Web App
```bash
cd /home/ubuntu/travel-guide
npm run build
```

This creates the production build in `dist/public/`.

### Step 2: Sync with iOS Project
```bash
npx cap sync ios
```

This copies your web assets to the iOS project and updates native dependencies.

### Step 3: Open in Xcode
```bash
npx cap open ios
```

This opens the iOS project in Xcode.

---

## 📱 Testing on iOS

### Option 1: iOS Simulator
1. Open Xcode
2. Select a simulator device (e.g., iPhone 15 Pro)
3. Click the **Play** button (▶️) or press `Cmd + R`
4. The app will launch in the simulator

### Option 2: Physical Device
1. Connect your iPhone via USB
2. Trust the computer on your iPhone
3. In Xcode, select your device from the device menu
4. Click **Play** to build and run

**Note**: For physical devices, you need to configure code signing (see below).

---

## 🔐 Code Signing & Provisioning

### Automatic Signing (Recommended for Testing)
1. Open the project in Xcode
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (Apple Developer account)
6. Xcode will create a provisioning profile automatically

### Manual Signing (For Production)
1. Create an **App ID** in Apple Developer Portal
   - Go to: https://developer.apple.com/account/resources/identifiers
   - Click **+** to create new identifier
   - Select **App IDs** → **App**
   - Bundle ID: `com.travelguide.app`
   - Description: Travel Guide

2. Create a **Provisioning Profile**
   - Go to: https://developer.apple.com/account/resources/profiles
   - Click **+** to create new profile
   - Select **iOS App Development** or **App Store**
   - Select your App ID and certificates
   - Download and double-click to install

3. In Xcode:
   - Uncheck **Automatically manage signing**
   - Select your provisioning profile manually

---

## 🎨 Customizing App Icons & Splash Screen

### App Icons
1. Create app icons in these sizes:
   - 1024x1024 (App Store)
   - 180x180 (iPhone)
   - 120x120 (iPhone)
   - 87x87 (iPhone)
   - 60x60 (iPhone)
   - 40x40 (iPhone)
   - 29x29 (iPhone)

2. Add to Xcode:
   - Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Drag and drop your icons
   - Or use Xcode's asset catalog

**Tip**: Use a tool like [AppIcon.co](https://appicon.co) to generate all sizes from one image.

### Splash Screen
1. Create a splash screen image (2732x2732 recommended)
2. Replace `ios/App/App/Assets.xcassets/Splash.imageset/splash.png`
3. Or customize in Xcode's asset catalog

---

## 🏗️ Build Configuration

### Development Build
```bash
# Build for simulator/device testing
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath build
```

### Production Build
```bash
# Build for App Store submission
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -archivePath build/App.xcarchive \
  archive
```

---

## 📤 Submitting to App Store

### Step 1: Prepare App Store Connect
1. Go to: https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in app information:
   - **Platform**: iOS
   - **Name**: Travel Guide
   - **Primary Language**: English
   - **Bundle ID**: com.travelguide.app
   - **SKU**: travelguide001 (or any unique ID)

### Step 2: Archive the App
1. In Xcode, select **Any iOS Device** (not a simulator)
2. Go to **Product** → **Archive**
3. Wait for the archive to complete
4. The Organizer window will open

### Step 3: Upload to App Store Connect
1. In Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Choose **Upload**
5. Follow the prompts to upload

### Step 4: Complete App Store Listing
1. Go back to App Store Connect
2. Add screenshots (required sizes):
   - 6.7" Display (iPhone 15 Pro Max): 1290x2796
   - 6.5" Display (iPhone 11 Pro Max): 1242x2688
   - 5.5" Display (iPhone 8 Plus): 1242x2208
3. Write app description
4. Add keywords for search
5. Set pricing and availability
6. Submit for review

---

## 🔄 Updating the App

### After Making Changes to Web Code
```bash
# 1. Build web app
npm run build

# 2. Sync with iOS
npx cap sync ios

# 3. Open in Xcode (if needed)
npx cap open ios

# 4. Build and test
```

### Version Management
Update version numbers in:
1. `package.json` → `version`
2. Xcode → Target → General → Version & Build

**Tip**: Increment build number for each submission, version number for feature updates.

---

## 🐛 Troubleshooting

### Issue: "CocoaPods not installed"
```bash
sudo gem install cocoapods
pod setup
```

### Issue: "Code signing error"
- Ensure you're logged into Xcode with your Apple ID
- Go to Xcode → Preferences → Accounts
- Add your Apple Developer account

### Issue: "No provisioning profiles found"
- Enable **Automatically manage signing** in Xcode
- Or create profiles manually in Apple Developer Portal

### Issue: "Build failed - module not found"
```bash
# Clean and rebuild
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Issue: "App crashes on launch"
- Check Console.app for crash logs
- Verify all Capacitor plugins are properly installed
- Test in Safari Web Inspector (for web view debugging)

### Issue: "White screen on app launch"
- Ensure `dist/public` has all built files
- Run `npm run build` before `npx cap sync`
- Check that `index.html` exists in `dist/public`

---

## 📊 App Store Requirements

### Technical Requirements
- ✅ iOS 13.0+ support
- ✅ 64-bit architecture
- ✅ Privacy policy URL (required)
- ✅ Support URL (required)
- ✅ App icons (all sizes)
- ✅ Screenshots (all required sizes)

### Content Requirements
- ✅ Accurate app description
- ✅ Relevant keywords (max 100 characters)
- ✅ Age rating (complete questionnaire)
- ✅ Copyright information
- ✅ Privacy policy (especially for location features)

### Review Guidelines
- No crashes or bugs
- All features must work as described
- Must comply with Apple's Human Interface Guidelines
- Location permission must be clearly explained
- User data must be handled securely

---

## 🔒 Privacy & Permissions

Your app uses these permissions (already configured):

### Location (for Local Mode)
**Purpose**: "Find nearby travel destinations"
**When Used**: Only when user taps "Local Mode" button

Add to `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby travel destinations</string>
```

### Camera (if you add photo features later)
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your travel experiences</string>
```

---

## 📈 Analytics & Monitoring

### Recommended Tools
1. **Firebase** - Crashlytics and Analytics
2. **Sentry** - Error tracking
3. **TestFlight** - Beta testing
4. **App Store Connect** - Built-in analytics

### Adding Firebase (Optional)
```bash
pnpm add @capacitor-firebase/analytics
npx cap sync ios
```

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ Install Xcode and CocoaPods
2. ✅ Open project in Xcode: `npx cap open ios`
3. ✅ Test in simulator
4. ✅ Configure code signing
5. ✅ Test on physical device

### Before App Store Submission
1. ✅ Create app icons (all sizes)
2. ✅ Create splash screen
3. ✅ Take screenshots (all required sizes)
4. ✅ Write app description and keywords
5. ✅ Create privacy policy
6. ✅ Set up App Store Connect listing
7. ✅ Test thoroughly on multiple devices
8. ✅ Archive and upload to App Store Connect

### Post-Launch
1. Monitor crash reports
2. Respond to user reviews
3. Plan feature updates
4. Track analytics and user behavior

---

## 💡 Tips for Success

### Performance
- Optimize images for mobile
- Minimize bundle size
- Use lazy loading for routes
- Cache API responses

### User Experience
- Test on various iPhone models
- Support both portrait and landscape
- Handle offline scenarios gracefully
- Provide loading states

### App Store Optimization
- Use relevant keywords
- Create compelling screenshots
- Write clear, concise description
- Respond to user reviews promptly

---

## 📞 Support & Resources

### Official Documentation
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Apple Developer](https://developer.apple.com)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Community
- [Capacitor Discord](https://discord.gg/UPYYRhtyzp)
- [Ionic Forum](https://forum.ionicframework.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

### Your Project
- Web Version: https://your-vercel-url.vercel.app
- GitHub Repo: https://github.com/avmlo/urban-manual.git
- Supabase: https://avdnefdfwvpjkuanhdwk.supabase.co

---

## ✅ Checklist

### Development
- [x] Capacitor installed and configured
- [x] iOS platform added
- [x] Native features implemented
- [x] Build successful
- [ ] Tested in simulator
- [ ] Tested on physical device

### App Store Preparation
- [ ] App icons created (all sizes)
- [ ] Splash screen designed
- [ ] Screenshots captured (all sizes)
- [ ] App description written
- [ ] Keywords selected
- [ ] Privacy policy created
- [ ] Support URL set up
- [ ] Code signing configured
- [ ] App Store Connect listing created

### Submission
- [ ] Archive created
- [ ] Uploaded to App Store Connect
- [ ] Metadata completed
- [ ] Submitted for review
- [ ] Approved by Apple
- [ ] Released to App Store

---

## 🎊 Congratulations!

Your Travel Guide is now a native iOS app! Follow this guide to build, test, and deploy it to the App Store.

Good luck with your app launch! 🚀

