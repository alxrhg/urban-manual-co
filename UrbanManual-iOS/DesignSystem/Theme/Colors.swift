//
//  Colors.swift
//  Urban Manual
//
//  Design System - Color Palette
//  Matches web app's minimalist black/white/gray aesthetic
//  All colors support automatic dark mode switching
//

import SwiftUI

extension Color {
    // MARK: - Backgrounds

    /// Primary background - White (light) / #0A0A0A (dark)
    /// Matches web: bg-white / dark:bg-[#0a0a0a]
    static let backgroundPrimary = Color("BackgroundPrimary")

    /// Secondary background - #F9FAFB (light) / #1F2937 (dark)
    /// Matches web: bg-gray-50 / dark:bg-gray-900
    static let backgroundSecondary = Color("BackgroundSecondary")

    /// Tertiary background - #F3F4F6 (light) / #111827 (dark)
    /// Matches web: bg-gray-100 / dark:bg-gray-800
    static let backgroundTertiary = Color("BackgroundTertiary")

    // MARK: - Text Colors

    /// Primary text - Black (light) / White (dark)
    /// Matches web: text-black / dark:text-white
    static let textPrimary = Color("TextPrimary")

    /// Secondary text - #4B5563 (light) / #9CA3AF (dark)
    /// Matches web: text-gray-600 / dark:text-gray-400
    static let textSecondary = Color("TextSecondary")

    /// Tertiary text - #9CA3AF (light) / #6B7280 (dark)
    /// Matches web: text-gray-400 / dark:text-gray-500
    static let textTertiary = Color("TextTertiary")

    // MARK: - Borders

    /// Primary border - #E5E7EB (light) / #1F2937 (dark)
    /// Matches web: border-gray-200 / dark:border-gray-800
    static let borderPrimary = Color("BorderPrimary")

    /// Secondary border - #D1D5DB (light) / #374151 (dark)
    /// Matches web: border-gray-300 / dark:border-gray-700
    static let borderSecondary = Color("BorderSecondary")

    // MARK: - Status Colors (Use Sparingly - Match Web App)

    /// Success color - #10B981 (green-500)
    /// Matches web: text-green-600 / bg-green-50
    static let statusSuccess = Color.green

    /// Warning color - #F59E0B (orange-500)
    /// Matches web: text-orange-600 / bg-orange-50
    static let statusWarning = Color.orange

    /// Error color - #EF4444 (red-500)
    /// Matches web: text-red-600 / bg-red-50
    static let statusError = Color.red

    /// Info color - #3B82F6 (blue-500)
    /// Matches web: text-blue-600 / bg-blue-50
    static let statusInfo = Color.blue

    // MARK: - Interactive Elements

    /// Accent/primary interactive color - System accent or black
    /// Used for primary buttons and key interactive elements
    static let accentPrimary = Color.primary

    /// Interactive elements that should stand out
    /// Matches web: hover states and active elements
    static let interactive = Color("Interactive")

    // MARK: - Overlays

    /// Light overlay - Black 5% opacity
    /// Used for subtle backgrounds
    static let overlayLight = Color.black.opacity(0.05)

    /// Medium overlay - Black 10% opacity
    /// Used for card backgrounds
    static let overlayMedium = Color.black.opacity(0.1)

    /// Dark overlay - Black 50% opacity
    /// Used for modal backgrounds
    static let overlayDark = Color.black.opacity(0.5)

    // MARK: - Semantic Colors

    /// Heart/Save color - Matches web app's heart icon
    static let heart = Color.red

    /// Michelin star color
    static let michelinStar = Color.yellow

    /// Crown/Featured badge color
    static let crownGold = Color.yellow

    // MARK: - Helper Initializers

    /// Initialize color from hex string
    /// - Parameter hex: Hex color string (e.g., "#0A0A0A" or "0A0A0A")
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Color Asset Names

/// Color asset names for reference
/// These should be created in Assets.xcassets
enum ColorAsset: String {
    case backgroundPrimary = "BackgroundPrimary"
    case backgroundSecondary = "BackgroundSecondary"
    case backgroundTertiary = "BackgroundTertiary"
    case textPrimary = "TextPrimary"
    case textSecondary = "TextSecondary"
    case textTertiary = "TextTertiary"
    case borderPrimary = "BorderPrimary"
    case borderSecondary = "BorderSecondary"
    case interactive = "Interactive"
}
