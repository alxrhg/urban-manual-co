# Urban Manual iOS App - Apple-Quality Rebuild Specification

**Project**: Urban Manual Travel Guide
**Platform**: iOS 17.0+, iPadOS 17.0+
**Language**: Swift 6.0
**Framework**: SwiftUI 5.0
**Architecture**: Modern MVVM with Observation Framework
**Date**: January 2025

---

## 🎯 Project Goals

Build a **world-class native iOS application** that exemplifies Apple's design principles:
- **Native First**: Feels like an iOS app, not a web port
- **Performance**: 60fps scrolling, instant interactions, sub-100ms response times
- **Accessibility**: Full VoiceOver support, Dynamic Type, accessibility actions
- **Design**: Follows Human Interface Guidelines precisely
- **Quality**: Zero crashes, comprehensive error handling, extensive testing
- **Polish**: Delightful animations, haptic feedback, attention to detail

---

## 📐 Architecture

### Modern MVVM with Observation Framework

**Swift 6 Features:**
- `@Observable` macro (replaces `ObservableObject`)
- Strict concurrency checking enabled
- Actor-based threading for data access
- `Sendable` protocol conformance
- Async/await throughout (no completion handlers)
- Structured concurrency (TaskGroups)

**Layer Structure:**

```
┌─────────────────────────────────────┐
│          SwiftUI Views              │  ← UI Layer
│   (Stateless, composable views)     │
└─────────────────────────────────────┘
              ↓ binds to
┌─────────────────────────────────────┐
│    View Models (@Observable)        │  ← Presentation Layer
│   (UI state, business logic)        │
└─────────────────────────────────────┘
              ↓ calls
┌─────────────────────────────────────┐
│      Use Cases / Interactors        │  ← Business Logic Layer
│   (Single responsibility actions)   │
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│    Repositories (actor-isolated)    │  ← Data Access Layer
│   (Abstract data sources)           │
└─────────────────────────────────────┘
              ↓ fetches from
┌─────────────────────────────────────┐
│  Data Sources (Network, Cache, DB)  │  ← Infrastructure Layer
│   (Concrete implementations)        │
└─────────────────────────────────────┘
```

---

## 🏗️ Project Structure

