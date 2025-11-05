# Urban Manual iOS App - Implementation Roadmap

**Status**: 🚧 **Foundation Complete - Ready for Core Development**
**Date**: January 2025
**Target**: Apple-Quality iOS 18 Native App

---

## ✅ Phase 1: Foundation & Design System (COMPLETED)

### Documentation Created
- [x] iOS Rebuild Specification (40+ pages technical spec)
- [x] iOS 18 Design Adaptation Guide (design patterns matching web app)
- [x] Implementation Roadmap (this document)

### Design System Implementation
- [x] **Theme Layer** - Complete color, typography, spacing, radius systems
  - `Colors.swift` - Semantic color palette matching web app
  - `Typography.swift` - Font scale matching Tailwind
  - `Spacing.swift` - Spacing scale matching Tailwind
  - `Radius.swift` - Border radius matching web app
  - `Icons.swift` - SF Symbols 6 icon system

- [x] **Button Components**
  - `PrimaryButton.swift` - Full-width action button
  - `SecondaryButton.swift` - Outlined button
  - `IconButton.swift` - Icon-only button (3 styles)

- [x] **Card Components**
  - `DestinationCard.swift` - Main destination card (matches web exactly)

### Project Structure
- [x] Modern MVVM architecture with Clean Architecture principles
- [x] Feature-based organization (Authentication, Destinations, Collections, Map, Profile)
- [x] Design System separation for reusability
- [x] Core infrastructure foundation

---

## 🚧 Phase 2: Core Infrastructure (IN PROGRESS)

### Network Layer
- [ ] **NetworkClient.swift** - Actor-isolated URLSession wrapper
- [ ] **Endpoint.swift** - API endpoint protocol
- [ ] **NetworkError.swift** - Comprehensive error handling
- [ ] **SupabaseClient.swift** - Supabase SDK integration

### Storage Layer
- [ ] **CacheManager.swift** - Actor-isolated image/data caching
- [ ] **KeychainManager.swift** - Secure credential storage
- [ ] **UserDefaultsManager.swift** - Settings persistence
- [ ] **ImageCache.swift** - Dedicated image caching

### Core Extensions
- [ ] **View+Extensions.swift** - SwiftUI view helpers
- [ ] **Color+Extensions.swift** - Additional color utilities
- [ ] **String+Extensions.swift** - String utilities
- [ ] **Date+Extensions.swift** - Date formatting

### Utilities
- [ ] **Logger.swift** - Unified logging system
- [ ] **HapticManager.swift** - Haptic feedback manager
- [ ] **LocationManager.swift** - Core Location wrapper

---

## 📋 Phase 3: Domain Models (NEXT)

### Destination Domain
- [ ] **Destination.swift** - Full destination model
- [ ] **Category.swift** - Category enum with icons
- [ ] **City.swift** - City model
- [ ] **DestinationFilter.swift** - Filter options

### User Domain
- [ ] **User.swift** - User profile model
- [ ] **AuthenticationState.swift** - Auth state enum

### Collections Domain
- [ ] **Collection.swift** - User collection model
- [ ] **SavedDestination.swift** - Saved destination model
- [ ] **VisitedPlace.swift** - Visited place model

### Trip Domain
- [ ] **Trip.swift** - Trip/itinerary model
- [ ] **TripDay.swift** - Day in trip

---

## 🌐 Phase 4: Data Layer

### Repositories (Actor-Isolated)
- [ ] **DestinationRepository.swift** - Destination data access
- [ ] **AuthRepository.swift** - Authentication operations
- [ ] **CollectionRepository.swift** - Collections management
- [ ] **SavedDestinationsRepository.swift** - Save/unsave operations

### Data Sources
- [ ] **SupabaseDestinationDataSource.swift** - Fetch from Supabase
- [ ] **SupabaseAuthDataSource.swift** - Auth with Supabase
- [ ] **LocalDestinationDataSource.swift** - Local caching
- [ ] **KeychainAuthDataSource.swift** - Secure token storage

### Use Cases
- [ ] **FetchDestinationsUseCase.swift**
- [ ] **SearchDestinationsUseCase.swift**
- [ ] **SaveDestinationUseCase.swift**
- [ ] **SignInUseCase.swift**
- [ ] **SignInWithAppleUseCase.swift**

---

## 🎨 Phase 5: UI Components (Additional)

### Loading Components
- [ ] **LoadingView.swift** - Spinner with message
- [ ] **SkeletonView.swift** - Skeleton loader
- [ ] **ProgressView.swift** - Progress indicator

