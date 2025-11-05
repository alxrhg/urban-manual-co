# iOS CI/CD Alternatives - Vercel-Like Platforms

If you want an even more **Vercel-like experience** with a beautiful UI, automatic builds, and minimal configuration, consider these platforms:

## 🚀 Recommended Platforms

### 1. **Codemagic** (Most Vercel-Like)

**Best for**: Teams wanting a Vercel-like dashboard experience

**Features**:
- ✅ Beautiful web dashboard (similar to Vercel)
- ✅ Connect GitHub and auto-detect iOS projects
- ✅ Automatic builds on push
- ✅ Built-in code signing management
- ✅ TestFlight/App Store deployment
- ✅ Build artifacts storage
- ✅ Environment variables UI
- ✅ Free tier: 500 build minutes/month

**Setup**:
1. Go to https://codemagic.io
2. Sign up and connect your GitHub account
3. Select your repository
4. Codemagic auto-detects your Capacitor/iOS project
5. Configure build triggers (push to main, PRs, etc.)
6. Add Apple Developer credentials in the UI
7. Done! Every push triggers a build

**Pricing**:
- Free: 500 min/month
- Hobby: $49/month (unlimited builds)
- Team: Custom pricing

**Configuration File** (optional - `codemagic.yaml`):
```yaml
workflows:
  ios-workflow:
    name: iOS Build
    max_build_duration: 60
    instance_type: mac_mini_m1
    environment:
      groups:
        - app_store_credentials
      node: latest
    scripts:
      - name: Install dependencies
        script: pnpm install
      - name: Build Next.js
        script: pnpm build
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Build iOS
        script: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
    artifacts:
      - ios/App/build/*.ipa
    publishing:
      app_store_connect:
        apple_id: your-apple-id@example.com
        password: $APP_SPECIFIC_PASSWORD
```

---

### 2. **Bitrise** (Developer-Focused)

**Best for**: Teams already familiar with CI/CD concepts

**Features**:
- ✅ Drag-and-drop workflow builder
- ✅ Pre-built integrations for Capacitor
- ✅ Automatic code signing
- ✅ TestFlight deployment
- ✅ Slack/Discord notifications
- ✅ Free tier: 45 minutes/week

**Setup**:
1. Go to https://bitrise.io
2. Connect GitHub repository
3. Bitrise scans and detects iOS project
4. Add build steps via drag-and-drop UI
5. Configure code signing
6. Set up deployment to TestFlight

**Pricing**:
- Free: 45 min/week
- Hobby: $45/month
- Developer: $90/month
- Organization: Custom

**Configuration** (`bitrise.yml`):
```yaml
format_version: '13'
workflows:
  primary:
    steps:
    - activate-ssh-key: {}
    - git-clone: {}
    - npm@1:
        inputs:
        - command: install
        - workdir: $BITRISE_SOURCE_DIR
    - script@1:
        title: Build Next.js
        inputs:
        - content: pnpm build
    - script@1:
        title: Sync Capacitor
        inputs:
        - content: npx cap sync ios
    - cocoapods-install: {}
    - certificate-and-profile-installer: {}
    - xcode-archive:
        inputs:
        - project_path: ios/App/App.xcworkspace
        - scheme: App
    - deploy-to-itunesconnect-application-loader: {}
```

---

### 3. **App Center** (Microsoft) - **Deprecated**

⚠️ **Note**: Microsoft deprecated Visual Studio App Center in April 2025. Consider alternatives above.

---

### 4. **GitHub Actions** (Free & Integrated)

**Best for**: Cost-conscious teams, already using GitHub

**Features**:
- ✅ Free 2000 minutes/month on macOS
- ✅ Fully integrated with GitHub
- ✅ Use our pre-configured workflow (see `IOS_CICD_SETUP.md`)
- ✅ Unlimited private repos
- ✅ Community actions marketplace

**Setup**: See `IOS_CICD_SETUP.md` in this repository

**Pricing**:
- Free: 2000 macOS min/month
- Team: $4/user/month + usage
- Enterprise: Custom

---

### 5. **Fastlane + CI** (Self-Hosted)

**Best for**: Teams with existing CI infrastructure

**Features**:
- ✅ Run on your own hardware
- ✅ Full control over build environment
- ✅ No usage limits
- ✅ Works with Jenkins, GitLab CI, CircleCI, etc.

**Setup**:
1. Set up your CI server (Jenkins, GitLab Runner, etc.)
2. Install Fastlane (see `IOS_CICD_SETUP.md`)
3. Configure webhooks from GitHub
4. Run `fastlane beta` on each push

---

## 📊 Platform Comparison

| Platform | Setup Time | Vercel-Like UI | Free Tier | Best For |
|----------|------------|----------------|-----------|----------|
| **Codemagic** | ⭐⭐⭐⭐⭐ 5 min | ✅ Yes | 500 min/mo | Easiest setup |
| **Bitrise** | ⭐⭐⭐⭐ 10 min | ✅ Yes | 45 min/week | Power users |
| **GitHub Actions** | ⭐⭐⭐ 30 min | ❌ No | 2000 min/mo | Cost-conscious |
| **Self-Hosted** | ⭐⭐ 2 hours | ❌ No | Unlimited | Full control |

---

## 🎯 Recommendation

### For Beginners or Small Teams:
→ **Use Codemagic**
- Easiest setup (5 minutes)
- Beautiful dashboard
- Most Vercel-like experience
- Great free tier

### For Budget-Conscious:
→ **Use GitHub Actions** (already configured in this repo!)
- 2000 free minutes/month
- Good for small to medium teams
- See `IOS_CICD_SETUP.md`

### For Power Users:
→ **Use Bitrise**
- More control over workflow
- Better for complex builds
- Good ecosystem

---

## 🚀 Quick Start with Codemagic (Recommended)

1. **Sign up**: https://codemagic.io/signup
2. **Connect GitHub**: Authorize Codemagic to access your repository
3. **Select Repository**: Choose `urban-manual`
4. **Auto-Detect**: Codemagic will detect your iOS app
5. **Configure Triggers**:
   - ✅ Build on push to `main`
   - ✅ Build on PRs
6. **Add Apple Credentials**:
   - Go to **Team settings** → **Code signing identities**
   - Upload your Apple Developer certificate
   - Or use Codemagic's automatic code signing
7. **Environment Variables**:
   - Add your Supabase credentials
   - Add Apple ID and app-specific password
8. **Start Building**: Push to GitHub and watch it build!

---

## 💡 Tips for Best Experience

### 1. **Enable Notifications**
Set up Slack/Discord/Email notifications for build status

### 2. **Use Build Caching**
All platforms support caching `node_modules` and CocoaPods for faster builds

### 3. **Parallel Builds**
Run web and iOS builds in parallel if your platform supports it

### 4. **Auto-Increment Build Numbers**
Use Fastlane's `increment_build_number` to avoid version conflicts

### 5. **Branch-Specific Deployments**
- `main` → TestFlight
- `develop` → Build artifacts only
- PRs → Build verification

---

## 🔗 Useful Links

- **Codemagic**: https://codemagic.io
- **Bitrise**: https://bitrise.io
- **GitHub Actions**: https://docs.github.com/actions
- **Fastlane**: https://fastlane.tools
- **Capacitor iOS**: https://capacitorjs.com/docs/ios

---

**Questions?** Check the main setup guide in `IOS_CICD_SETUP.md` or the [Codemagic docs](https://docs.codemagic.io).