```
UrbanManual/
├── App/
│   ├── UrbanManualApp.swift              # App entry point
│   ├── AppDelegate.swift                 # App lifecycle (if needed)
│   └── Configuration.swift               # App configuration
│
├── Core/
│   ├── Network/
│   │   ├── NetworkClient.swift           # URLSession wrapper (actor)
│   │   ├── Endpoint.swift                # API endpoint definitions
│   │   ├── HTTPMethod.swift              # HTTP methods enum
│   │   ├── NetworkError.swift            # Network error types
│   │   └── NetworkMonitor.swift          # Connectivity monitoring
│   │
│   ├── Storage/
│   │   ├── CacheManager.swift            # NSCache wrapper (actor)
│   │   ├── KeychainManager.swift         # Secure storage
│   │   ├── UserDefaultsManager.swift     # Settings storage
│   │   └── ImageCache.swift              # Image caching (actor)
│   │
│   ├── Persistence/
│   │   ├── CoreDataStack.swift           # Core Data setup
│   │   ├── PersistenceController.swift   # Database controller
│   │   └── Models/                       # Core Data models
│   │
│   ├── Location/
│   │   ├── LocationManager.swift         # Location services
│   │   └── LocationAuthorizationManager.swift
│   │
│   ├── Analytics/
│   │   ├── AnalyticsManager.swift        # Analytics tracking
│   │   └── AnalyticsEvent.swift          # Event definitions
│   │
│   ├── Logger/
│   │   ├── Logger.swift                  # Unified logging
│   │   └── LogLevel.swift                # Log levels
│   │
│   └── Extensions/
│       ├── View+Extensions.swift         # SwiftUI view helpers
│       ├── Color+Extensions.swift        # Color helpers
│       ├── Bundle+Extensions.swift       # Resource loading
│       └── String+Extensions.swift       # String utilities
│
├── Features/
│   ├── Authentication/
│   │   ├── Domain/
│   │   │   ├── Models/
│   │   │   │   ├── User.swift
│   │   │   │   └── AuthenticationState.swift
│   │   │   └── UseCases/
│   │   │       ├── SignInUseCase.swift
│   │   │       ├── SignUpUseCase.swift
│   │   │       ├── SignOutUseCase.swift
│   │   │       └── SignInWithAppleUseCase.swift
│   │   ├── Data/
│   │   │   ├── Repositories/
│   │   │   │   └── AuthRepository.swift
│   │   │   └── DataSources/
│   │   │       ├── SupabaseAuthDataSource.swift
│   │   │       └── KeychainAuthDataSource.swift
│   │   └── Presentation/
│   │       ├── ViewModels/
│   │       │   ├── AuthenticationViewModel.swift
│   │       │   └── ProfileViewModel.swift
│   │       └── Views/
│   │           ├── SignInView.swift
│   │           ├── SignUpView.swift
│   │           ├── ProfileView.swift
│   │           └── Components/
│   │               ├── SignInWithAppleButton.swift
│   │               └── ProfileHeaderView.swift
│   │
│   ├── Destinations/
│   │   ├── Domain/
│   │   │   ├── Models/
│   │   │   │   ├── Destination.swift
│   │   │   │   ├── Category.swift
│   │   │   │   ├── City.swift
│   │   │   │   └── DestinationFilter.swift
│   │   │   └── UseCases/
│   │   │       ├── FetchDestinationsUseCase.swift
│   │   │       ├── SearchDestinationsUseCase.swift
│   │   │       ├── FilterDestinationsUseCase.swift
│   │   │       └── GetDestinationDetailUseCase.swift
│   │   ├── Data/
│   │   │   ├── Repositories/
│   │   │   │   └── DestinationRepository.swift
│   │   │   ├── DataSources/
│   │   │   │   ├── SupabaseDestinationDataSource.swift
│   │   │   │   └── LocalDestinationDataSource.swift
│   │   │   └── DTO/
│   │   │       └── DestinationDTO.swift
│   │   └── Presentation/
│   │       ├── ViewModels/
│   │       │   ├── DestinationsViewModel.swift
│   │       │   ├── DestinationDetailViewModel.swift
│   │       │   └── SearchViewModel.swift
│   │       └── Views/
│   │           ├── DestinationsView.swift
│   │           ├── DestinationDetailView.swift
│   │           ├── SearchView.swift
│   │           └── Components/
│   │               ├── DestinationCard.swift
│   │               ├── DestinationGridView.swift
│   │               ├── FilterBar.swift
│   │               ├── CategoryPicker.swift
│   │               └── SearchBar.swift
│   │
│   ├── Collections/
│   │   ├── Domain/
│   │   │   ├── Models/
│   │   │   │   ├── Collection.swift
│   │   │   │   ├── SavedDestination.swift
│   │   │   │   └── VisitedPlace.swift
│   │   │   └── UseCases/
│   │   │       ├── SaveDestinationUseCase.swift
│   │   │       ├── UnsaveDestinationUseCase.swift
│   │   │       ├── MarkAsVisitedUseCase.swift
│   │   │       ├── CreateCollectionUseCase.swift
│   │   │       └── AddToCollectionUseCase.swift
│   │   ├── Data/
│   │   │   ├── Repositories/
│   │   │   │   ├── CollectionRepository.swift
│   │   │   │   └── SavedDestinationsRepository.swift
│   │   │   └── DataSources/
│   │   │       └── SupabaseCollectionDataSource.swift
│   │   └── Presentation/
│   │       ├── ViewModels/
│   │       │   ├── SavedViewModel.swift
│   │       │   ├── CollectionsViewModel.swift
│   │       │   └── CollectionDetailViewModel.swift
│   │       └── Views/
│   │           ├── SavedView.swift
│   │           ├── CollectionsView.swift
│   │           ├── CollectionDetailView.swift
│   │           ├── VisitedView.swift
│   │           └── Components/
│   │               ├── CollectionCard.swift
│   │               ├── SaveButton.swift
│   │               └── VisitedBadge.swift
│   │
│   ├── Map/
│   │   ├── Domain/
│   │   │   ├── Models/
│   │   │   │   ├── MapAnnotation.swift
│   │   │   │   └── MapRegion.swift
│   │   │   └── UseCases/
│   │   │       ├── GetNearbyDestinationsUseCase.swift
│   │   │       └── CalculateDistanceUseCase.swift
│   │   ├── Data/
│   │   │   └── Repositories/
│   │   │       └── MapRepository.swift
│   │   └── Presentation/
│   │       ├── ViewModels/
│   │       │   └── MapViewModel.swift
│   │       └── Views/
│   │           ├── MapView.swift
│   │           └── Components/
│   │               ├── DestinationAnnotation.swift
│   │               ├── MapControls.swift
│   │               └── NearbyListView.swift
│   │
│   └── Trips/
│       ├── Domain/
│       │   ├── Models/
│       │   │   ├── Trip.swift
│       │   │   └── TripDay.swift
│       │   └── UseCases/
│       │       ├── CreateTripUseCase.swift
│       │       └── AddDestinationToTripUseCase.swift
│       ├── Data/
│       │   └── Repositories/
│       │       └── TripRepository.swift
│       └── Presentation/
│           ├── ViewModels/
│           │   └── TripsViewModel.swift
│           └── Views/
│               ├── TripsView.swift
│               └── TripDetailView.swift
│
├── DesignSystem/
│   ├── Theme/
│   │   ├── Colors.swift                  # Color definitions
│   │   ├── Typography.swift              # Font styles
│   │   ├── Spacing.swift                 # Layout constants
│   │   ├── Radius.swift                  # Border radius
│   │   └── Shadows.swift                 # Shadow styles
│   │
│   ├── Components/
│   │   ├── Buttons/
│   │   │   ├── PrimaryButton.swift
│   │   │   ├── SecondaryButton.swift
│   │   │   ├── IconButton.swift
│   │   │   └── PillButton.swift
│   │   ├── Cards/
│   │   │   ├── StandardCard.swift
│   │   │   └── ImageCard.swift
│   │   ├── Inputs/
│   │   │   ├── TextField.swift
│   │   │   └── SearchField.swift
│   │   ├── Loading/
│   │   │   ├── LoadingView.swift
│   │   │   ├── SkeletonView.swift
│   │   │   └── ProgressView.swift
│   │   ├── Empty/
│   │   │   └── EmptyStateView.swift
│   │   └── Badges/
│   │       ├── StatusBadge.swift
│   │       └── CategoryBadge.swift
│   │
│   ├── Modifiers/
│   │   ├── CardStyle.swift
│   │   ├── ShimmerModifier.swift
│   │   ├── AdaptiveSheet.swift
│   │   └── HapticFeedback.swift
│   │
│   └── Icons/
│       └── SFSymbols.swift               # SF Symbols catalog
│
├── Widgets/
│   ├── SavedDestinationsWidget/
│   │   ├── SavedDestinationsWidget.swift
│   │   └── SavedDestinationsEntry.swift
│   └── NearbyWidget/
│       └── NearbyWidget.swift
│
├── AppIntents/
│   ├── OpenDestinationIntent.swift
│   └── SearchDestinationIntent.swift
│
├── Resources/
│   ├── Assets.xcassets/
│   │   ├── AppIcon.appiconset/
│   │   ├── Colors/                       # Semantic colors
│   │   └── Images/
│   ├── en.lproj/
│   │   └── Localizable.strings
│   └── Info.plist
│
└── Tests/
    ├── UnitTests/
    │   ├── UseCaseTests/
    │   ├── RepositoryTests/
    │   └── ViewModelTests/
    ├── IntegrationTests/
    │   ├── NetworkTests/
    │   └── StorageTests/
    └── UITests/
        └── DestinationsUITests.swift
```

