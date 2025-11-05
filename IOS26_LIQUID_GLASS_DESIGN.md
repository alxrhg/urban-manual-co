# Urban Manual iOS 26 - Liquid Glass Design Integration

**Updated**: November 2025
**Target**: iOS 26.0+ with Liquid Glass Design Language

---

## 🎨 iOS 26 Liquid Glass Design Language

### What is Liquid Glass?

iOS 26 introduces **Liquid Glass** - Apple's first major design overhaul since iOS 7. Key characteristics:

1. **Translucent, Glass-like Elements** - Components have optical properties of glass (refraction, reflection)
2. **Rounded, Fluid Shapes** - More organic, flowing borders and containers
3. **Motion-Responsive** - Elements react to device motion and user interaction
4. **Depth & Layering** - Enhanced use of blur, shadows, and material layers
5. **VisionOS Influence** - Unified design language across all Apple platforms

### How Urban Manual Adapts Liquid Glass

**Maintaining Brand Identity:**
- Keep minimalist, monochromatic aesthetic
- Apply Liquid Glass effects **subtly**
- Use translucency where it enhances, not distracts
- Editorial design remains primary focus

**Where to Apply Liquid Glass:**
- ✅ Navigation bars - Translucent with blur
- ✅ Tab bar - Floating glass effect
- ✅ Modals/Sheets - Glass material backgrounds
- ✅ Card overlays - Subtle refraction on hover
- ✅ Buttons - Glass-like depth and reflection
- ❌ Destination images - Keep sharp and editorial
- ❌ Typography - Keep clean and readable

---

## 🔄 Updated Design System for iOS 26

### Glass Materials

```swift
// DesignSystem/Theme/Materials.swift
import SwiftUI

extension Material {
    /// Urban Manual glass materials
    /// Subtle translucency maintaining minimalist design

    /// Primary glass - For main UI elements
    /// Light mode: white with 90% opacity
    /// Dark mode: dark gray with 90% opacity
    static let urbanGlassPrimary = Material.regularMaterial

    /// Secondary glass - For secondary containers
    /// More translucent than primary
    static let urbanGlassSecondary = Material.thinMaterial

    /// Heavy glass - For modals and sheets
    /// More opaque, stronger blur
    static let urbanGlassHeavy = Material.thickMaterial
}

// Blur effects for custom glass
enum GlassBlur {
    static let light: CGFloat = 10
    static let medium: CGFloat = 20
    static let heavy: CGFloat = 40
}
```

### Updated Component Styles

```swift
// Navigation Bar - Liquid Glass
struct GlassNavigationBar: View {
    var body: some View {
        // Translucent glass effect
        Rectangle()
            .fill(.ultraThinMaterial)
            .frame(height: 44)
            .overlay(
                // Subtle gradient for glass refraction
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.1),
                        Color.clear
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }
}

// Tab Bar - Floating Glass
struct GlassTabBar: View {
    var body: some View {
        HStack {
            // Tab items
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(
            Capsule()
                .fill(.regularMaterial)
                .shadow(
                    color: .black.opacity(0.1),
                    radius: 20,
                    y: 10
                )
        )
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.bottom, Spacing.md)
    }
}

// Destination Card - Subtle Glass Overlay
struct LiquidGlassCard: View {
    var body: some View {
        VStack {
            // Image
            // Content
        }
        .background(
            RoundedRectangle(cornerRadius: Radius.card)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            // Glass refraction effect (very subtle)
            RoundedRectangle(cornerRadius: Radius.card)
                .stroke(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.3),
                            Color.clear,
                            Color.white.opacity(0.1)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }
}

// Button - Glass Effect
struct GlassButton: View {
    var body: some View {
        Text("Action")
            .padding()
            .background(
                Capsule()
                    .fill(.regularMaterial)
                    .overlay(
                        // Glass highlight
                        Capsule()
                            .stroke(
                                Color.white.opacity(0.2),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: .black.opacity(0.1), radius: 10, y: 5)
    }
}
```

---

## 🎯 Updated Component Guidelines

### When to Use Liquid Glass

