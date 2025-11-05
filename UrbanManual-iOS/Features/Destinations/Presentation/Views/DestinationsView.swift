//
//  DestinationsView.swift
//  Urban Manual
//
//  Main destinations browse view with grid layout
//  iOS 26 Liquid Glass navigation
//

import SwiftUI

/// Main destinations view with search and grid
struct DestinationsView: View {
    @State private var viewModel = DestinationsViewModel()
    @State private var selectedDestination: Destination?

    // Grid columns
    private let columns = [
        GridItem(.flexible(), spacing: Spacing.gridGap),
        GridItem(.flexible(), spacing: Spacing.gridGap)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading && viewModel.destinations.isEmpty {
                    loadingView
                } else if viewModel.destinations.isEmpty {
                    emptyView
                } else {
                    destinationGrid
                }
            }
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .glassNavigationBar()
            .searchable(
                text: $viewModel.searchQuery,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search destinations"
            )
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                if viewModel.destinations.isEmpty {
                    await viewModel.loadDestinations()
                }
            }
            .sheet(item: $selectedDestination) { destination in
                DestinationDetailView(destination: destination)
            }
        }
    }

    // MARK: - Subviews

    private var destinationGrid: some View {
        LazyVGrid(columns: columns, spacing: Spacing.gridGap) {
            ForEach(viewModel.filteredDestinations) { destination in
                DestinationCard(destination: destination) {
                    selectedDestination = destination
                }
                // iOS 26 - Scroll transition
                .scrollTransition { content, phase in
                    content
                        .opacity(phase.isIdentity ? 1 : 0.7)
                        .scaleEffect(phase.isIdentity ? 1 : 0.95)
                }
            }
        }
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.bottom, Spacing.xxl)
    }

    private var loadingView: some View {
        LazyVGrid(columns: columns, spacing: Spacing.gridGap) {
            ForEach(0..<6, id: \.self) { _ in
                SkeletonView()
            }
        }
        .padding(.horizontal, Spacing.screenPadding)
    }

    private var emptyView: some View {
        VStack(spacing: Spacing.lg) {
            UrbanIcon.mapPin.sized(.huge)
                .foregroundColor(.textTertiary)

            Text("No destinations found")
                .font(.urbanHeadlineMedium)
                .foregroundColor(.textPrimary)

            Text("Try adjusting your search or filters")
                .font(.urbanBodySmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, Spacing.xxxl)
    }
}

#Preview {
    DestinationsView()
}
