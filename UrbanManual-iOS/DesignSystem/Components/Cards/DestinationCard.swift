//
//  DestinationCard.swift
//  Urban Manual
//
//  Destination card component - Core UI element
//  Matches web app's DestinationCard.tsx exactly
//  Displays destination with image, title, category, city, and Michelin stars
//

import SwiftUI

/// Destination card matching web app design
/// Matches web: VStack with aspect-square image, rounded-2xl, border
struct DestinationCard: View {
    // MARK: - Properties

    let destination: Destination
    let onTap: () -> Void

    @State private var isPressed = false

    // MARK: - Body

    var body: some View {
        Button(action: handleTap) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Image container (aspect-square)
                destinationImage
                    .overlay(alignment: .topTrailing) {
                        // Crown badge if featured
                        if destination.isFeatured {
                            crownBadge
                        }
                    }

                // Title
                Text(destination.name)
                    .font(.urbanTitleSmall)
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Category + City metadata
                metadataRow

                // Michelin stars (if applicable)
                if let stars = destination.michelinStars, stars > 0 {
                    michelinStarsView(count: stars)
                }
            }
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabelText)
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Subviews

    @ViewBuilder
    private var destinationImage: some View {
        AsyncImage(url: destination.imageURL) { phase in
            switch phase {
            case .empty:
                imagePlaceholder
                    .overlay {
                        ProgressView()
                            .tint(.textSecondary)
                    }

            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)

            case .failure:
                imagePlaceholder
                    .overlay {
                        UrbanIcon.mapPin.image()
                            .font(.urbanHeadlineMedium)
                            .foregroundColor(.textTertiary)
                    }

            @unknown default:
                imagePlaceholder
            }
        }
        .aspectRatio(1, contentMode: .fill)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card)
                .strokeBorder(Color.borderPrimary, lineWidth: 1)
        )
    }

    private var imagePlaceholder: some View {
        Rectangle()
            .fill(Color.backgroundSecondary)
            .aspectRatio(1, contentMode: .fit)
    }

    private var crownBadge: some View {
        Image(systemName: "crown.fill")
            .font(.urbanLabelMedium)
            .foregroundColor(.crownGold)
            .padding(Spacing.xs)
            .background(
                Circle()
                    .fill(Color.backgroundPrimary.opacity(0.9))
                    .shadow(color: .black.opacity(0.1), radius: 4)
            )
            .padding(Spacing.xs)
    }

    private var metadataRow: some View {
        HStack(spacing: Spacing.metadataGap) {
            Text(destination.category)
            Text("•")
            Text(destination.city)
        }
        .font(.urbanCaptionMedium)
        .foregroundColor(.textSecondary)
        .lineLimit(1)
    }

    private func michelinStarsView(count: Int) -> some View {
        HStack(spacing: 2) {
            ForEach(0..<min(count, 3), id: \.self) { _ in
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.michelinStar)
            }
        }
    }

    // MARK: - Computed Properties

    private var accessibilityLabelText: String {
        var label = "\(destination.name), \(destination.category) in \(destination.city)"
        if destination.isFeatured {
            label += ", Featured destination"
        }
        if let stars = destination.michelinStars, stars > 0 {
            label += ", \(stars) Michelin star\(stars > 1 ? "s" : "")"
        }
        return label
    }

    // MARK: - Actions

    private func handleTap() {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()

        onTap()
    }
}

// MARK: - Equatable (Performance Optimization)

extension DestinationCard: Equatable {
    static func == (lhs: DestinationCard, rhs: DestinationCard) -> Bool {
        lhs.destination.id == rhs.destination.id
    }
}

// MARK: - Destination Model (Temporary for Preview)

/// Temporary destination model for previews
/// TODO: Move to proper domain model
struct Destination: Identifiable {
    let id: UUID
    let name: String
    let slug: String
    let city: String
    let category: String
    let imageURL: URL?
    let isFeatured: Bool
    let michelinStars: Int?

    static let preview = Destination(
        id: UUID(),
        name: "Le Bernardin",
        slug: "le-bernardin",
        city: "New York",
        category: "Dining",
        imageURL: URL(string: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"),
        isFeatured: true,
        michelinStars: 3
    )

    static let previewSimple = Destination(
        id: UUID(),
        name: "The High Line",
        slug: "high-line",
        city: "New York",
        category: "Culture",
        imageURL: URL(string: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25"),
        isFeatured: false,
        michelinStars: nil
    )
}

// MARK: - Previews

#Preview("Destination Cards") {
    VStack(spacing: Spacing.lg) {
        HStack(spacing: Spacing.md) {
            DestinationCard(destination: .preview) {
                print("Card tapped")
            }
            .frame(width: 180)

            DestinationCard(destination: .previewSimple) {
                print("Simple card tapped")
            }
            .frame(width: 180)
        }
    }
    .padding()
}