---

## 🎨 Design System

### Colors (Asset Catalog + Dynamic Colors)

**Semantic Colors** (auto-adapt to dark mode):

```swift
// DesignSystem/Theme/Colors.swift
import SwiftUI

extension Color {
    // MARK: - Backgrounds
    static let backgroundPrimary = Color("BackgroundPrimary")      // white / #0a0a0a
    static let backgroundSecondary = Color("BackgroundSecondary")  // #f9fafb / #1f2937
    static let backgroundTertiary = Color("BackgroundTertiary")    // #f3f4f6 / #111827

    // MARK: - Text
    static let textPrimary = Color("TextPrimary")                  // black / white
    static let textSecondary = Color("TextSecondary")              // #4b5563 / #9ca3af
    static let textTertiary = Color("TextTertiary")                // #9ca3af / #6b7280

    // MARK: - Borders
    static let borderPrimary = Color("BorderPrimary")              // #e5e7eb / #1f2937
    static let borderSecondary = Color("BorderSecondary")          // #d1d5db / #374151

    // MARK: - Status Colors
    static let statusSuccess = Color.green
    static let statusWarning = Color.orange
    static let statusError = Color.red
    static let statusInfo = Color.blue

    // MARK: - Interactive
    static let accentPrimary = Color.primary                       // System accent
    static let interactive = Color("Interactive")                  // Tappable elements

    // MARK: - Overlays
    static let overlayLight = Color.black.opacity(0.05)
    static let overlayMedium = Color.black.opacity(0.1)
    static let overlayDark = Color.black.opacity(0.5)
}
```

