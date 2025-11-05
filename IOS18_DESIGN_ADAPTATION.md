# Urban Manual - iOS 18 Design Adaptation Guide
**Maintaining Web App Aesthetics with iOS 18 Features**

---

## 🎨 Design Philosophy

**Goal**: Create a native iOS 18 app that feels distinctly Urban Manual while embracing Apple's latest design language.

### Core Principles
1. **Maintain Brand Identity**: Minimalist, editorial, monochromatic
2. **Embrace iOS 18**: Use new iOS 18 features thoughtfully
3. **Native Feel**: Respect iOS patterns and conventions
4. **Consistency**: Match web app's visual language

---

## 🆕 iOS 18 Features to Leverage

### 1. **New Typography System**
iOS 18 introduces refined system fonts with improved readability.

```swift
// Urban Manual Typography adapted for iOS 18
extension Font {
    // Match web app's clean typography
    static let urbanDisplayLarge = Font.system(size: 48, weight: .bold, design: .default)
    static let urbanHeadline = Font.system(size: 24, weight: .semibold, design: .default)
    static let urbanTitle = Font.system(size: 16, weight: .medium, design: .default)
    static let urbanBody = Font.system(size: 15, weight: .regular, design: .default)
    static let urbanCaption = Font.system(size: 12, weight: .regular, design: .default)

    // iOS 18 - Enhanced readability variants
    static let urbanBodyReadable = Font.system(.body, design: .default, weight: .regular)
        .leading(.standard) // New iOS 18 line height control
}
```

### 2. **Mesh Gradients** (iOS 18 New!)
Subtle background gradients for premium feel while maintaining minimalism.

```swift
// Subtle mesh gradient for hero sections (very subtle to maintain minimalism)
struct SubtleMeshGradient: View {
    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.5, 0.5], [1, 0.5],
                [0, 1], [0.5, 1], [1, 1]
            ],
            colors: [
                .white, .white.opacity(0.98), .white,
                .white.opacity(0.98), .white.opacity(0.95), .white.opacity(0.98),
                .white, .white.opacity(0.98), .white
            ]
        )
        .opacity(0.5) // Very subtle for editorial feel
    }
}

// Dark mode variant
struct SubtleMeshGradientDark: View {
    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.5, 0.5], [1, 0.5],
                [0, 1], [0.5, 1], [1, 1]
            ],
            colors: [
                Color(hex: "#0a0a0a"), Color(hex: "#0f0f0f"), Color(hex: "#0a0a0a"),
                Color(hex: "#0f0f0f"), Color(hex: "#141414"), Color(hex: "#0f0f0f"),
                Color(hex: "#0a0a0a"), Color(hex: "#0f0f0f"), Color(hex: "#0a0a0a")
            ]
        )
    }
}
```

### 3. **SF Symbols 6** (New in iOS 18)
Updated with more travel-specific icons.

