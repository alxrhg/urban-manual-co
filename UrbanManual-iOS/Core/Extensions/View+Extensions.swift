//
//  View+Extensions.swift
//  Urban Manual
//
//  SwiftUI View extensions for common patterns
//

import SwiftUI

extension View {
    // MARK: - Spacing

    /// Apply standard screen padding (24px horizontal)
    func screenPadding() -> some View {
        self.padding(.horizontal, Spacing.screenPadding)
    }

    /// Apply card padding (16px all sides)
    func cardPadding() -> some View {
        self.padding(Spacing.cardPadding)
    }

    // MARK: - Corner Radius

    /// Apply card corner radius (16px)
    func cardCorners() -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: Radius.card))
    }

    /// Apply button corner radius (capsule)
    func buttonCorners() -> some View {
        self.clipShape(Capsule())
    }

    // MARK: - Conditional Modifiers

    /// Apply modifier conditionally
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    // MARK: - iOS 26 Liquid Glass

    /// Apply Liquid Glass effect (iOS 26)
    func liquidGlass() -> some View {
        self
            .background(.regularMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.card)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.3),
                                Color.clear,
                                Color.white.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }

    /// Apply glass navigation bar effect
    func glassNavigationBar() -> some View {
        self
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackgroundVisibility(.visible, for: .navigationBar)
    }

    // MARK: - Haptic Feedback

    /// Trigger haptic feedback
    func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> some View {
        self.onTapGesture {
            let generator = UIImpactFeedbackGenerator(style: style)
            generator.impactOccurred()
        }
    }
}
