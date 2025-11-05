//
//  DestinationDetailView.swift
//  Urban Manual
//
//  Destination detail view with hero image and info
//

import SwiftUI
import MapKit

/// Destination detail view
struct DestinationDetailView: View {
    let destination: Destination

    @Environment(\.dismiss) private var dismiss
    @State private var isSaved = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Hero image
                    heroImage

                    // Content
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Title and category
                        titleSection

                        // Michelin stars
                        if let stars = destination.michelinStars, stars > 0 {
                            michelinBadge(stars: stars)
                        }

                        // Description
                        if let description = destination.description {
                            Text(description)
                                .font(.urbanBodyMedium)
                                .foregroundColor(.textSecondary)
                        }

                        Divider()

                        // Location
                        if let address = destination.address {
                            locationSection(address: address)
                        }

                        // Contact info
                        contactSection

                        // Map
                        if destination.hasLocation {
                            mapSection
                        }
                    }
                    .padding(.horizontal, Spacing.screenPadding)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .glassNavigationBar()
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { dismiss() }) {
                        UrbanIcon.xmark.image()
                            .font(.urbanBodyMedium)
                            .foregroundColor(.textPrimary)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: toggleSave) {
                        (isSaved ? UrbanIcon.heartFill : UrbanIcon.heart).image()
                            .font(.urbanBodyMedium)
                            .foregroundColor(isSaved ? .heart : .textPrimary)
                    }
                }
            }
        }
    }

    // MARK: - Subviews

    private var heroImage: some View {
        AsyncImage(url: destination.imageURL) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            case .empty, .failure:
                Rectangle()
                    .fill(Color.backgroundSecondary)
            @unknown default:
                Rectangle()
                    .fill(Color.backgroundSecondary)
            }
        }
        .frame(height: 300)
        .clipped()
    }

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(destination.name)
                .font(.urbanDisplaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.metadataGap) {
                Text(destination.category)
                Text("•")
                Text(destination.city)
            }
            .font(.urbanBodySmall)
            .foregroundColor(.textSecondary)
        }
    }

    private func michelinBadge(stars: Int) -> some View {
        HStack(spacing: Spacing.xs) {
            ForEach(0..<stars, id: \.self) { _ in
                Image(systemName: "star.fill")
                    .foregroundColor(.michelinStar)
            }
            Text("Michelin")
                .font(.urbanLabelMedium)
        }
        .foregroundColor(.textPrimary)
    }

    private func locationSection(address: String) -> some View {
        HStack(spacing: Spacing.sm) {
            UrbanIcon.mapPin.image()
                .foregroundColor(.textSecondary)

            Text(address)
                .font(.urbanBodySmall)
                .foregroundColor(.textPrimary)
        }
    }

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let phone = destination.googlePhone {
                contactRow(icon: .phone, text: phone)
            }

            if let website = destination.googleWebsite {
                contactRow(icon: .website, text: website)
            }
        }
    }

    private func contactRow(icon: UrbanIcon, text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            icon.image()
                .foregroundColor(.textSecondary)

            Text(text)
                .font(.urbanBodySmall)
                .foregroundColor(.textPrimary)
                .lineLimit(1)
        }
    }

    private var mapSection: some View {
        Map(position: .constant(.region(mapRegion))) {
            if let coordinate = destination.coordinate {
                Marker(destination.name, coordinate: CLLocationCoordinate2D(
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude
                ))
            }
        }
        .frame(height: 200)
        .cardCorners()
        .allowsHitTesting(false)
    }

    private var mapRegion: MKCoordinateRegion {
        guard let coord = destination.coordinate else {
            return MKCoordinateRegion()
        }

        return MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: coord.latitude,
                longitude: coord.longitude
            ),
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    }

    // MARK: - Actions

    private func toggleSave() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        withAnimation(.spring(response: 0.3)) {
            isSaved.toggle()
        }
    }
}

#Preview {
    DestinationDetailView(destination: .preview)
}
