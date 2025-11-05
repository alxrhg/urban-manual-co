//
//  Radius.swift
//  Urban Manual
//
//  Design System - Border Radius Scale
//  Matches web app's Tailwind border radius
//

import CoreGraphics
import SwiftUI

/// Border radius values matching web app's Tailwind configuration
enum Radius {
    // MARK: - Core Radius Scale

    /// 4px - Extra small radius
    /// Matches web: rounded (0.25rem)
    static let xs: CGFloat = 4

    /// 8px - Small radius
    /// Matches web: rounded-lg (0.5rem)
    static let sm: CGFloat = 8

    /// 12px - Medium radius
    /// Matches web: rounded-xl (0.75rem)
    static let md: CGFloat = 12

    /// 16px - Large radius
    /// Matches web: rounded-2xl (1rem)
    static let lg: CGFloat = 16

    /// 20px - Extra large radius
    /// Matches web: rounded-2xl+ (1.25rem)
    static let xl: CGFloat = 20

    /// 24px - Huge radius
    /// Matches web: rounded-3xl (1.5rem)
    static let xxl: CGFloat = 24

    /// 9999px - Full circle/pill
    /// Matches web: rounded-full
    static let full: CGFloat = 9999

    // MARK: - Semantic Radius (Component-Specific)

    /// Border radius for destination cards - 16px
    /// Matches web: rounded-2xl on DestinationCard
    static let card = lg

    /// Border radius for buttons - Full circle
    /// Matches web: rounded-full on buttons
    static let button = full

    /// Border radius for badges/pills - Full circle
    /// Matches web: rounded-full on badges
    static let badge = full

    /// Border radius for input fields - 12px
    /// Matches web: rounded-lg on inputs
    static let input = md

    /// Border radius for sheets/modals - 20px
    /// iOS native: 16px, but we use 20px for consistency
    static let sheet = xl

    /// Border radius for images - 16px
    /// Matches web: rounded-2xl on images
    static let image = lg

    /// Border radius for small elements (tags, small badges) - 8px
    /// Matches web: rounded-lg on small components
    static let small = sm
}

// MARK: - RoundedRectangle Presets

extension RoundedRectangle {
    /// Card corner radius (16px)
    /// Matches web: rounded-2xl
    static func card() -> RoundedRectangle {
        RoundedRectangle(cornerRadius: Radius.card)
    }

    /// Button corner radius (full circle)
    /// Matches web: rounded-full
    static func button() -> RoundedRectangle {
        RoundedRectangle(cornerRadius: Radius.button)
    }

    /// Badge corner radius (full circle)
    /// Matches web: rounded-full
    static func badge() -> RoundedRectangle {
        RoundedRectangle(cornerRadius: Radius.badge)
    }

    /// Input field corner radius (12px)
    /// Matches web: rounded-lg
    static func input() -> RoundedRectangle {
        RoundedRectangle(cornerRadius: Radius.input)
    }
}

// MARK: - View Extensions for Border Radius

extension View {
    /// Apply card corner radius (16px rounded rectangle)
    /// Matches web: rounded-2xl
    func cardCorners() -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: Radius.card))
    }

    /// Apply button corner radius (capsule)
    /// Matches web: rounded-full
    func buttonCorners() -> some View {
        self.clipShape(Capsule())
    }

    /// Apply badge corner radius (capsule)
    /// Matches web: rounded-full
    func badgeCorners() -> some View {
        self.clipShape(Capsule())
    }

    /// Apply input corner radius (12px rounded rectangle)
    /// Matches web: rounded-lg
    func inputCorners() -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: Radius.input))
    }

    /// Apply custom corner radius
    /// - Parameter radius: Corner radius value
    func corners(radius: CGFloat) -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: radius))
    }
}
