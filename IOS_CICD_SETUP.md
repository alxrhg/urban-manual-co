# iOS CI/CD Setup Guide - GitHub Actions

This guide will help you set up automatic iOS builds using GitHub Actions - creating a **Vercel-like experience** for your iOS app development.

## 🎯 What This Does

When you push code to GitHub:
- ✅ Automatically builds your Next.js web app
- ✅ Syncs with Capacitor iOS
- ✅ Builds the iOS app with Xcode
- ✅ Optionally uploads to TestFlight for beta testing
- ✅ Stores build artifacts for download

## 📋 Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enrollment at https://developer.apple.com

2. **App Store Connect Access**
   - Access to https://appstoreconnect.apple.com

3. **Mac with Xcode** (for initial setup)
   - Xcode 14+ installed
   - Command Line Tools installed

4. **Fastlane Installed Locally**
   ```bash
   cd ios/App
   bundle install
   ```

## 🔐 Step 1: Setup Code Signing with Match

Fastlane Match stores your certificates and provisioning profiles in a private Git repository, making it easy to share across CI/CD and team members.

### 1.1 Create a Private Git Repository for Certificates

Create a **new private repository** on GitHub (e.g., `ios-certificates`).

### 1.2 Initialize Match

```bash
cd ios/App
fastlane match init
```

Choose **git** as the storage mode and enter your certificates repository URL.

### 1.3 Generate Certificates

```bash
# For App Store distribution
fastlane match appstore

# For development (optional)
fastlane match development
```

