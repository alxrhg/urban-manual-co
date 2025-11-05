//
//  SecondaryButton.swift
//  Urban Manual
//
//  Secondary action button matching web app design
//  Outlined style with border
//

import SwiftUI

/// Secondary action button - Outlined style
/// Matches web: border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2
struct SecondaryButton: View {
    // MARK: - Properties

    let title: String
    let icon: UrbanIcon?
    let action: () -> Void
    var isDisabled: Bool = false

    // MARK: - Initialization

    init(
        _ title: String,
        icon: UrbanIcon? = nil,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.isDisabled = isDisabled
        self.action = action
    }

    // MARK: - Body

    var body: some View {
        Button(action: handleAction) {
            HStack(spacing: Spacing.iconTextGap) {
                if let icon = icon {
                    icon.image()
                        .font(.urbanTitleSmall)
                }

                Text(title)
                    .font(.urbanTitleSmall)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.buttonSmallPaddingVertical)
            .padding(.horizontal, Spacing.buttonSmallPaddingHorizontal)
            .background(
                Capsule()
                    .strokeBorder(Color.borderPrimary, lineWidth: 1)
                    .background(
                        Capsule()
                            .fill(Color.backgroundPrimary)
                    )
            )
            .foregroundColor(.textPrimary)
        }
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
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

#Preview("Secondary Button") {
    VStack(spacing: Spacing.md) {
        SecondaryButton("Cancel") {
            print("Cancel tapped")
        }

        SecondaryButton("Filter", icon: .filter) {
            print("Filter tapped")
        }

        SecondaryButton("Disabled", isDisabled: true) {
            print("Disabled")
        }
    }
    .padding()
}
