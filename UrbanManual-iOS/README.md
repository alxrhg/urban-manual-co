# Urban Manual - iOS 26 App

**A world-class native iOS travel guide app built to Apple's highest standards**

![iOS 26](https://img.shields.io/badge/iOS-26.0+-black?logo=apple)
![Swift 6](https://img.shields.io/badge/Swift-6.0-orange?logo=swift)
![SwiftUI](https://img.shields.io/badge/SwiftUI-5.0-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## 🎨 Design Philosophy

Urban Manual iOS embraces **iOS 26's Liquid Glass design language** while maintaining the web app's **minimalist, editorial aesthetic**:

- **80% Editorial** - Clean typography, sharp imagery, monochrome palette
- **20% Liquid Glass** - Subtle translucency, glass-like depth on UI chrome only
- **100% Native** - Feels like an iOS app, not a web port

### Visual Identity

```
┌─────────────────────┐
│ ░Glass Navigation░  │  ← iOS 26 Liquid Glass
│                     │
│ [Sharp Editorial    │  ← Urban Manual Editorial
│  Destination Image] │
│                     │
│ Le Bernardin        │  ← Clean Typography
│ Dining • New York   │  ← Minimal Metadata
│ ★★★                 │  ← Michelin Stars
│                     │
│ ░Floating Tab Bar░  │  ← iOS 26 Liquid Glass
└─────────────────────┘
```

---

## 🏗️ Architecture

### Modern MVVM with Clean Architecture

```
┌─────────────────────────────────────┐
│          SwiftUI Views              │  ← Presentation Layer
│   (Stateless, composable)           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    View Models (@Observable)        │  ← Presentation Logic
│   (iOS 26 Observation framework)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Use Cases / Interactors        │  ← Business Logic
│   (Single responsibility)           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Repositories (actor-isolated)    │  ← Data Access
│   (Swift 6 concurrency)             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Data Sources (Supabase, Cache)     │  ← Infrastructure
└─────────────────────────────────────┘
```

### Technology Stack

- **Language**: Swift 6.0 with strict concurrency
- **UI**: SwiftUI 5.0 (iOS 26+)
- **State**: Observation framework (@Observable)
- **Concurrency**: async/await, actor-isolated networking
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Minimum**: iOS 26.0 (iPhone 11+, A13 Bionic+)

---

## 📁 Project Structure

```
UrbanManual-iOS/
├── App/
│   ├── UrbanManualApp.swift         # Entry point
│   └── MainTabView.swift            # Tab navigation
│
├── DesignSystem/
│   ├── Theme/
│   │   ├── Colors.swift             # Semantic colors
│   │   ├── Typography.swift         # Font scale
│   │   ├── Spacing.swift            # Spacing scale
│   │   ├── Radius.swift             # Border radius
│   │   └── Icons.swift              # SF Symbols
│   └── Components/
│       ├── Buttons/                 # PrimaryButton, SecondaryButton, IconButton
│       ├── Cards/                   # DestinationCard
│       ├── Badges/                  # StatusBadge
│       ├── Loading/                 # LoadingView, SkeletonView
│       └── Inputs/                  # SearchField
│
├── Core/
│   ├── Network/
│   │   └── NetworkClient.swift      # Actor-isolated networking
│   └── Extensions/
│       └── View+Extensions.swift    # SwiftUI helpers
│
├── Features/
│   ├── Authentication/
│   │   ├── Domain/Models/           # User, AuthenticationState
│   │   └── Presentation/Views/      # WelcomeView, SignInView, SignUpView
│   │
│   ├── Destinations/
│   │   ├── Domain/Models/           # Destination
│   │   ├── Presentation/ViewModels/ # DestinationsViewModel
│   │   └── Presentation/Views/      # DestinationsView, DestinationDetailView
│   │
│   ├── Collections/
│   │   ├── Domain/Models/           # SavedDestination, Collection, VisitedPlace
│   │   └── Presentation/Views/      # SavedView
│   │
│   ├── Map/
│   │   └── Presentation/Views/      # MapView
│   │
│   └── Profile/
│       └── Presentation/Views/      # ProfileView
│
└── Resources/
    └── Assets.xcassets/             # Colors, Images, Icons
```

---

## ✨ Features

### Phase 1: Foundation (Complete ✅)
- [x] Design System matching web app
- [x] iOS 26 Liquid Glass integration
- [x] Core architecture setup
- [x] Reusable components

### Phase 2: Core Features (Complete ✅)
- [x] Welcome/Onboarding
- [x] Authentication (Email, Sign in with Apple UI)
- [x] Browse Destinations (Grid, Search)
- [x] Destination Details (Hero image, info, map)
- [x] Saved Destinations
- [x] Map View with markers
- [x] User Profile

### Phase 3: Advanced Features (Pending)
- [ ] Supabase integration (live data)
- [ ] Real authentication flow
- [ ] Collections management
- [ ] Visited tracking
- [ ] Trip planning
- [ ] Offline support

### Phase 4: iOS 26 Features (Pending)
- [ ] Interactive Widgets
- [ ] Live Activities (trip tracking)
- [ ] Control Widgets
- [ ] App Intents (Siri)
- [ ] Apple Intelligence integration

### Phase 5: Polish (Pending)
- [ ] Full accessibility support
- [ ] Performance optimization (60fps)
- [ ] Comprehensive testing
- [ ] App Store assets

---

## 🚀 Getting Started

### Prerequisites

- Xcode 16.0+ (for iOS 26)
- macOS 15.0+
- Apple Developer Account
- Supabase account

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/avmlo/urban-manual.git
cd urban-manual/UrbanManual-iOS
```

2. **Open in Xcode**

```bash
open UrbanManual.xcodeproj
```

3. **Configure Supabase**

Create `Configuration.swift`:

```swift
enum Configuration {
    static let supabaseURL = "YOUR_SUPABASE_URL"
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
}
```

4. **Build and Run**

- Select target device (iPhone 15 Pro recommended)
- Press ⌘R to build and run

---

## 🎨 Design System

### Colors

All colors automatically adapt to light/dark mode:

```swift
// Backgrounds
Color.backgroundPrimary    // White / #0A0A0A
Color.backgroundSecondary  // #F9FAFB / #1F2937

// Text
Color.textPrimary          // Black / White
Color.textSecondary        // #4B5563 / #9CA3AF
Color.textTertiary         // #9CA3AF / #6B7280

// Borders
Color.borderPrimary        // #E5E7EB / #1F2937
```

### Typography

Matches web app's Tailwind scale:

```swift
Font.urbanDisplayLarge    // 48px - Page titles
Font.urbanHeadlineMedium  // 20px - Section headers
Font.urbanTitleSmall      // 14px - Card titles
Font.urbanBodyMedium      // 16px - Body text
Font.urbanCaptionMedium   // 12px - Metadata
```

### Spacing

4px baseline grid matching Tailwind:

```swift
Spacing.xs      // 8px
Spacing.sm      // 12px
Spacing.md      // 16px
Spacing.lg      // 24px
Spacing.xl      // 32px
```

### Border Radius

```swift
Radius.card     // 16px - Destination cards
Radius.button   // Full circle - Buttons
Radius.input    // 12px - Input fields
```

---

## 🧩 Key Components

### DestinationCard

Main card component matching web app exactly:

```swift
DestinationCard(destination: destination) {
    // Handle tap
}
```

### PrimaryButton

Full-width action button:

```swift
PrimaryButton("Sign In", icon: .heart, isLoading: loading) {
    // Handle action
}
```

### SearchField

Search input with icon:

```swift
SearchField(text: $query, placeholder: "Search destinations...")
```

---

## 🌐 iOS 26 Liquid Glass

### Where We Use It

✅ **Navigation bars** - Translucent blur
✅ **Tab bar** - Floating glass effect
✅ **Modals/sheets** - Glass material
✅ **Buttons** - Subtle glass depth

❌ **Destination images** - Keep sharp and editorial
❌ **Typography** - Keep clean and readable
❌ **Card backgrounds** - Keep minimal

### Example

```swift
// Apply Liquid Glass effect
view
    .liquidGlass()

// Glass navigation bar
navigationStack
    .glassNavigationBar()
```

---

## ♿ Accessibility

All views support:

- ✅ VoiceOver with descriptive labels
- ✅ Dynamic Type (scales text)
- ✅ Minimum 44x44 tap targets
- ✅ High contrast mode
- ✅ Reduce motion
- ✅ Keyboard navigation (iPad)

Example:

```swift
DestinationCard(destination: destination)
    .accessibilityLabel("\(destination.name), \(destination.category) in \(destination.city)")
    .accessibilityAddTraits(.isButton)
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests
xcodebuild test -scheme UrbanManual -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### UI Tests

```bash
# Run UI tests
xcodebuild test -scheme UrbanManualUITests -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

---

## 📦 Dependencies

Managed via Swift Package Manager:

```swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
]
```

---

## 🚢 Deployment

### TestFlight

1. Archive build (⌘⇧B)
2. Upload to App Store Connect
3. Add to TestFlight
4. Invite testers

### App Store

1. Complete app metadata
2. Upload screenshots (all device sizes)
3. Submit for review
4. Monitor review status

---

## 📖 Documentation

- [iOS Rebuild Specification](../IOS_REBUILD_SPECIFICATION.md)
- [iOS 26 Design Adaptation](../IOS26_LIQUID_GLASS_DESIGN.md)
- [Implementation Roadmap](../IOS_IMPLEMENTATION_ROADMAP.md)

---

## 🤝 Contributing

This is a proprietary project. For internal contributors:

1. Create feature branch: `feature/your-feature`
2. Follow Swift style guide
3. Ensure all tests pass
4. Submit pull request

---

## 📄 License

Proprietary - © 2025 AVMLO LLC dba The Manual Company

---

## 🆘 Support

- **Issues**: Open GitHub issue
- **Email**: support@urbanmanual.co
- **Website**: https://urbanmanual.co

---

**Built with ❤️ in Swift 6 for iOS 26**