### Status Components
- [ ] **StatusBadge.swift** - Open/Closed/Busy badges
- [ ] **CategoryBadge.swift** - Category pills
- [ ] **MichelinBadge.swift** - Michelin star display

### Input Components
- [ ] **SearchField.swift** - Search input with icon
- [ ] **TextField.swift** - Standard text input
- [ ] **FilterBar.swift** - Horizontal filter chips

### Empty States
- [ ] **EmptyStateView.swift** - Generic empty state
- [ ] **EmptySavedView.swift** - No saved destinations
- [ ] **EmptySearchView.swift** - No search results

---

## 📱 Phase 6: Feature Implementation

### 6.1 Authentication Feature (Week 1)
- [ ] **Sign In View** - Email/password sign in
- [ ] **Sign Up View** - New user registration
- [ ] **Sign in with Apple** - Apple OAuth integration
- [ ] **Profile View** - User profile display
- [ ] **Edit Profile View** - Update user info
- [ ] **AuthViewModel** - Authentication state (@Observable)

**Dependencies**: Core network layer, KeychainManager, SupabaseAuth

### 6.2 Destinations Feature (Week 1-2)
- [ ] **DestinationsView** - Main grid view with search
- [ ] **DestinationDetailView** - Full destination details
- [ ] **SearchViewModel** - Search with debouncing
- [ ] **FilterView** - Category/city filters
- [ ] **DestinationsViewModel** - State management
- [ ] **Zoom transitions** - iOS 18 zoom effect

**Dependencies**: DestinationRepository, image caching

### 6.3 Collections Feature (Week 2)
- [ ] **SavedView** - Saved destinations list
- [ ] **CollectionsView** - User's collections
- [ ] **CollectionDetailView** - Single collection
- [ ] **CreateCollectionView** - New collection form
- [ ] **VisitedView** - Visited places with stats
- [ ] **SavedViewModel** - State management
- [ ] **CollectionsViewModel** - Collections state

**Dependencies**: CollectionRepository, SavedRepository

### 6.4 Map Feature (Week 3)
- [ ] **MapView** - MapKit integration
- [ ] **DestinationAnnotation** - Custom map pins
- [ ] **MapControls** - Zoom, location, filter
- [ ] **NearbyList** - Nearby destinations list
- [ ] **MapViewModel** - Map state management
- [ ] **Clustering** - Annotation clustering

**Dependencies**: LocationManager, MapKit

### 6.5 Profile & Settings (Week 3)
- [ ] **ProfileView** - User profile with stats
- [ ] **SettingsView** - App settings
- [ ] **AchievementsView** - User achievements
- [ ] **StatsView** - Travel statistics
- [ ] **EditProfileView** - Profile editing

---

## 🚀 Phase 7: iOS 18 Features (Week 4)

### Widgets
- [ ] **SavedDestinationsWidget** - Lock Screen widget
- [ ] **NearbyWidget** - Location-based widget
- [ ] **StatsWidget** - Travel stats widget

### Live Activities
- [ ] **TripLiveActivity** - Trip progress tracking
- [ ] **Dynamic Island** - Compact/expanded views

### Control Widgets
- [ ] **SavedControl** - Quick save from Control Center
- [ ] **SearchControl** - Quick search access

### App Intents
- [ ] **OpenDestinationIntent** - Siri support
- [ ] **SearchDestinationIntent** - Siri search
- [ ] **SaveDestinationIntent** - Siri save

---

## 🏗️ Phase 8: App Structure & Navigation (Week 4)

### Main App
- [ ] **UrbanManualApp.swift** - App entry point
- [ ] **MainTabView.swift** - Bottom tab navigation
- [ ] **NavigationCoordinator.swift** - Navigation management
- [ ] **DeepLinkHandler.swift** - Deep link handling

### Environment Setup
- [ ] **Configuration.swift** - App configuration
- [ ] **Environment.swift** - Environment detection
- [ ] **Secrets.swift** - API keys management

---

## ♿ Phase 9: Accessibility & Polish (Week 5)

### Accessibility
- [ ] VoiceOver labels on all interactive elements
- [ ] Dynamic Type support throughout
- [ ] Minimum 44x44 tap targets verified
- [ ] High contrast mode testing
- [ ] Reduce motion support
- [ ] Keyboard navigation (iPad)

### Animations & Transitions
- [ ] Spring-based animations
- [ ] Zoom transitions (iOS 18)
- [ ] Scroll transitions (iOS 18)
- [ ] Haptic feedback on interactions
- [ ] Loading state animations
- [ ] Empty state animations

### Performance Optimization
- [ ] Image caching strategy
- [ ] Lazy loading for lists
- [ ] Background fetch setup
- [ ] Memory management audit
- [ ] Launch time optimization
- [ ] 60fps scrolling verified