### Typography (Dynamic Type Support)

```swift
// DesignSystem/Theme/Typography.swift
import SwiftUI

extension Font {
    // MARK: - Display
    static let displayLarge = Font.system(size: 57, weight: .bold, design: .default)
    static let displayMedium = Font.system(size: 45, weight: .bold, design: .default)
    static let displaySmall = Font.system(size: 36, weight: .bold, design: .default)

    // MARK: - Headline
    static let headlineLarge = Font.system(size: 32, weight: .semibold, design: .default)
    static let headlineMedium = Font.system(size: 28, weight: .semibold, design: .default)
    static let headlineSmall = Font.system(size: 24, weight: .semibold, design: .default)

    // MARK: - Title
    static let titleLarge = Font.system(size: 22, weight: .semibold, design: .default)
    static let titleMedium = Font.system(size: 16, weight: .medium, design: .default)
    static let titleSmall = Font.system(size: 14, weight: .medium, design: .default)

    // MARK: - Body
    static let bodyLarge = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 13, weight: .regular, design: .default)

    // MARK: - Label
    static let labelLarge = Font.system(size: 14, weight: .medium, design: .default)
    static let labelMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let labelSmall = Font.system(size: 11, weight: .medium, design: .default)

    // MARK: - Dynamic Type (Scales with accessibility settings)
    static func scaledBody(_ size: CGFloat = 17) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }
}

// Text styles with accessibility
extension Text {
    func primaryText() -> some View {
        self
            .font(.bodyLarge)
            .foregroundColor(.textPrimary)
    }

    func secondaryText() -> some View {
        self
            .font(.bodyMedium)
            .foregroundColor(.textSecondary)
    }

    func caption() -> some View {
        self
            .font(.labelMedium)
            .foregroundColor(.textTertiary)
    }
}
```

### Spacing

```swift
// DesignSystem/Theme/Spacing.swift
import CoreGraphics

enum Spacing {
    static let xxxs: CGFloat = 2      // Hairline
    static let xxs: CGFloat = 4       // Tight
    static let xs: CGFloat = 8        // Compact
    static let sm: CGFloat = 12       // Small
    static let md: CGFloat = 16       // Medium (baseline)
    static let lg: CGFloat = 24       // Large
    static let xl: CGFloat = 32       // Extra large
    static let xxl: CGFloat = 48      // Huge
    static let xxxl: CGFloat = 64     // Massive

    // Semantic spacing
    static let cardPadding = md
    static let screenPadding = lg
    static let sectionSpacing = xl
    static let itemSpacing = sm
}
```