This will:
- Generate certificates and provisioning profiles
- Encrypt and store them in your certificates repo
- Save the encryption password (you'll need this for CI/CD)

## 🔑 Step 2: Create App Store Connect API Key

This allows GitHub Actions to upload to TestFlight without 2FA prompts.

### 2.1 Generate API Key

1. Go to https://appstoreconnect.apple.com/access/api
2. Click **Keys** → **Generate API Key** or **+**
3. Set **Name**: "GitHub Actions CI/CD"
4. Set **Access**: **App Manager**
5. Click **Generate**

### 2.2 Download the Key

- Download the `.p8` file (you can only do this once!)
- Note the **Key ID** (e.g., `AB12CD34EF`)
- Note the **Issuer ID** (e.g., `12345678-1234-1234-1234-123456789012`)

### 2.3 Convert .p8 to Base64

```bash
base64 -i AuthKey_AB12CD34EF.p8 | pbcopy
```

This copies the base64-encoded key to your clipboard.

## 🔧 Step 3: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

### Required Secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API |
| `FASTLANE_USER` | Your Apple ID email | Your Apple Developer Account |
| `FASTLANE_TEAM_ID` | Your Team ID | https://developer.apple.com/account → Membership |
| `MATCH_PASSWORD` | Match encryption password | Password you set during `fastlane match init` |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Git auth token | See below |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID | From Step 2.2 (e.g., `AB12CD34EF`) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | API Issuer ID | From Step 2.2 |
| `APP_STORE_CONNECT_API_KEY` | Base64 API Key | From Step 2.3 |

### Optional Secrets:

| Secret Name | Value | Used For |
|-------------|-------|----------|
| `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` | App-specific password | 2FA accounts (alternative to API key) |
| `FASTLANE_ITC_TEAM_ID` | App Store Connect Team ID | If different from Developer Portal |

### Generating MATCH_GIT_BASIC_AUTHORIZATION:

```bash
echo -n "your-github-username:your-personal-access-token" | base64
```

To create a Personal Access Token:
1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Set scope: `repo` (full control)
4. Copy the token and use it in the command above

## 🚀 Step 4: Update Fastlane Configuration

### 4.1 Update Team ID

Edit `ios/App/fastlane/Appfile`:

```ruby
apple_id(ENV["FASTLANE_USER"])
app_identifier("com.travelguide.app")
team_id(ENV["FASTLANE_TEAM_ID"])
itc_team_id(ENV["FASTLANE_ITC_TEAM_ID"] || ENV["FASTLANE_TEAM_ID"])
```

### 4.2 Update Apple ID in Fastfile

Edit `ios/App/fastlane/Fastfile` and find the `beta` lane:

```ruby
lane :beta do
  build
  upload_to_testflight(
    skip_waiting_for_build_processing: true,
    apple_id: "YOUR_APP_APPLE_ID", # Get this from App Store Connect
    app_identifier: "com.travelguide.app",
    ipa: "./build/TravelGuide.ipa"
  )
end
```

To find your **Apple ID** (numeric app ID):
1. Go to https://appstoreconnect.apple.com
2. Go to **My Apps** → Select your app
3. Check the URL: `https://appstoreconnect.apple.com/apps/{APPLE_ID}/`

## 📱 Step 5: Configure Your iOS App in Xcode

### 5.1 Set Bundle Identifier

Open Xcode:
```bash
cd ios/App
open App.xcworkspace
```

1. Select **App** target
2. Go to **Signing & Capabilities**
3. Set **Bundle Identifier**: `com.travelguide.app`
4. Uncheck **Automatically manage signing**
5. Select **Provisioning Profile**: `match AppStore com.travelguide.app`

### 5.2 Set Team

1. Set **Team** to your Apple Developer Team
2. Verify the provisioning profile matches

## ✅ Step 6: Test Locally

Before pushing to GitHub, test the build locally:

```bash
# Build Next.js
pnpm build

# Sync Capacitor
npx cap sync ios

# Build with Fastlane
cd ios/App
bundle install
bundle exec fastlane build
```

If successful, you should see:
```
✅ Successfully exported and signed the ipa file
```

## 🎬 Step 7: Trigger Your First Build

### Option A: Push to Main Branch

Pushing to `main` will automatically:
1. Build the iOS app
2. Upload to TestFlight (if all secrets are configured)

```bash
git add .
git commit -m "feat: setup iOS CI/CD with GitHub Actions"
git push origin main
```

### Option B: Manual Trigger

1. Go to GitHub → **Actions** tab
2. Select **iOS Build & Deploy** workflow
3. Click **Run workflow**
4. Toggle **Deploy to TestFlight** if desired
5. Click **Run workflow**

## 📊 Monitor Build Progress

1. Go to GitHub → **Actions** tab
2. Click on the running workflow
3. Watch the build steps in real-time
4. Download build artifacts if needed

## 🔄 Workflow Triggers

The workflow runs on:

- **Push to `main`**: Full build + TestFlight upload
- **Push to `develop`**: Build only (no TestFlight)
- **Pull Requests to `main`**: Build only (verify changes)
- **Manual Trigger**: Build with optional TestFlight deployment

## 📦 Build Artifacts

After each build, GitHub stores:
- `.ipa` file (iOS app package)
- Build logs
- Xcode build output

Available for **7 days** under **Actions** → **Workflow Run** → **Artifacts**

## 🎯 Vercel-Like Features

| Feature | Vercel (Web) | This Setup (iOS) |
|---------|--------------|------------------|
| **Auto Deploy on Push** | ✅ Yes | ✅ Yes (to TestFlight) |
| **Preview Builds** | ✅ Yes (on PRs) | ✅ Yes (build artifacts) |
| **Build Logs** | ✅ Real-time | ✅ Real-time |
| **Environment Secrets** | ✅ Yes | ✅ Yes (GitHub Secrets) |
| **Custom Domains** | ✅ Yes | N/A (App Store) |
| **Analytics** | ✅ Yes | Via App Store Connect |

## 🛠️ Common Commands

```bash
# Build iOS app locally
cd ios/App && bundle exec fastlane build

# Upload to TestFlight locally
cd ios/App && bundle exec fastlane beta

# Update certificates
cd ios/App && bundle exec fastlane match appstore --force

# Bump version (patch)
cd ios/App && bundle exec fastlane bump_version type:patch

# Bump version (minor)
cd ios/App && bundle exec fastlane bump_version type:minor

# Bump version (major)
cd ios/App && bundle exec fastlane bump_version type:major

# Register new device
cd ios/App && bundle exec fastlane register_device name:"John's iPhone" udid:"00000000-0000000000000000"
```

## 🐛 Troubleshooting

### Build Fails with "No matching provisioning profiles"

```bash
# Update certificates
cd ios/App
bundle exec fastlane match appstore --readonly
```

### "Invalid API Key" Error

- Verify `APP_STORE_CONNECT_API_KEY` is correctly base64-encoded
- Check `APP_STORE_CONNECT_API_KEY_ID` matches your API key
- Ensure API key has **App Manager** role

### GitHub Actions Fails at "Setup iOS certificates"

- Check `MATCH_PASSWORD` secret is correct
- Verify `MATCH_GIT_BASIC_AUTHORIZATION` has access to your certificates repo
- Ensure certificates repo is accessible

### "Could not find version number"

Make sure your Xcode project has a valid `CURRENT_PROJECT_VERSION` set:
1. Open Xcode
2. Select **App** target
3. Go to **Build Settings**
4. Search for **Current Project Version**
5. Set a value (e.g., `1`)

## 🔐 Security Best Practices

1. **Never commit secrets** to your repository
2. **Use GitHub Secrets** for all sensitive data
3. **Rotate API keys** regularly
4. **Limit API key permissions** to App Manager only
5. **Use a separate certificates repo** with restricted access
6. **Enable branch protection** on `main`

## 📚 Additional Resources

- [Fastlane Documentation](https://docs.fastlane.tools)
- [GitHub Actions for iOS](https://docs.github.com/en/actions)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [Match Documentation](https://docs.fastlane.tools/actions/match/)

## 🎉 What's Next?

With this setup, you now have:
- ✅ Automatic iOS builds on every push
- ✅ TestFlight distribution for beta testing
- ✅ Build artifacts for debugging
- ✅ Versioning automation
- ✅ Code signing handled automatically

Your iOS development workflow is now as streamlined as Vercel for web apps!

---

**Need Help?** Check the [Fastlane community](https://github.com/fastlane/fastlane/discussions) or [GitHub Actions community](https://github.com/orgs/community/discussions/categories/actions).
