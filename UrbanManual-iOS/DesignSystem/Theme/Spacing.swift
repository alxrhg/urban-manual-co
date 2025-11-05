//
//  Spacing.swift
//  Urban Manual
//
//  Design System - Spacing Scale
//  Matches web app's Tailwind spacing exactly
//  Based on 4px baseline grid
//

import CoreGraphics
import SwiftUI

/// Spacing values matching web app's Tailwind configuration
/// All values are multiples of 4 (baseline grid)
enum Spacing {
    // MARK: - Core Spacing Scale (Tailwind Scale)

    /// 2px - Hairline spacing
    /// Matches web: space-0.5
    static let xxxs: CGFloat = 2

    /// 4px - Minimal spacing
    /// Matches web: space-1
    static let xxs: CGFloat = 4

    /// 8px - Tight spacing
    /// Matches web: space-2
    static let xs: CGFloat = 8

    /// 12px - Compact spacing
    /// Matches web: space-3
    static let sm: CGFloat = 12

    /// 16px - Medium spacing (baseline)
    /// Matches web: space-4
    static let md: CGFloat = 16

    /// 20px - Medium-large spacing
    /// Matches web: space-5
    static let mdLg: CGFloat = 20

    /// 24px - Large spacing
    /// Matches web: space-6
    static let lg: CGFloat = 24

    /// 32px - Extra large spacing
    /// Matches web: space-8
    static let xl: CGFloat = 32

    /// 48px - Huge spacing
    /// Matches web: space-12
    static let xxl: CGFloat = 48

    /// 64px - Massive spacing
    /// Matches web: space-16
    static let xxxl: CGFloat = 64

    // MARK: - Semantic Spacing (Component-Specific)

    /// Spacing inside cards - 16px
    /// Matches web: p-4 on cards
    static let cardPadding = md

    /// Screen edge padding - 24px (iPhone), 40px (iPad)
    /// Matches web: px-6 md:px-10
    static let screenPadding = lg

    /// Screen edge padding for iPad
    static let screenPaddingLarge: CGFloat = 40

    /// Gap between grid items - 16px
    /// Matches web: gap-4 on grid
    static let gridGap = md

    /// Gap between grid items (larger screens) - 24px
    /// Matches web: gap-6 md:gap-6
    static let gridGapLarge = lg

    /// Gap between list items - 12px
    /// Matches web: gap-3 on lists
    static let listItemGap = sm

    /// Gap between sections - 48px
    /// Matches web: gap-12 on major sections
    static let sectionGap = xxl

    /// Gap between form fields - 16px
    /// Matches web: space-y-4 on forms
    static let formFieldGap = md

    /// Padding for buttons - horizontal: 24px, vertical: 12px
    /// Matches web: px-6 py-3 on primary buttons
    static let buttonPaddingHorizontal = lg
    static let buttonPaddingVertical = sm

    /// Padding for small buttons - horizontal: 16px, vertical: 8px
    /// Matches web: px-4 py-2 on secondary buttons
    static let buttonSmallPaddingHorizontal = md
    static let buttonSmallPaddingVertical = xs

    /// Padding for pill buttons - horizontal: 12px, vertical: 6px
    /// Matches web: px-3 py-1.5 on pill buttons
    static let pillPaddingHorizontal = sm
    static let pillPaddingVertical: CGFloat = 6

    /// Spacing between icon and text in buttons/labels
    /// Matches web: gap-1.5 (6px)
    static let iconTextGap: CGFloat = 6

    /// Spacing in HStack for metadata (category • city)
    /// Matches web: gap-1.5 on metadata rows
    static let metadataGap: CGFloat = 6

    // MARK: - Safe Area Insets

    /// Top safe area offset
    static let safeAreaTop: CGFloat = 0

    /// Bottom safe area offset (for tab bar)
    static let safeAreaBottom: CGFloat = 0
}

// MARK: - Edge Insets

extension EdgeInsets {
    /// Standard card padding - 16px all sides
    /// Matches web: p-4
    static let cardPadding = EdgeInsets(
        top: Spacing.md,
        leading: Spacing.md,
        bottom: Spacing.md,
        trailing: Spacing.md
    )

    /// Screen edge padding - 24px horizontal
    /// Matches web: px-6
    static let screenPadding = EdgeInsets(
        top: 0,
        leading: Spacing.screenPadding,
        bottom: 0,
        trailing: Spacing.screenPadding
    )

    /// Modal padding - 24px all sides
    /// Matches web: p-6 on modals
    static let modalPadding = EdgeInsets(
        top: Spacing.lg,
        leading: Spacing.lg,
        bottom: Spacing.lg,
        trailing: Spacing.lg
    )

    /// List item padding - 16px horizontal, 12px vertical
    static let listItemPadding = EdgeInsets(
        top: Spacing.sm,
        leading: Spacing.md,
        bottom: Spacing.sm,
        trailing: Spacing.md
    )
}

// MARK: - View Extensions for Spacing

extension View {
    /// Apply standard screen padding (24px horizontal)
    /// Matches web: px-6 md:px-10
    func screenPadding() -> some View {
        self.padding(.horizontal, Spacing.screenPadding)
    }

    /// Apply card padding (16px all sides)
    /// Matches web: p-4
    func cardPadding() -> some View {
        self.padding(Spacing.cardPadding)
    }

    /// Apply section spacing (48px top)
    func sectionSpacing() -> some View {
        self.padding(.top, Spacing.sectionGap)
    }
}