```swift
// Urban Manual icon system using SF Symbols 6
enum UrbanIcon {
    // Navigation (new animated variants in iOS 18)
    case explore          // sparkles (now with animation)
    case saved            // heart.fill (new bounce animation)
    case collections      // square.stack.3d.up.fill (new in SF6)
    case map              // map.fill (improved detail)
    case profile          // person.crop.circle.fill

    // Categories (new travel icons in SF Symbols 6)
    case dining           // fork.knife.circle.fill
    case hotel            // bed.double.circle.fill
    case culture          // building.columns.circle.fill
    case museum           // building.2.crop.circle.fill
    case entertainment    // theatermasks.circle.fill
    case shopping         // bag.circle.fill
    case nightlife        // moon.stars.circle.fill

    // Status & Features
    case michelinStar     // star.circle.fill (animated variant)
    case featured         // crown.fill
    case verified         // checkmark.seal.fill (new)
    case trending         // chart.line.uptrend.xyaxis (new)

    // Actions
    case share            // square.and.arrow.up.circle.fill
    case bookmark         // bookmark.circle.fill
    case visited          // checkmark.circle.fill (new animation)
    case directions       // location.circle.fill

    var systemName: String {
        switch self {
        case .explore: return "sparkles"
        case .saved: return "heart.fill"
        case .collections: return "square.stack.3d.up.fill"
        case .map: return "map.fill"
        case .profile: return "person.crop.circle.fill"
        case .dining: return "fork.knife.circle.fill"
        case .hotel: return "bed.double.circle.fill"
        case .culture: return "building.columns.circle.fill"
        case .museum: return "building.2.crop.circle.fill"
        case .entertainment: return "theatermasks.circle.fill"
        case .shopping: return "bag.circle.fill"
        case .nightlife: return "moon.stars.circle.fill"
        case .michelinStar: return "star.circle.fill"
        case .featured: return "crown.fill"
        case .verified: return "checkmark.seal.fill"
        case .trending: return "chart.line.uptrend.xyaxis"
        case .share: return "square.and.arrow.up.circle.fill"
        case .bookmark: return "bookmark.circle.fill"
        case .visited: return "checkmark.circle.fill"
        case .directions: return "location.circle.fill"
        }
    }

    // iOS 18 - Animated symbol variants
    func image(animated: Bool = false) -> Image {
        Image(systemName: systemName)
    }
}
```

### 4. **Control Widgets** (iOS 18 New!)
Quick actions from Control Center and Lock Screen.

```swift
// Urban Manual Control Widget
struct SavedDestinationsControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "co.urbanmanual.saved",
            provider: SavedControlProvider()
        ) { value in
            ControlWidgetToggle(
                "Saved Places",
                isOn: value.hasSaved,
                action: ToggleSavedIntent()
            ) { isOn in
                Label("Saved", systemImage: isOn ? "heart.fill" : "heart")
                    .tint(.white) // Match Urban Manual's monochrome palette
            }
        }
        .displayName("Saved Places")
        .description("Quick access to your saved destinations")
    }
}
```

### 5. **Interactive Widgets** (iOS 18 Enhanced)
Fully interactive widgets without opening the app.

```swift
// Interactive widget matching web app's card design
struct DestinationWidget: Widget {
    let kind: String = "DestinationWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: Provider()
        ) { entry in
            DestinationWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    // Match web app's clean white/black background
                    Color.backgroundPrimary
                }
        }
        .configurationDisplayName("Featured Destination")
        .description("Discover a new destination every day")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled() // iOS 18 - Remove default padding for custom design
    }
}

struct DestinationWidgetView: View {
    let entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image matching web app's aspect-square cards
            AsyncImage(url: entry.destination.imageURL) { image in
                image
                    .resizable()
                    .aspectRatio(1, contentMode: .fill)
            } placeholder: {
                Color.backgroundSecondary
            }
            .clipShape(RoundedRectangle(cornerRadius: 16)) // Match web app's rounded-2xl
            .overlay(alignment: .topTrailing) {
                if entry.destination.isFeatured {
                    Image(systemName: "crown.fill")
                        .foregroundStyle(.yellow)
                        .padding(8)
                }
            }

            // Text matching web app's typography
            Text(entry.destination.name)
                .font(.system(size: 14, weight: .medium)) // Match web app's text-sm font-medium
                .foregroundColor(.textPrimary)
                .lineLimit(2)

            HStack(spacing: 4) {
                Text(entry.destination.category)
                Text("•")
                Text(entry.destination.city)
            }
            .font(.system(size: 12, weight: .regular)) // Match web app's text-xs
            .foregroundColor(.textSecondary)

            Spacer()

            // iOS 18 - Interactive button
            Button(intent: SaveDestinationIntent(destinationID: entry.destination.id)) {
                Label("Save", systemImage: entry.isSaved ? "heart.fill" : "heart")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 9999) // Match web app's rounded-full
                            .stroke(Color.borderPrimary, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(12) // Match web app's spacing
    }
}
```