### Border Radius

```swift
// DesignSystem/Theme/Radius.swift
import CoreGraphics

enum Radius {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let full: CGFloat = 9999

    // Semantic radius
    static let card = xl
    static let button = full
    static let badge = full
    static let sheet = xl
}
```

### SF Symbols Usage

```swift
// DesignSystem/Icons/SFSymbols.swift
import SwiftUI

enum AppIcon {
    // Navigation
    case home, explore, saved, profile, map

    // Actions
    case heart, heartFill, bookmark, bookmarkFill, share, plus, checkmark

    // Categories
    case restaurant, hotel, museum, building, entertainment

    // Status
    case clock, mapPin, star, starFill, crown

    // Navigation
    case chevronRight, chevronLeft, xmark, magnifyingglass

    var systemName: String {
        switch self {
        case .home: return "house"
        case .explore: return "sparkles"
        case .saved: return "heart.fill"
        case .profile: return "person.circle"
        case .map: return "map"
        case .heart: return "heart"
        case .heartFill: return "heart.fill"
        case .bookmark: return "bookmark"
        case .bookmarkFill: return "bookmark.fill"
        case .share: return "square.and.arrow.up"
        case .plus: return "plus"
        case .checkmark: return "checkmark"
        case .restaurant: return "fork.knife"
        case .hotel: return "bed.double"
        case .museum: return "building.columns"
        case .building: return "building.2"
        case .entertainment: return "theatermasks"
        case .clock: return "clock"
        case .mapPin: return "mappin"
        case .star: return "star"
        case .starFill: return "star.fill"
        case .crown: return "crown"
        case .chevronRight: return "chevron.right"
        case .chevronLeft: return "chevron.left"
        case .xmark: return "xmark"
        case .magnifyingglass: return "magnifyingglass"
        }
    }

    func image() -> Image {
        Image(systemName: systemName)
    }
}
```

---

## 🧩 Core Components

### 1. Destination Card

```swift
// Features/Destinations/Presentation/Views/Components/DestinationCard.swift
import SwiftUI

struct DestinationCard: View {
    let destination: Destination
    let onTap: () -> Void

    @State private var imageLoadState: ImageLoadState = .loading

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Image
                AsyncImage(url: destination.imageURL) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color.backgroundSecondary)
                            .aspectRatio(1, contentMode: .fit)
                            .overlay {
                                ProgressView()
                            }
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Rectangle()
                            .fill(Color.backgroundSecondary)
                            .aspectRatio(1, contentMode: .fit)
                            .overlay {
                                AppIcon.mapPin.image()
                                    .foregroundColor(.textTertiary)
                            }
                    @unknown default:
                        EmptyView()
                    }
                }
                .aspectRatio(1, contentMode: .fill)
                .clipShape(RoundedRectangle(cornerRadius: Radius.card))
                .overlay(alignment: .topTrailing) {
                    if destination.isFeatured {
                        Image(systemName: "crown.fill")
                            .font(.caption)
                            .foregroundColor(.yellow)
                            .padding(Spacing.xs)
                    }
                }

                // Title
                Text(destination.name)
                    .font(.titleSmall)
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)

                // Category + City
                HStack(spacing: Spacing.xxs) {
                    Text(destination.category)
                    Text("•")
                    Text(destination.city)
                }
                .font(.labelMedium)
                .foregroundColor(.textSecondary)
                .lineLimit(1)

                // Michelin stars if applicable
                if let stars = destination.michelinStars, stars > 0 {
                    HStack(spacing: 2) {
                        ForEach(0..<stars, id: \.self) { _ in
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                        }
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(destination.name), \(destination.category) in \(destination.city)")
        .accessibilityAddTraits(.isButton)
    }
}
```

### 2. Primary Button