**Use Liquid Glass For:**
- Navigation bars (always)
- Tab bars (floating)
- Modals and sheets
- Floating action buttons
- Overlays and popovers
- Control widgets

**Keep Traditional For:**
- Destination card images (editorial focus)
- Body text (readability)
- List backgrounds
- Grid containers

### Balance: 80% Traditional, 20% Liquid Glass

Urban Manual should feel **refined and editorial** first, with Liquid Glass effects enhancing the experience subtly.

---

## 🚀 iOS 26 Specific Features

### 1. Enhanced Apple Intelligence

```swift
// Integrate Apple Intelligence for search
struct IntelligentSearch: View {
    @State private var query = ""

    var body: some View {
        TextField("Search destinations", text: $query)
            .textInputAutocapitalization(.never)
            // iOS 26 - Intelligent suggestions
            .searchSuggestions {
                // AI-powered suggestions appear here
            }
    }
}
```

### 2. Live Translation

```swift
// Translate destination descriptions
struct DestinationDetail: View {
    let destination: Destination
    @State private var translatedDescription: String?

    var body: some View {
        Text(translatedDescription ?? destination.description)
            // iOS 26 - Live translation
            .translationPresentation(isPresented: $showTranslation) {
                // Translation UI
            }
    }
}
```

### 3. Adaptive Power Integration

```swift
// Optimize for Adaptive Power mode
struct DestinationImage: View {
    @Environment(\.energyEfficiencyMode) var energyMode

    var body: some View {
        AsyncImage(url: imageURL)
            // Reduce image quality in low power mode
            .renderingMode(energyMode ? .lowPower : .highQuality)
    }
}
```

### 4. Games App Integration (Optional)

If we add gamification features:
```swift
// Integrate with new Games app
import GameKit

struct AchievementsView: View {
    var body: some View {
        // Show travel achievements
        // Integrated with Games app automatically
    }
}
```

---

## 📱 Updated Minimum Requirements

- **Minimum**: iOS 26.0 (iPhone 11 and later, requires A13 Bionic+)
- **Optimized for**: iPhone 15/16, iOS 26.1+
- **Drops support**: iPhone XS, XS Max, XR (iOS 25 max)

---

## 🎨 Visual Examples

### Before (iOS 18 Design)
```
┌─────────────────────┐
│  [Solid background] │  ← Opaque
│                     │
│  [Flat card]        │  ← No depth
│                     │
└─────────────────────┘
```

### After (iOS 26 Liquid Glass)
```
┌─────────────────────┐
│ ░[Glass blur]░      │  ← Translucent
│  ◠ subtle refract   │  ← Glass effect
│  [Floating card]▓   │  ← Depth/shadow
│                     │
└─────────────────────┘
```

### Urban Manual Balance
```
┌─────────────────────┐
│ ░Nav: Glass blur░   │  ← Liquid Glass
│                     │
│ [Sharp image]       │  ← Editorial
│ Title               │  ← Clean type
│ Category • City     │  ← Minimal
│                     │
│ ░Tab: Floating░     │  ← Liquid Glass
└─────────────────────┘
```

**80% editorial + 20% Liquid Glass = Perfect Balance**

---

## ✅ Implementation Checklist

### Liquid Glass Integration
- [ ] Update materials with glass effects
- [ ] Translucent navigation bar
- [ ] Floating glass tab bar
- [ ] Glass modals and sheets
- [ ] Subtle card overlays (optional)
- [ ] Glass buttons for primary actions

### iOS 26 Features
- [ ] Apple Intelligence search suggestions
- [ ] Live translation support
- [ ] Adaptive Power optimization
- [ ] Updated SF Symbols for iOS 26

### Testing
- [ ] Test on iOS 26.0
- [ ] Test on iOS 26.1 (latest)
- [ ] Verify on iPhone 11+ (A13+)
- [ ] Test Liquid Glass in light/dark mode
- [ ] Verify translucency effects
- [ ] Test motion-responsive elements

---

**Result**: A modern iOS 26 app that embraces Liquid Glass design while maintaining Urban Manual's minimalist, editorial aesthetic.
