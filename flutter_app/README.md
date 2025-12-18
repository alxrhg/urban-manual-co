# Urban Manual iOS App

Native iOS app for Urban Manual, built with Flutter and featuring over-the-air updates via Shorebird.

## Features

- Native iOS Cupertino design
- Browse 897+ curated destinations worldwide
- Search and filter by city, category, and more
- Save favorite destinations
- Google and Apple Sign-In authentication
- Offline support with local caching
- OTA updates via Shorebird (no App Store review needed for patches)

## Tech Stack

- **Flutter 3.x** with Dart
- **Riverpod** for state management
- **GoRouter** for navigation
- **Supabase** for backend (shared with web app)
- **Shorebird** for OTA code push updates
- **Cupertino widgets** for native iOS feel

## Getting Started

### Prerequisites

1. Install Flutter SDK (3.16+)
2. Install Xcode (for iOS development)
3. Install Shorebird CLI

```bash
# Install Flutter
# See: https://docs.flutter.dev/get-started/install

# Install Shorebird
curl --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/shorebirdtech/install/main/install.sh -sSf | bash
```

### Setup

1. **Install dependencies**
```bash
cd flutter_app
flutter pub get
```

2. **Generate code** (for Freezed models)
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

3. **Configure environment variables**

Create a `.env` file or use dart-define flags:
```bash
flutter run \
  --dart-define=SUPABASE_URL=your_supabase_url \
  --dart-define=SUPABASE_ANON_KEY=your_supabase_anon_key \
  --dart-define=MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

4. **Initialize Shorebird**
```bash
shorebird init
```
This will create an app in the Shorebird console and update `shorebird.yaml`.

### Development

```bash
# Run on iOS simulator
flutter run

# Run with specific environment
flutter run --dart-define=PRODUCTION=false
```

### Building for Release

#### Standard Flutter Build
```bash
flutter build ios --release
```

#### Shorebird Build (for OTA updates)
```bash
# First release (submits to App Store)
shorebird release ios

# Subsequent patches (OTA, no App Store review)
shorebird patch ios
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── app.dart                  # CupertinoApp configuration
├── config/
│   ├── env.dart             # Environment variables
│   ├── theme.dart           # Cupertino theme
│   └── router.dart          # GoRouter configuration
├── core/
│   └── models/              # Data models (Freezed)
├── features/
│   ├── home/                # Home screen & providers
│   ├── explore/             # Explore/cities screen
│   ├── search/              # Search functionality
│   ├── saved/               # Saved places
│   ├── profile/             # User profile
│   ├── auth/                # Authentication
│   ├── destination/         # Destination details
│   └── city/                # City view
└── shared/
    └── widgets/             # Reusable UI components
```

## Shorebird OTA Updates

Shorebird allows you to push code updates directly to users without going through App Store review:

1. **First release**: Submit to App Store normally with `shorebird release ios`
2. **Bug fixes/updates**: Push patches instantly with `shorebird patch ios`
3. Updates are applied on next app launch

### Limitations
- Can only patch Dart code (not native iOS code)
- Cannot add new permissions or change app metadata
- Users must be on the same major version

## iOS Configuration

### Required Capabilities
- Sign in with Apple
- Push Notifications (optional)
- Background Fetch (for update checks)

### URL Schemes
- `io.urbanmanual.app://` - OAuth callback

### Info.plist Keys
- `NSLocationWhenInUseUsageDescription` - For map features
- `NSCameraUsageDescription` - For profile photos (optional)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `MAPBOX_ACCESS_TOKEN` | Yes | Mapbox API token |
| `SENTRY_DSN` | No | Sentry error tracking |
| `PRODUCTION` | No | Production mode flag |

## Testing

```bash
# Run unit tests
flutter test

# Run integration tests
flutter test integration_test/
```

## Deployment Checklist

- [ ] Update version in `pubspec.yaml`
- [ ] Run `flutter analyze` for lint errors
- [ ] Run all tests
- [ ] Build with `shorebird release ios` (first release) or `shorebird patch ios` (update)
- [ ] Test on physical device
- [ ] Submit to App Store (if new release)

## Links

- [Urban Manual Web](https://www.urbanmanual.co)
- [Shorebird Documentation](https://docs.shorebird.dev)
- [Flutter Documentation](https://docs.flutter.dev)
