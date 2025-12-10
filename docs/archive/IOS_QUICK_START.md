# iOS App - Quick Start Guide

## 🚀 Get Your iOS App Running in 5 Minutes

### Prerequisites
- macOS computer
- Xcode 15+ installed
- CocoaPods installed (`sudo gem install cocoapods`)

---

## Step 1: Build the Web App
```bash
cd /home/ubuntu/travel-guide
npm run build
```

## Step 2: Sync with iOS
```bash
npx cap sync ios
```

## Step 3: Open in Xcode
```bash
npx cap open ios
```

## Step 4: Run in Simulator
1. In Xcode, select a simulator (e.g., iPhone 15 Pro)
2. Click the Play button (▶️) or press `Cmd + R`
3. Your app will launch in the simulator!

---

## 📱 Test on Your iPhone

1. Connect iPhone via USB
2. Trust the computer on your iPhone
3. In Xcode:
   - Select your device from the device menu
   - Go to **Signing & Capabilities**
   - Check **Automatically manage signing**
   - Select your **Team** (Apple Developer account)
4. Click Play to build and run on your device

---

## 🔄 Making Changes

After updating your React code:

```bash
# 1. Build
npm run build

# 2. Sync
npx cap sync ios

# 3. Xcode will auto-reload, or press Cmd+R to rebuild
```

---

## 📦 What's Included

Your iOS app now has:
- ✅ Native status bar (beige theme)
- ✅ Splash screen (2-second display)
- ✅ Haptic feedback
- ✅ Keyboard management
- ✅ App state handling
- ✅ All your web features working natively!

---

## 🎯 Next Steps

1. **Test thoroughly** in simulator and device
2. **Customize app icons** (see full deployment guide)
3. **Create screenshots** for App Store
4. **Submit to App Store** (see full deployment guide)

---

## 📖 Full Documentation

See `IOS_DEPLOYMENT_GUIDE.md` for complete instructions on:
- Code signing
- App icons and splash screens
- App Store submission
- Troubleshooting
- And more!

---

## 🆘 Quick Troubleshooting

**Issue**: CocoaPods not found
```bash
sudo gem install cocoapods
pod setup
```

**Issue**: Code signing error
- Enable "Automatically manage signing" in Xcode
- Add your Apple ID in Xcode → Preferences → Accounts

**Issue**: White screen on launch
```bash
npm run build
npx cap sync ios
# Then rebuild in Xcode
```

---

## 🎉 That's It!

Your Travel Guide is now a native iOS app. Enjoy! 🚀

