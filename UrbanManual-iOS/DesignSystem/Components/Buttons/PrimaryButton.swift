//
//  PrimaryButton.swift
//  Urban Manual
//
//  Primary action button matching web app design
//  Full width, rounded-full, black background (light mode)
//

import SwiftUI

/// Primary action button - Full width, prominent
/// Matches web: bg-black dark:bg-white text-white dark:text-black rounded-full px-6 py-3
struct PrimaryButton: View {
    // MARK: - Properties

    let title: String
    let icon: UrbanIcon?
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    // MARK: - Initialization

    init(
        _ title: String,
        icon: UrbanIcon? = nil,
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

    // MARK: - Body

    var body: some View {
        Button(action: handleAction) {
            HStack(spacing: Spacing.iconTextGap) {
                if let icon = icon, !isLoading {
                    icon.image()
                        .font(.urbanTitleMedium)
                }

                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(.urbanTitleMedium)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.buttonPaddingVertical)
            .padding(.horizontal, Spacing.buttonPaddingHorizontal)
            .background(
                Capsule()
                    .fill(buttonBackground)
            )
            .foregroundColor(buttonForeground)
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1)
        .animation(.easeInOut(duration: 0.2), value: isDisabled)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }

    // MARK: - Computed Properties

    private var buttonBackground: Color {
        isDisabled ? .gray : .textPrimary
    }

    private var buttonForeground: Color {
        .backgroundPrimary
    }

    // MARK: - Actions

    private func handleAction() {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        action()
    }
}

// MARK: - Previews

#Preview("Primary Button") {
    VStack(spacing: Spacing.md) {
        PrimaryButton("Sign In") {
            print("Sign in tapped")
        }

        PrimaryButton("Save", icon: .heart) {
            print("Save tapped")
        }

        PrimaryButton("Loading", isLoading: true) {
            print("Loading...")
        }

        PrimaryButton("Disabled", isDisabled: true) {
            print("Disabled")
        }
    }
    .padding()
}
