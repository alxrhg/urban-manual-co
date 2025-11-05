//
//  IconButton.swift
//  Urban Manual
//
//  Icon-only button for toolbar actions
//  Circular with background
//

import SwiftUI

/// Icon-only button - Circular with optional background
/// Matches web: p-2.5 bg-white/90 dark:bg-gray-900/90 rounded-full
struct IconButton: View {
    // MARK: - Style

    enum Style {
        case filled      // With background
        case ghost       // No background
        case outlined    // With border
    }

    // MARK: - Properties

    let icon: UrbanIcon
    let style: Style
    let action: () -> Void
    var size: UrbanIcon.Size = .medium
    var accessibilityLabel: String

    // MARK: - Initialization

    init(
        icon: UrbanIcon,
        style: Style = .filled,
        size: UrbanIcon.Size = .medium,
        accessibilityLabel: String,
        action: @escaping () -> Void
    ) {
        self.icon = icon
        self.style = style
        self.size = size
        self.accessibilityLabel = accessibilityLabel
        self.action = action
    }

    // MARK: - Body

    var body: some View {
        Button(action: handleAction) {
            icon.image()
                .font(size.font)
                .foregroundColor(foregroundColor)
                .frame(width: buttonSize, height: buttonSize)
                .background(background)
        }
        .accessibilityLabel(accessibilityLabel)
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Computed Properties

    private var buttonSize: CGFloat {
        size.points + 20 // Add padding around icon
    }

    private var foregroundColor: Color {
        switch style {
        case .filled:
            return .textPrimary
        case .ghost, .outlined:
            return .textPrimary
        }
    }

    @ViewBuilder
    private var background: some View {
        switch style {
        case .filled:
            Circle()
                .fill(Color.backgroundPrimary.opacity(0.9))
                .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        case .ghost:
            Circle()
                .fill(Color.clear)
        case .outlined:
            Circle()
                .strokeBorder(Color.borderPrimary, lineWidth: 1)
                .background(Circle().fill(Color.backgroundPrimary))
        }
    }

    // MARK: - Actions

    private func handleAction() {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()

        action()
    }
}

// MARK: - Previews

#Preview("Icon Buttons") {
    VStack(spacing: Spacing.lg) {
        HStack(spacing: Spacing.md) {
            IconButton(
                icon: .heart,
                style: .filled,
                accessibilityLabel: "Save"
            ) {
                print("Heart tapped")
            }

            IconButton(
                icon: .share,
                style: .filled,
                accessibilityLabel: "Share"
            ) {
                print("Share tapped")
            }

            IconButton(
                icon: .xmark,
                style: .filled,
                accessibilityLabel: "Close"
            ) {
                print("Close tapped")
            }
        }

        HStack(spacing: Spacing.md) {
            IconButton(
                icon: .heart,
                style: .ghost,
                accessibilityLabel: "Save"
            ) {
                print("Ghost heart")
            }

            IconButton(
                icon: .filter,
                style: .outlined,
                accessibilityLabel: "Filter"
            ) {
                print("Filter")
            }
        }
    }
    .padding()
}
