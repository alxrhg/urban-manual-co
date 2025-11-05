//
//  Typography.swift
//  Urban Manual
//
//  Design System - Typography Scale
//  Matches web app's font sizes exactly (Tailwind scale)
//  Supports Dynamic Type for accessibility
//

import SwiftUI

extension Font {
    // MARK: - Display Sizes (Page Titles)

    /// Display Large - 48px
    /// Matches web: text-5xl (48px)
    /// Use for: Main page titles, hero text
    static let urbanDisplayLarge = Font.system(size: 48, weight: .bold, design: .default)

    /// Display Medium - 36px
    /// Matches web: text-4xl (36px)
    /// Use for: Section titles
    static let urbanDisplayMedium = Font.system(size: 36, weight: .bold, design: .default)

    /// Display Small - 24px
    /// Matches web: text-2xl (24px)
    /// Use for: Subsection titles
    static let urbanDisplaySmall = Font.system(size: 24, weight: .bold, design: .default)

    // MARK: - Headlines

    /// Headline Large - 24px semibold
    /// Matches web: text-2xl font-semibold
    /// Use for: Card group headers
    static let urbanHeadlineLarge = Font.system(size: 24, weight: .semibold, design: .default)

    /// Headline Medium - 20px semibold
    /// Matches web: text-xl font-semibold
    /// Use for: Section headers
    static let urbanHeadlineMedium = Font.system(size: 20, weight: .semibold, design: .default)

    /// Headline Small - 18px semibold
    /// Matches web: text-lg font-semibold
    /// Use for: List headers
    static let urbanHeadlineSmall = Font.system(size: 18, weight: .semibold, design: .default)

    // MARK: - Titles

    /// Title Large - 18px medium
    /// Matches web: text-lg font-medium
    /// Use for: Modal titles
    static let urbanTitleLarge = Font.system(size: 18, weight: .medium, design: .default)

    /// Title Medium - 16px medium
    /// Matches web: text-base font-medium
    /// Use for: Button text, form labels
    static let urbanTitleMedium = Font.system(size: 16, weight: .medium, design: .default)

    /// Title Small - 14px medium
    /// Matches web: text-sm font-medium
    /// Use for: Card titles, tab labels
    static let urbanTitleSmall = Font.system(size: 14, weight: .medium, design: .default)

    // MARK: - Body Text

    /// Body Large - 17px regular (iOS standard)
    /// Matches web: text-base (16px), iOS native: 17px
    /// Use for: Main body copy (iOS native size for better readability)
    static let urbanBodyLarge = Font.system(size: 17, weight: .regular, design: .default)

    /// Body Medium - 16px regular
    /// Matches web: text-base (16px)
    /// Use for: Body text, descriptions
    static let urbanBodyMedium = Font.system(size: 16, weight: .regular, design: .default)

    /// Body Small - 15px regular
    /// Matches web: text-sm (14px), iOS: 15px for better mobile readability
    /// Use for: Secondary body text
    static let urbanBodySmall = Font.system(size: 15, weight: .regular, design: .default)

    // MARK: - Labels / Captions

    /// Label Large - 14px medium
    /// Matches web: text-sm font-medium
    /// Use for: Input labels, metadata
    static let urbanLabelLarge = Font.system(size: 14, weight: .medium, design: .default)

    /// Label Medium - 12px medium
    /// Matches web: text-xs font-medium
    /// Use for: Badges, pills, small buttons
    static let urbanLabelMedium = Font.system(size: 12, weight: .medium, design: .default)

    /// Label Small - 11px medium
    /// Use for: Tiny labels, timestamps
    static let urbanLabelSmall = Font.system(size: 11, weight: .medium, design: .default)

    // MARK: - Captions

    /// Caption Large - 13px regular
    /// Use for: Image captions
    static let urbanCaptionLarge = Font.system(size: 13, weight: .regular, design: .default)

    /// Caption Medium - 12px regular
    /// Matches web: text-xs (12px)
    /// Use for: Metadata, timestamps, secondary info
    static let urbanCaptionMedium = Font.system(size: 12, weight: .regular, design: .default)

    /// Caption Small - 11px regular
    /// Use for: Fine print
    static let urbanCaptionSmall = Font.system(size: 11, weight: .regular, design: .default)

    // MARK: - Dynamic Type Variants (Accessibility)

    /// Scaled headline that adapts to user's text size settings
    /// - Parameter baseSize: Base font size (default: 24)
    /// - Returns: Font that scales with Dynamic Type
    static func scaledHeadline(size baseSize: CGFloat = 24) -> Font {
        .system(size: baseSize, weight: .semibold, design: .default)
    }

    /// Scaled body text that adapts to user's text size settings
    /// - Parameter baseSize: Base font size (default: 16)
    /// - Returns: Font that scales with Dynamic Type
    static func scaledBody(size baseSize: CGFloat = 16) -> Font {
        .system(size: baseSize, weight: .regular, design: .default)
    }

    /// Scaled caption that adapts to user's text size settings
    /// - Parameter baseSize: Base font size (default: 12)
    /// - Returns: Font that scales with Dynamic Type
    static func scaledCaption(size baseSize: CGFloat = 12) -> Font {
        .system(size: baseSize, weight: .regular, design: .default)
    }
}

// MARK: - Text Style Modifiers

extension Text {
    /// Apply primary text style
    /// - Black text, body medium font
    func primaryText() -> some View {
        self
            .font(.urbanBodyMedium)
            .foregroundColor(.textPrimary)
    }

    /// Apply secondary text style
    /// - Gray text, body small font
    func secondaryText() -> some View {
        self
            .font(.urbanBodySmall)
            .foregroundColor(.textSecondary)
    }

    /// Apply tertiary text style
    /// - Light gray text, caption font
    func tertiaryText() -> some View {
        self
            .font(.urbanCaptionMedium)
            .foregroundColor(.textTertiary)
    }

    /// Apply headline style
    /// - Black text, headline large font
    func headlineText() -> some View {
        self
            .font(.urbanHeadlineLarge)
            .foregroundColor(.textPrimary)
    }

    /// Apply title style
    /// - Black text, title medium font
    func titleText() -> some View {
        self
            .font(.urbanTitleMedium)
            .foregroundColor(.textPrimary)
    }
}

// MARK: - Typography Constants

/// Typography scale matching web app
enum Typography {
    /// Font sizes matching web app's Tailwind configuration
    enum Size {
        static let xxxs: CGFloat = 10  // Tiny
        static let xxs: CGFloat = 11   // Extra small
        static let xs: CGFloat = 12    // text-xs
        static let sm: CGFloat = 14    // text-sm
        static let base: CGFloat = 16  // text-base
        static let lg: CGFloat = 18    // text-lg
        static let xl: CGFloat = 20    // text-xl
        static let xxl: CGFloat = 24   // text-2xl
        static let xxxl: CGFloat = 36  // text-4xl
        static let display: CGFloat = 48  // text-5xl
    }

    /// Font weights
    enum Weight {
        static let regular: Font.Weight = .regular     // font-normal (400)
        static let medium: Font.Weight = .medium       // font-medium (500)
        static let semibold: Font.Weight = .semibold   // font-semibold (600)
        static let bold: Font.Weight = .bold           // font-bold (700)
    }

    /// Line heights (for custom text styling)
    enum LineHeight {
        static let tight: CGFloat = 1.1   // leading-tight
        static let normal: CGFloat = 1.5  // leading-normal
        static let relaxed: CGFloat = 1.7 // leading-relaxed
    }
}
