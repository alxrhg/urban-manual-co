//
//  SavedView.swift
//  Urban Manual
//
//  Saved destinations view
//

import SwiftUI

/// Saved destinations view
struct SavedView: View {
    @State private var savedDestinations: [Destination] = Destination.previews

    private let columns = [
        GridItem(.flexible(), spacing: Spacing.gridGap),
        GridItem(.flexible(), spacing: Spacing.gridGap)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                if savedDestinations.isEmpty {
                    emptyState
                } else {
                    LazyVGrid(columns: columns, spacing: Spacing.gridGap) {
                        ForEach(savedDestinations) { destination in
                            DestinationCard(destination: destination) {
                                // Navigate to detail
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.screenPadding)
                }
            }
            .navigationTitle("Saved")
            .navigationBarTitleDisplayMode(.large)
            .glassNavigationBar()
        }
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.lg) {
            UrbanIcon.heartFill.sized(.huge)
                .foregroundColor(.textTertiary)

            Text("No saved destinations")
                .font(.urbanHeadlineMedium)
                .foregroundColor(.textPrimary)

            Text("Start exploring and save your favorite places")
                .font(.urbanBodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, Spacing.xxl)
        .padding(.top, Spacing.xxxl)
    }
}

#Preview {
    SavedView()
}