### 6. **Live Activities** (Enhanced in iOS 18)
Trip planning with Dynamic Island support.

```swift
// Live Activity for active trip
struct TripLiveActivity: LiveActivity {
    struct Attributes: ActivityAttributes {
        public struct ContentState: Codable, Hashable {
            var currentDestination: String
            var nextDestination: String?
            var progress: Double
        }

        var tripName: String
        var totalDestinations: Int
    }

    var body: some ActivityConfiguration {
        ActivityConfiguration(for: Attributes.self) { context in
            // Lock Screen / Banner UI
            HStack(spacing: 12) {
                // Match web app's minimal design
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.tripName)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.textPrimary)

                    Text("Now: \(context.state.currentDestination)")
                        .font(.system(size: 12))
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Progress indicator (minimal)
                CircularProgressView(progress: context.state.progress)
                    .frame(width: 32, height: 32)
            }
            .padding(16)
            .background(Color.backgroundPrimary)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "map.fill")
                        .foregroundColor(.textSecondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(Int(context.state.progress * 100))%")
                        .font(.system(size: 12, weight: .medium))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.currentDestination)
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let next = context.state.nextDestination {
                        HStack {
                            Text("Next:")
                                .font(.caption2)
                                .foregroundColor(.textTertiary)
                            Text(next)
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "map.fill")
                    .foregroundColor(.textSecondary)
            } compactTrailing: {
                Text("\(Int(context.state.progress * 100))%")
                    .font(.caption2)
                    .fontWeight(.medium)
            } minimal: {
                Image(systemName: "map.fill")
            }
        }
    }
}
```

### 7. **Hover Effects** (iOS 18 iPad Enhancement)
Subtle hover states for iPad pointer interactions.

```swift
// Destination card with iOS 18 hover effects
struct DestinationCard: View {
    let destination: Destination
    @State private var isHovered = false

    var body: some View {
        Button(action: openDestination) {
            VStack(alignment: .leading, spacing: 8) {
                // Image with subtle scale on hover
                destinationImage
                    .scaleEffect(isHovered ? 1.02 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isHovered)

                // Text content
                destinationInfo
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.backgroundPrimary)
                    .shadow(
                        color: .black.opacity(isHovered ? 0.1 : 0.05),
                        radius: isHovered ? 16 : 8,
                        y: isHovered ? 8 : 4
                    )
            )
        }
        .buttonStyle(.plain)
        // iOS 18 - Enhanced hover effect
        .hoverEffect(.highlight)
        .onHover { hovering in
            isHovered = hovering
            if hovering {
                HapticManager.shared.selection()
            }
        }
    }
}
```

### 8. **Smooth Scrolling Transitions** (iOS 18 Enhanced)
New scrollTransition API for butter-smooth animations.

```swift
struct DestinationsGridView: View {
    let destinations: [Destination]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(destinations) { destination in
                    DestinationCard(destination: destination)
                        // iOS 18 - Smooth scroll transitions
                        .scrollTransition { content, phase in
                            content
                                .opacity(phase.isIdentity ? 1 : 0.5)
                                .scaleEffect(phase.isIdentity ? 1 : 0.95)
                                .blur(radius: phase.isIdentity ? 0 : 2)
                        }
                }
            }
            .padding(.horizontal, 24) // Match web app's px-6 md:px-10
        }
        // iOS 18 - Smooth content margin transitions
        .contentMargins(.top, 16, for: .scrollContent)
    }
}
```

### 9. **Zoom Transitions** (iOS 18 New!)
Magazine-style transitions between views.