```swift
// DesignSystem/Components/Buttons/PrimaryButton.swift
import SwiftUI

struct PrimaryButton: View {
    let title: String
    let icon: AppIcon?
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    @Environment(\.controlSize) private var controlSize

    init(
        _ title: String,
        icon: AppIcon? = nil,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: {
            HapticManager.shared.impact(.medium)
            action()
        }) {
            HStack(spacing: Spacing.xs) {
                if let icon = icon {
                    icon.image()
                        .font(.body)
                }

                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(.titleMedium)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, verticalPadding)
            .padding(.horizontal, horizontalPadding)
            .background(
                RoundedRectangle(cornerRadius: Radius.button)
                    .fill(isDisabled ? Color.gray : Color.primary)
            )
            .foregroundColor(.white)
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1)
    }

    private var verticalPadding: CGFloat {
        switch controlSize {
        case .mini: return Spacing.xs
        case .small: return Spacing.sm
        case .regular: return Spacing.md
        case .large: return Spacing.lg
        @unknown default: return Spacing.md
        }
    }

    private var horizontalPadding: CGFloat {
        switch controlSize {
        case .mini: return Spacing.md
        case .small: return Spacing.lg
        case .regular: return Spacing.xl
        case .large: return Spacing.xxl
        @unknown default: return Spacing.xl
        }
    }
}
```

---

## 🔄 State Management

### Observation Framework (@Observable)

```swift
// Features/Destinations/Presentation/ViewModels/DestinationsViewModel.swift
import SwiftUI
import Observation

@Observable
@MainActor
final class DestinationsViewModel {
    // MARK: - Published State
    private(set) var destinations: [Destination] = []
    private(set) var isLoading = false
    private(set) var error: Error?
    private(set) var selectedFilters: DestinationFilter = .default

    // MARK: - Dependencies (Injected)
    private let fetchDestinationsUseCase: FetchDestinationsUseCase
    private let searchDestinationsUseCase: SearchDestinationsUseCase

    // MARK: - Private State
    private var searchTask: Task<Void, Never>?

    init(
        fetchDestinationsUseCase: FetchDestinationsUseCase,
        searchDestinationsUseCase: SearchDestinationsUseCase
    ) {
        self.fetchDestinationsUseCase = fetchDestinationsUseCase
        self.searchDestinationsUseCase = searchDestinationsUseCase
    }

    // MARK: - Actions
    func loadDestinations() async {
        isLoading = true
        error = nil

        do {
            destinations = try await fetchDestinationsUseCase.execute()
            isLoading = false
        } catch {
            self.error = error
            isLoading = false
        }
    }

    func search(query: String) {
        // Cancel previous search
        searchTask?.cancel()

        // Debounce search
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))

            guard !Task.isCancelled else { return }

            isLoading = true
            do {
                destinations = try await searchDestinationsUseCase.execute(query: query)
                isLoading = false
            } catch {
                self.error = error
                isLoading = false
            }
        }
    }

    func applyFilter(_ filter: DestinationFilter) {
        selectedFilters = filter
        Task {
            await loadDestinations()
        }
    }
}
```

---

## 🌐 Networking Layer

### Actor-Isolated Network Client

```swift
// Core/Network/NetworkClient.swift
import Foundation

actor NetworkClient {
    // MARK: - Properties
    private let session: URLSession
    private let baseURL: URL

    // MARK: - Initialization
    init(baseURL: URL, configuration: URLSessionConfiguration = .default) {
        self.baseURL = baseURL
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Request Execution
    func request<T: Decodable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        let request = try buildRequest(for: endpoint)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }

    // MARK: - Private Helpers
    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: true)
        components?.queryItems = endpoint.queryItems

        guard let url = components?.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.allHTTPHeaderFields = endpoint.headers
        request.httpBody = endpoint.body
        request.timeoutInterval = 30

        return request
    }
}

// MARK: - Endpoint Protocol
protocol Endpoint {
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String] { get }
    var queryItems: [URLQueryItem]? { get }
    var body: Data? { get }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

// MARK: - Network Errors
enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case noData
    case unauthorized
    case timeout

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .noData:
            return "No data received"
        case .unauthorized:
            return "Unauthorized request"
        case .timeout:
            return "Request timed out"
        }
    }
}
```

