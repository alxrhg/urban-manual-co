//
//  LoadingView.swift
//  Urban Manual
//
//  Loading indicator with optional message
//

import SwiftUI

/// Loading view with spinner and optional message
struct LoadingView: View {
    let message: String?

    init(message: String? = nil) {
        self.message = message
    }

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .tint(.textPrimary)
                .scaleEffect(1.2)

            if let message = message {
                Text(message)
                    .font(.urbanBodySmall)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.backgroundPrimary)
    }
}

/// Skeleton loading view for cards
struct SkeletonView: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Image skeleton
            Rectangle()
                .fill(Color.backgroundSecondary)
                .aspectRatio(1, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: Radius.card))

            // Title skeleton
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.backgroundSecondary)
                .frame(height: 16)
                .frame(maxWidth: .infinity)

            // Metadata skeleton
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.backgroundSecondary)
                .frame(height: 12)
                .frame(width: 120)
        }
        .opacity(isAnimating ? 0.5 : 1.0)
        .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
        .onAppear {
            isAnimating = true
        }
    }
}

#Preview("Loading Views") {
    VStack(spacing: Spacing.xxl) {
        LoadingView(message: "Loading destinations...")
            .frame(height: 200)

        SkeletonView()
            .frame(width: 180)
    }
    .padding()
}