```swift
struct DestinationsView: View {
    @Namespace private var animation

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns) {
                    ForEach(destinations) { destination in
                        NavigationLink(value: destination) {
                            DestinationCard(destination: destination)
                                // iOS 18 - Zoom transition for editorial feel
                                .matchedTransitionSource(
                                    id: destination.id,
                                    in: animation
                                )
                        }
                    }
                }
            }
            .navigationDestination(for: Destination.self) { destination in
                DestinationDetailView(destination: destination)
                    // iOS 18 - Smooth zoom from card to detail
                    .navigationTransition(.zoom(
                        sourceID: destination.id,
                        in: animation
                    ))
            }
        }
    }
}
```

### 10. **Sensory Feedback** (iOS 18 Enhanced)
More nuanced haptic patterns.

```swift
// Enhanced haptic manager for iOS 18
actor HapticManager {
    static let shared = HapticManager()

    private init() {}

    // iOS 18 - New sensory feedback API
    func play(_ feedback: SensoryFeedback) {
        SensoryFeedback.impact(.soft).play()
    }

    // Urban Manual haptic patterns
    func cardTap() {
        SensoryFeedback.impact(.light).play()
    }

    func buttonPress() {
        SensoryFeedback.impact(.medium).play()
    }

    func saveAction() {
        SensoryFeedback.success.play()
    }

    func errorOccurred() {
        SensoryFeedback.error.play()
    }

    func longPress() {
        SensoryFeedback.impact(.rigid).play()
    }
}

// Usage in buttons
Button("Save") {
    HapticManager.shared.saveAction()
    saveDestination()
}
.sensoryFeedback(.success, trigger: isSaved)
```

---

## 🎯 Matching Web App's Visual Design

### Color System (Exact Match)

```swift
// Assets.xcassets colors matching web app exactly

// Light Mode
BackgroundPrimary:     #FFFFFF (white)
BackgroundSecondary:   #F9FAFB (gray-50)
TextPrimary:           #000000 (black)
TextSecondary:         #4B5563 (gray-600)
TextTertiary:          #9CA3AF (gray-400)
Border:                #E5E7EB (gray-200)

// Dark Mode
BackgroundPrimary:     #0A0A0A
BackgroundSecondary:   #1F2937 (gray-900)
TextPrimary:           #FFFFFF
TextSecondary:         #9CA3AF (gray-400)
TextTertiary:          #6B7280 (gray-500)
Border:                #1F2937 (gray-800)

// Accent Colors (use sparingly, match web)
Success:               #10B981 (green-500)
Warning:               #F59E0B (orange-500)
Error:                 #EF4444 (red-500)
Info:                  #3B82F6 (blue-500)
```

### Typography Matching Web App

```swift
// Exact font sizes from web app's Tailwind config
extension Font {
    // Display (48px from web) - Page titles
    static let urbanDisplay = Font.system(size: 48, weight: .bold)

    // H2 (36px from web) - Section headers
    static let urbanH2 = Font.system(size: 36, weight: .semibold)

    // H3 (24px from web) - Card titles
    static let urbanH3 = Font.system(size: 24, weight: .semibold)

    // Body (16px from web) - Body text
    static let urbanBody = Font.system(size: 16, weight: .regular)

    // Small (14px from web) - Card metadata
    static let urbanSmall = Font.system(size: 14, weight: .medium)

    // Tiny (12px from web) - Captions
    static let urbanTiny = Font.system(size: 12, weight: .regular)
}
```

### Spacing Matching Web App (Tailwind Scale)

```swift
// Exact spacing from web app's Tailwind config
enum Spacing {
    static let xxxs: CGFloat = 2      // 0.5  (space-0.5)
    static let xxs: CGFloat = 4       // 1    (space-1)
    static let xs: CGFloat = 8        // 2    (space-2)
    static let sm: CGFloat = 12       // 3    (space-3)
    static let md: CGFloat = 16       // 4    (space-4)
    static let lg: CGFloat = 24       // 6    (space-6)
    static let xl: CGFloat = 32       // 8    (space-8)
    static let xxl: CGFloat = 48      // 12   (space-12)
    static let xxxl: CGFloat = 64     // 16   (space-16)

    // Semantic spacing matching web components
    static let cardPadding = md       // p-4 from web
    static let screenPadding = lg     // px-6 md:px-10 from web
    static let itemGap = md           // gap-4 from web
    static let sectionGap = xxl       // gap-12 from web
}
```