---

## 📱 Navigation

### Modern NavigationStack

```swift
// Features/Destinations/Presentation/Views/DestinationsView.swift
import SwiftUI

struct DestinationsView: View {
    @State private var viewModel: DestinationsViewModel
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ScrollView {
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: Spacing.md),
                        GridItem(.flexible(), spacing: Spacing.md)
                    ],
                    spacing: Spacing.lg
                ) {
                    ForEach(viewModel.destinations) { destination in
                        DestinationCard(destination: destination) {
                            navigationPath.append(destination)
                        }
                    }
                }
                .padding(.horizontal, Spacing.screenPadding)
            }
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: Destination.self) { destination in
                DestinationDetailView(destination: destination)
            }
            .searchable(
                text: $viewModel.searchQuery,
                placement: .navigationBarDrawer(displayMode: .always)
            )
            .task {
                await viewModel.loadDestinations()
            }
        }
    }
}
```

---

## ♿ Accessibility

### VoiceOver Support

```swift
// All interactive elements must have:
.accessibilityLabel("Clear and descriptive label")
.accessibilityHint("What happens when activated")
.accessibilityValue("Current state")
.accessibilityAddTraits(.isButton) // or .isHeader, .isImage, etc.

// Custom actions
.accessibilityAction(named: "Save") {
    saveDestination()
}

// Group related elements
.accessibilityElement(children: .combine)

// Hide decorative elements
.accessibilityHidden(true)
```

### Dynamic Type

```swift
// Use scaled fonts
.font(.body) // Automatically scales

// Custom scaling
Text("Title")
    .font(.system(size: 17, weight: .semibold, design: .default))
    .dynamicTypeSize(.medium...(.accessibility3)) // Limit scaling range

// Test with @Environment
@Environment(\.sizeCategory) var sizeCategory

// Adjust layout for large text
if sizeCategory.isAccessibilityCategory {
    VStack { /* Vertical layout */ }
} else {
    HStack { /* Horizontal layout */ }
}
```

---

## 🚀 Performance Optimization

### Image Loading & Caching

```swift
// Use AsyncImage with custom loading and placeholder
AsyncImage(url: imageURL) { phase in
    switch phase {
    case .empty:
        SkeletonView()
    case .success(let image):
        image
            .resizable()
            .aspectRatio(contentMode: .fill)
    case .failure:
        PlaceholderImage()
    @unknown default:
        EmptyView()
    }
}

// Or use custom ImageCache actor
@ImageCache var image: UIImage?
```

### List Performance

```swift
// Use LazyVStack/LazyVGrid for large lists
LazyVStack {
    ForEach(items) { item in
        ItemView(item: item)
    }
}

// Provide stable IDs
extension Destination: Identifiable {
    var id: UUID { uuid }
}

// Use equatable to prevent unnecessary re-renders
extension DestinationCard: Equatable {
    static func == (lhs: DestinationCard, rhs: DestinationCard) -> Bool {
        lhs.destination.id == rhs.destination.id
    }
}
```

### Memory Management

```swift
// Use actors for thread-safe caching
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) -> UIImage? {
        cache[url]
    }

    func store(_ image: UIImage, for url: URL) {
        cache[url] = image
    }

    func clear() {
        cache.removeAll()
    }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```swift
// Test view models
@Test
func testLoadDestinations() async throws {
    // Given
    let mockUseCase = MockFetchDestinationsUseCase()
    let viewModel = DestinationsViewModel(fetchDestinationsUseCase: mockUseCase)

    // When
    await viewModel.loadDestinations()

    // Then
    #expect(viewModel.destinations.count == 10)
    #expect(viewModel.isLoading == false)
}
```

### UI Tests

```swift
// Test navigation flows
@Test
func testDestinationSelection() throws {
    let app = XCUIApplication()
    app.launch()

    // Tap first destination card
    let firstCard = app.buttons["destination-card-0"]
    firstCard.tap()

    // Verify detail view appears
    #expect(app.navigationBars["Destination Detail"].exists)
}
```

---

## 📦 Dependencies

### Swift Package Manager

```swift
// Package.swift dependencies:

