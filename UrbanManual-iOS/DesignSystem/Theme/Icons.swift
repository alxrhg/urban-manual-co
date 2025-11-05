//
//  Icons.swift
//  Urban Manual
//
//  Design System - SF Symbols Icon System
//  Centralized icon definitions using SF Symbols 6
//  iOS 18 compatible with animation support
//

import SwiftUI

/// Urban Manual icon system using SF Symbols
/// All icons are semantic and support iOS 18 animations
enum UrbanIcon {
    // MARK: - Navigation

    case home
    case explore
    case saved
    case collections
    case map
    case profile
    case search

    // MARK: - Categories

    case dining
    case hotel
    case culture
    case museum
    case entertainment
    case shopping
    case nightlife
    case bar
    case cafe
    case activity

    // MARK: - Status & Features

    case michelinStar
    case featured
    case verified
    case trending
    case crown
    case open
    case closed

    // MARK: - Actions

    case heart
    case heartFill
    case bookmark
    case bookmarkFill
    case share
    case plus
    case minus
    case checkmark
    case xmark
    case ellipsis
    case edit
    case delete
    case info

    // MARK: - Navigation UI

    case chevronRight
    case chevronLeft
    case chevronUp
    case chevronDown
    case arrowLeft
    case arrowRight

    // MARK: - Location & Map

    case mapPin
    case mapPinFill
    case location
    case locationFill
    case directions
    case compass
    case globe

    // MARK: - Time & Date

    case clock
    case calendar
    case sunrise
    case sunset

    // MARK: - Social & Sharing

    case instagram
    case website
    case phone
    case email
    case link

    // MARK: - User & Account

    case person
    case personFill
    case personCircle
    case logout
    case settings
    case camera

    // MARK: - Filters & Sort

    case filter
    case sort
    case list
    case grid
    case slidersHorizontal

    // MARK: - System

    case magnifyingglass
    case trash
    case star
    case starFill
    case flag
    case photo

    /// SF Symbol name for the icon
    var systemName: String {
        switch self {
        // Navigation
        case .home: return "house.fill"
        case .explore: return "sparkles"
        case .saved: return "heart.fill"
        case .collections: return "square.stack.3d.up.fill"
        case .map: return "map.fill"
        case .profile: return "person.crop.circle.fill"
        case .search: return "magnifyingglass"

        // Categories
        case .dining: return "fork.knife.circle.fill"
        case .hotel: return "bed.double.circle.fill"
        case .culture: return "building.columns.circle.fill"
        case .museum: return "building.2.crop.circle.fill"
        case .entertainment: return "theatermasks.circle.fill"
        case .shopping: return "bag.circle.fill"
        case .nightlife: return "moon.stars.circle.fill"
        case .bar: return "wineglass.fill"
        case .cafe: return "cup.and.saucer.fill"
        case .activity: return "figure.walk"

        // Status & Features
        case .michelinStar: return "star.circle.fill"
        case .featured: return "crown.fill"
        case .verified: return "checkmark.seal.fill"
        case .trending: return "chart.line.uptrend.xyaxis"
        case .crown: return "crown.fill"
        case .open: return "checkmark.circle.fill"
        case .closed: return "xmark.circle.fill"

        // Actions
        case .heart: return "heart"
        case .heartFill: return "heart.fill"
        case .bookmark: return "bookmark"
        case .bookmarkFill: return "bookmark.fill"
        case .share: return "square.and.arrow.up"
        case .plus: return "plus"
        case .minus: return "minus"
        case .checkmark: return "checkmark"
        case .xmark: return "xmark"
        case .ellipsis: return "ellipsis"
        case .edit: return "pencil"
        case .delete: return "trash"
        case .info: return "info.circle"

        // Navigation UI
        case .chevronRight: return "chevron.right"
        case .chevronLeft: return "chevron.left"
        case .chevronUp: return "chevron.up"
        case .chevronDown: return "chevron.down"
        case .arrowLeft: return "arrow.left"
        case .arrowRight: return "arrow.right"

        // Location & Map
        case .mapPin: return "mappin"
        case .mapPinFill: return "mappin.circle.fill"
        case .location: return "location"
        case .locationFill: return "location.fill"
        case .directions: return "arrow.triangle.turn.up.right.circle.fill"
        case .compass: return "location.north.circle.fill"
        case .globe: return "globe"

        // Time & Date
        case .clock: return "clock"
        case .calendar: return "calendar"
        case .sunrise: return "sunrise"
        case .sunset: return "sunset"

        // Social & Sharing
        case .instagram: return "camera.circle.fill"
        case .website: return "safari"
        case .phone: return "phone.fill"
        case .email: return "envelope.fill"
        case .link: return "link"

        // User & Account
        case .person: return "person"
        case .personFill: return "person.fill"
        case .personCircle: return "person.crop.circle"
        case .logout: return "rectangle.portrait.and.arrow.right"
        case .settings: return "gearshape.fill"
        case .camera: return "camera.fill"

        // Filters & Sort
        case .filter: return "line.3.horizontal.decrease.circle"
        case .sort: return "arrow.up.arrow.down"
        case .list: return "list.bullet"
        case .grid: return "square.grid.2x2"
        case .slidersHorizontal: return "slider.horizontal.3"

        // System
        case .magnifyingglass: return "magnifyingglass"
        case .trash: return "trash"
        case .star: return "star"
        case .starFill: return "star.fill"
        case .flag: return "flag.fill"
        case .photo: return "photo"
        }
    }