### Border Radius Matching Web App

```swift
// Exact border radius from web app
enum Radius {
    static let sm: CGFloat = 8        // rounded-lg (0.5rem)
    static let md: CGFloat = 12       // rounded-xl (0.75rem)
    static let lg: CGFloat = 16       // rounded-2xl (1rem)
    static let xl: CGFloat = 24       // rounded-3xl (1.5rem)
    static let full: CGFloat = 9999   // rounded-full

    // Semantic radius matching web components
    static let card = lg              // rounded-2xl (16px) - main cards
    static let button = full          // rounded-full - buttons
    static let badge = full           // rounded-full - badges
}
```

### Card Design Matching Web Exactly

```swift
// Destination card matching web app's DestinationCard.tsx
struct DestinationCard: View {
    let destination: Destination

    var body: some View {
        VStack(alignment: .leading, spacing: 8) { // gap-2 from web
            // Image container matching web's aspect-square
            AsyncImage(url: destination.imageURL) { image in
                image
                    .resizable()
                    .aspectRatio(1, contentMode: .fill) // aspect-square from web
            } placeholder: {
                Color.backgroundSecondary // bg-gray-100 dark:bg-gray-800
            }
            .clipShape(RoundedRectangle(cornerRadius: 16)) // rounded-2xl from web
            .overlay(alignment: .topTrailing) {
                // Crown badge if featured
                if destination.isFeatured {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 12)) // text-xs from web
                        .foregroundColor(.yellow)
                        .padding(8) // p-2 from web
                }
            }
            .overlay(
                // Border matching web's border border-gray-200 dark:border-gray-800
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Color.borderPrimary, lineWidth: 1)
            )

            // Title matching web's font-medium text-sm
            Text(destination.name)
                .font(.system(size: 14, weight: .medium)) // text-sm font-medium from web
                .foregroundColor(.textPrimary) // text-black dark:text-white
                .lineLimit(2) // line-clamp-2 from web

            // Category + City matching web's flex items-center gap-1.5
            HStack(spacing: 6) { // gap-1.5 = 6px from web
                Text(destination.category)
                Text("•")
                Text(destination.city)
            }
            .font(.system(size: 12)) // text-xs from web
            .foregroundColor(.textSecondary) // text-gray-600 dark:text-gray-400
            .lineLimit(1)

            // Michelin stars if applicable
            if let stars = destination.michelinStars, stars > 0 {
                HStack(spacing: 2) {
                    ForEach(0..<stars, id: \.self) { _ in
                        Image(systemName: "star.fill")
                            .font(.system(size: 10)) // Small stars
                            .foregroundColor(.yellow)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
```

### Grid Layout Matching Web App

```swift
// Grid matching web app's responsive grid
struct DestinationsGridView: View {
    let destinations: [Destination]
    @Environment(\.horizontalSizeClass) var sizeClass

    // Match web app's grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
    var columns: [GridItem] {
        let count: Int
        if sizeClass == .compact {
            // iPhone: 2 columns (grid-cols-2)
            count = 2
        } else {
            // iPad: 4-6 columns depending on size
            count = 4
        }
        return Array(repeating: GridItem(.flexible(), spacing: 16), count: count) // gap-4 from web
    }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 24) { // gap-6 from web (md)
                ForEach(destinations) { destination in
                    DestinationCard(destination: destination)
                }
            }
            .padding(.horizontal, 24) // px-6 md:px-10 from web
        }
    }
}
```

### Button Styles Matching Web App