// Supabase SDK
.package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")

// For image caching (if not using custom)
// .package(url: "https://github.com/onevcat/Kingfisher", from: "7.10.0")
```

---

## ✅ Quality Checklist

### Code Quality
- [ ] Swift 6 strict concurrency enabled
- [ ] All warnings resolved
- [ ] SwiftLint rules passing
- [ ] No force unwraps (!), use proper optional handling
- [ ] Comprehensive error handling
- [ ] Logging for debugging
- [ ] No retain cycles (use [weak self] where needed)

### Performance
- [ ] 60fps scrolling on iPhone 13
- [ ] < 100ms tap response time
- [ ] < 2 second cold launch
- [ ] < 100MB memory usage (typical)
- [ ] Efficient image loading and caching
- [ ] Minimal network requests

### Accessibility
- [ ] VoiceOver labels on all interactive elements
- [ ] Dynamic Type support throughout
- [ ] Minimum 44x44 tap targets
- [ ] High contrast mode support
- [ ] Reduce motion support
- [ ] Keyboard navigation (iPad)

### Testing
- [ ] 80%+ code coverage
- [ ] All critical paths tested
- [ ] UI tests for main flows
- [ ] Edge cases handled
- [ ] Error states tested

### Design
- [ ] Matches Human Interface Guidelines
- [ ] Consistent spacing and sizing
- [ ] Smooth animations (spring-based)
- [ ] Proper haptic feedback
- [ ] Dark mode support
- [ ] All device sizes supported

---

## 🎯 MVP Feature Priority

### Phase 1 - Core (Week 1-2)
1. ✅ Authentication (Sign in with Apple, Email)
2. ✅ Browse destinations (Grid view, LazyVGrid)
3. ✅ Search & filters
4. ✅ Destination detail view
5. ✅ Basic navigation

### Phase 2 - Collections (Week 3)
6. ✅ Save destinations
7. ✅ Collections/Lists
8. ✅ Visited tracking
9. ✅ Profile view

### Phase 3 - Discovery (Week 4)
10. ✅ Map view with MapKit
11. ✅ Nearby destinations
12. ✅ Personalized recommendations

### Phase 4 - Polish (Week 5-6)
13. ✅ Animations & haptics
14. ✅ Loading & error states
15. ✅ Offline support
16. ✅ Performance optimization
17. ✅ Accessibility audit

### Phase 5 - Advanced (Week 7-8)
18. ✅ Widgets (Lock Screen, Home Screen)
19. ✅ App Intents (Siri, Shortcuts)
20. ✅ Share features
21. ✅ CloudKit sync
22. ✅ iPad optimization

### Phase 6 - Launch (Week 9-10)
23. ✅ App Store assets
24. ✅ Privacy policy
25. ✅ TestFlight beta
26. ✅ App Store submission

---

## 📱 Device Support

**Minimum**: iOS 17.0
**Optimized for**:
- iPhone 13/14/15 (all models)
- iPhone SE (3rd generation)
- iPad Pro, iPad Air, iPad mini
- All screen sizes and orientations

---

## 🔐 Security & Privacy

- **Keychain**: Store auth tokens securely
- **App Transport Security**: Enforce HTTPS
- **Privacy Labels**: Clear data usage disclosure
- **No tracking without consent**
- **Local data encryption**
- **Secure credential handling**

---

## 🚢 App Store Requirements

- **App Name**: Urban Manual
- **Bundle ID**: co.urbanmanual.ios
- **Category**: Travel
- **Content Rating**: 4+
- **Screenshots**: Required for all display sizes
- **App Preview**: Optional but recommended
- **Privacy Policy**: Required (link)
- **Support URL**: Required

---

**This specification represents Apple-quality standards for a production iOS app.**