---

## 🧪 Phase 10: Testing (Week 5-6)

### Unit Tests
- [ ] ViewModel tests (80%+ coverage)
- [ ] Use case tests
- [ ] Repository tests (with mocks)
- [ ] Network layer tests

### UI Tests
- [ ] Critical user flows
- [ ] Authentication flow
- [ ] Search and filter
- [ ] Save/unsave actions
- [ ] Navigation tests

### Integration Tests
- [ ] End-to-end flows
- [ ] Supabase integration
- [ ] Network error handling

---

## 📦 Phase 11: Launch Preparation (Week 6-7)

### App Store Requirements
- [ ] **App Icon** - All sizes (1024x1024 master)
- [ ] **Screenshots** - All device sizes
  - iPhone 6.7" (Pro Max)
  - iPhone 6.5" (Plus)
  - iPhone 5.5" (SE)
  - iPad Pro 12.9"
  - iPad Pro 11"
- [ ] **App Preview Video** - 30 second demo
- [ ] **App Store Description** - Copy from web app
- [ ] **Keywords** - SEO optimization
- [ ] **Privacy Policy** - Legal review
- [ ] **Support URL** - Help documentation

### Build Configuration
- [ ] Production Supabase keys
- [ ] Code signing certificates
- [ ] Push notification setup
- [ ] Analytics integration
- [ ] Crash reporting (optional)

### TestFlight Beta
- [ ] Internal testing (team)
- [ ] External testing (users)
- [ ] Feedback collection
- [ ] Bug fixes

### Final Submission
- [ ] App Store Connect submission
- [ ] Review notes preparation
- [ ] App Store review process
- [ ] Launch coordination with web app

---

## 📊 Progress Tracking

### Current Status
- **Foundation**: ✅ 100% Complete
- **Design System**: ✅ 70% Complete (theme + core components)
- **Core Infrastructure**: 🚧 0% (Next priority)
- **Domain Models**: ⏳ 0%
- **Data Layer**: ⏳ 0%
- **Features**: ⏳ 0%
- **Testing**: ⏳ 0%
- **Launch Prep**: ⏳ 0%

### Overall Progress: ~15%

---

## 🎯 Immediate Next Steps

1. **Complete Design System Components**
   - StatusBadge.swift
   - LoadingView.swift
   - SkeletonView.swift
   - SearchField.swift

2. **Build Core Infrastructure**
   - NetworkClient with Supabase integration
   - CacheManager for images
   - KeychainManager for secure storage
   - Essential extensions

3. **Create Domain Models**
   - Destination (full model)
   - User
   - Collection
   - SavedDestination

4. **Start Authentication Feature**
   - Sign In View
   - Sign in with Apple integration
   - Auth state management

---

## 📝 Development Guidelines

### Code Quality Standards
- ✅ Swift 6 strict concurrency enabled
- ✅ No force unwraps - proper optional handling
- ✅ Comprehensive error handling
- ✅ SwiftLint rules passing
- ✅ All warnings resolved
- ✅ Accessibility labels on all UI
- ✅ Unit tests for business logic

### Design Standards
- ✅ Match web app visual design exactly
- ✅ Use Design System components only
- ✅ Support dark mode everywhere
- ✅ Dynamic Type support
- ✅ Haptic feedback on interactions
- ✅ 60fps animations
- ✅ Loading states for all async operations

### Git Workflow
- Commit frequently with clear messages
- Branch: `claude/rebuild-ios-swift-app-011CUqHpz33NKEriCeFpuLby`
- Push when major milestones complete
- Keep commit history clean and descriptive

---

## 🚀 Estimated Timeline

- **Week 1**: Core infrastructure + Auth + Destinations browse
- **Week 2**: Destinations detail + Collections + Saved
- **Week 3**: Map feature + Profile + Settings
- **Week 4**: iOS 18 features + Polish
- **Week 5**: Accessibility + Performance + Testing
- **Week 6**: TestFlight + Bug fixes
- **Week 7**: App Store submission

**Total**: ~7 weeks to production-ready app

---

## 📚 Resources

### Documentation
- [iOS Rebuild Specification](./IOS_REBUILD_SPECIFICATION.md)
- [iOS 18 Design Adaptation](./IOS18_DESIGN_ADAPTATION.md)
- [Web App Design System](./DESIGN_SYSTEM.md)
- [Brand Guidelines](./BRAND_GUIDELINES.md)

### External
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols 6](https://developer.apple.com/sf-symbols/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)

---

**Last Updated**: January 2025
**Next Review**: After Phase 2 completion