```swift
// Primary button matching web app
struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium)) // text-sm font-medium from web
                .foregroundColor(.white) // text-white dark:text-black
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12) // py-3 from web
                .padding(.horizontal, 24) // px-6 from web
                .background(
                    Capsule() // rounded-full from web
                        .fill(Color.textPrimary) // bg-black dark:bg-white from web
                )
        }
        .buttonStyle(.plain)
    }
}

// Secondary button (outlined) matching web app
struct SecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium)) // text-sm font-medium
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8) // py-2 from web
                .padding(.horizontal, 16) // px-4 from web
                .background(
                    Capsule() // rounded-full from web
                        .strokeBorder(Color.borderPrimary, lineWidth: 1) // border border-gray-200
                )
        }
        .buttonStyle(.plain)
    }
}
```

### Badge Styles Matching Web App

```swift
// Status badge matching web app
struct StatusBadge: View {
    enum Status {
        case open, busy, closed

        var color: Color {
            switch self {
            case .open: return .green
            case .busy: return .orange
            case .closed: return .red
            }
        }

        var backgroundColor: Color {
            switch self {
            case .open: return Color.green.opacity(0.1) // bg-green-50 dark:bg-green-900/20
            case .busy: return Color.orange.opacity(0.1)
            case .closed: return Color.red.opacity(0.1)
            }
        }
    }

    let status: Status
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium)) // text-xs font-medium from web
            .foregroundColor(status.color) // text-green-600 etc
            .padding(.horizontal, 12) // px-3 from web
            .padding(.vertical, 4) // py-1 from web
            .background(
                Capsule() // rounded-full from web
                    .fill(status.backgroundColor)
            )
    }
}
```

---

## 🚀 iOS 18 Navigation Patterns

### Tab Bar (Matching Web App's Header Navigation)

```swift
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DestinationsView()
                .tabItem {
                    Label("Explore", systemImage: "sparkles")
                }
                .tag(0)

            SavedView()
                .tabItem {
                    Label("Saved", systemImage: "heart.fill")
                }
                .tag(1)

            MapView()
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
                .tag(3)
        }
        // iOS 18 - Customize tab bar appearance to match web app
        .tint(.textPrimary) // Match web app's black/white theme
    }
}
```

---

## 📱 Responsive Design for All Devices

### iPhone vs iPad Layouts

```swift
struct DestinationsView: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    var body: some View {
        if sizeClass == .regular && verticalSizeClass == .regular {
            // iPad: Two-column layout with sidebar
            NavigationSplitView {
                DestinationsSidebar()
            } detail: {
                DestinationsGridView()
            }
        } else {
            // iPhone: Single column
            NavigationStack {
                DestinationsGridView()
            }
        }
    }
}
```

---

## ✅ Implementation Checklist

### Visual Consistency with Web App
- [ ] Exact color values from web app (white/black/grays)
- [ ] Matching font sizes and weights
- [ ] Identical spacing scale (Tailwind)
- [ ] Same border radius (rounded-2xl, rounded-full)
- [ ] Card design matches web exactly
- [ ] Grid layout responsive like web
- [ ] Button styles identical
- [ ] Badge styles matching

### iOS 18 Features
- [ ] SF Symbols 6 throughout
- [ ] Mesh gradients (subtle)
- [ ] Zoom transitions for editorial feel
- [ ] Scroll transitions
- [ ] Enhanced hover effects (iPad)
- [ ] Interactive widgets
- [ ] Control widgets
- [ ] Live Activities for trips
- [ ] Sensory feedback
- [ ] iOS 18 typography enhancements

### Native iOS Polish
- [ ] 60fps scrolling
- [ ] Haptic feedback on interactions
- [ ] Pull to refresh
- [ ] Context menus on long press
- [ ] Swipe actions where appropriate
- [ ] Smooth animations (spring curves)
- [ ] Dynamic Type support
- [ ] VoiceOver labels
- [ ] Dark mode (automatic)

---

**Result**: A native iOS 18 app that looks and feels like Urban Manual's web app while embracing Apple's latest design innovations.