    /// Get SwiftUI Image for the icon
    /// - Parameter renderingMode: Image rendering mode (default: .template)
    /// - Returns: SwiftUI Image
    func image(renderingMode: Image.TemplateRenderingMode = .template) -> Image {
        Image(systemName: systemName)
            .renderingMode(renderingMode)
    }

    /// Get icon with specific configuration
    /// - Parameters:
    ///   - size: Icon size (default: .body)
    ///   - weight: Icon weight (default: .regular)
    ///   - color: Icon color (default: .textPrimary)
    /// - Returns: Configured Image view
    @ViewBuilder
    func styledIcon(
        size: Font = .body,
        weight: Font.Weight = .regular,
        color: Color = .textPrimary
    ) -> some View {
        Image(systemName: systemName)
            .font(size.weight(weight))
            .foregroundColor(color)
    }
}

// MARK: - Icon Size Presets

extension UrbanIcon {
    /// Standard icon sizes matching design system
    enum Size {
        case tiny      // 12px
        case small     // 16px
        case medium    // 20px
        case large     // 24px
        case extraLarge // 32px
        case huge      // 48px

        var points: CGFloat {
            switch self {
            case .tiny: return 12
            case .small: return 16
            case .medium: return 20
            case .large: return 24
            case .extraLarge: return 32
            case .huge: return 48
            }
        }

        var font: Font {
            .system(size: points)
        }
    }

    /// Icon with specific size
    /// - Parameter size: Icon size preset
    /// - Returns: Sized Image view
    func sized(_ size: Size) -> some View {
        Image(systemName: systemName)
            .font(size.font)
    }
}

// MARK: - Category Icon Mapping

extension UrbanIcon {
    /// Get icon for a destination category
    /// - Parameter category: Category name (e.g., "Dining", "Hotels")
    /// - Returns: Appropriate icon for the category
    static func forCategory(_ category: String) -> UrbanIcon {
        let lowercased = category.lowercased()
        if lowercased.contains("restaurant") || lowercased.contains("dining") {
            return .dining
        } else if lowercased.contains("hotel") || lowercased.contains("accommodation") {
            return .hotel
        } else if lowercased.contains("museum") {
            return .museum
        } else if lowercased.contains("culture") || lowercased.contains("art") {
            return .culture
        } else if lowercased.contains("entertainment") || lowercased.contains("show") {
            return .entertainment
        } else if lowercased.contains("shop") || lowercased.contains("retail") {
            return .shopping
        } else if lowercased.contains("bar") || lowercased.contains("nightlife") {
            return .nightlife
        } else if lowercased.contains("cafe") || lowercased.contains("coffee") {
            return .cafe
        } else {
            return .mapPin
        }
    }
}

// MARK: - iOS 18 Symbol Effects

#if swift(>=6.0)
@available(iOS 18.0, *)
extension UrbanIcon {
    /// Icon with bounce animation (iOS 18)
    /// Perfect for "save" actions
    func bounce() -> some View {
        Image(systemName: systemName)
            .symbolEffect(.bounce)
    }

    /// Icon with pulse animation (iOS 18)
    /// Perfect for "loading" or "active" states
    func pulse() -> some View {
        Image(systemName: systemName)
            .symbolEffect(.pulse)
    }

    /// Icon with variable color animation (iOS 18)
    /// Perfect for fill animations
    func variableColor() -> some View {
        Image(systemName: systemName)
            .symbolEffect(.variableColor)
    }
}
#endif
