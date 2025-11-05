//
//  Destination.swift
//  Urban Manual
//
//  Core destination model
//  Matches Supabase database schema
//

import Foundation

/// Destination model matching database schema
struct Destination: Identifiable, Codable, Hashable, Sendable {
    // MARK: - Core Properties

    let id: UUID
    let name: String
    let slug: String
    let city: String
    let category: String
    let description: String?

    // MARK: - Location

    let address: String?
    let latitude: Double?
    let longitude: Double?

    // MARK: - Media

    let imageURL: URL?
    let imageAlt: String?

    // MARK: - Features

    let isFeatured: Bool
    let michelinStars: Int?
    let priceLevel: Int?

    // MARK: - Google Place Data

    let googlePlaceId: String?
    let googleRating: Double?
    let googlePhone: String?
    let googleWebsite: String?
    let instagramURL: String?

    // MARK: - Metadata

    let createdAt: Date?
    let updatedAt: Date?

    // MARK: - Computed Properties

    var coordinate: Coordinate? {
        guard let lat = latitude, let lon = longitude else { return nil }
        return Coordinate(latitude: lat, longitude: lon)
    }

    var hasLocation: Bool {
        latitude != nil && longitude != nil
    }

    var priceIndicator: String {
        guard let price = priceLevel else { return "" }
        return String(repeating: "$", count: min(price, 4))
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id, name, slug, city, category, description
        case address, latitude, longitude
        case imageAlt = "image_alt"
        case isFeatured = "crown"
        case michelinStars = "michelin_stars"
        case priceLevel = "price_level"
        case googlePlaceId = "google_place_id"
        case googleRating = "google_rating"
        case googlePhone = "google_phone"
        case googleWebsite = "google_website"
        case instagramURL = "instagram_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"

        // Handle image URL separately
        case image
    }

    // MARK: - Custom Decoding

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        slug = try container.decode(String.self, forKey: .slug)
        city = try container.decode(String.self, forKey: .city)
        category = try container.decode(String.self, forKey: .category)
        description = try container.decodeIfPresent(String.self, forKey: .description)

        address = try container.decodeIfPresent(String.self, forKey: .address)
        latitude = try container.decodeIfPresent(Double.self, forKey: .latitude)
        longitude = try container.decodeIfPresent(Double.self, forKey: .longitude)

        // Handle image URL string
        if let imageString = try container.decodeIfPresent(String.self, forKey: .image) {
            imageURL = URL(string: imageString)
        } else {
            imageURL = nil
        }
        imageAlt = try container.decodeIfPresent(String.self, forKey: .imageAlt)

        isFeatured = try container.decodeIfPresent(Bool.self, forKey: .isFeatured) ?? false
        michelinStars = try container.decodeIfPresent(Int.self, forKey: .michelinStars)
        priceLevel = try container.decodeIfPresent(Int.self, forKey: .priceLevel)

        googlePlaceId = try container.decodeIfPresent(String.self, forKey: .googlePlaceId)
        googleRating = try container.decodeIfPresent(Double.self, forKey: .googleRating)
        googlePhone = try container.decodeIfPresent(String.self, forKey: .googlePhone)
        googleWebsite = try container.decodeIfPresent(String.self, forKey: .googleWebsite)
        instagramURL = try container.decodeIfPresent(String.self, forKey: .instagramURL)

        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }

    // MARK: - Manual Init

    init(
        id: UUID,
        name: String,
        slug: String,
        city: String,
        category: String,
        description: String? = nil,
        address: String? = nil,
        latitude: Double? = nil,
        longitude: Double? = nil,
        imageURL: URL? = nil,
        imageAlt: String? = nil,
        isFeatured: Bool = false,
        michelinStars: Int? = nil,
        priceLevel: Int? = nil,
        googlePlaceId: String? = nil,
        googleRating: Double? = nil,
        googlePhone: String? = nil,
        googleWebsite: String? = nil,
        instagramURL: String? = nil,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.slug = slug
        self.city = city
        self.category = category
        self.description = description
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.imageURL = imageURL
        self.imageAlt = imageAlt
        self.isFeatured = isFeatured
        self.michelinStars = michelinStars
        self.priceLevel = priceLevel
        self.googlePlaceId = googlePlaceId
        self.googleRating = googleRating
        self.googlePhone = googlePhone
        self.googleWebsite = googleWebsite
        self.instagramURL = instagramURL
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Coordinate

struct Coordinate: Codable, Hashable, Sendable {
    let latitude: Double
    let longitude: Double
}

// MARK: - Preview Data

extension Destination {
    static let preview = Destination(
        id: UUID(),
        name: "Le Bernardin",
        slug: "le-bernardin-new-york",
        city: "New York",
        category: "Dining",
        description: "Celebrated seafood restaurant with elegant French cuisine and impeccable service.",
        address: "155 W 51st St, New York, NY 10019",
        latitude: 40.761284,
        longitude: -73.980977,
        imageURL: URL(string: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"),
        isFeatured: true,
        michelinStars: 3,
        priceLevel: 4,
        googleRating: 4.8
    )

    static let previews: [Destination] = [
        preview,
        Destination(
            id: UUID(),
            name: "The High Line",
            slug: "high-line-new-york",
            city: "New York",
            category: "Culture",
            description: "Elevated park built on historic freight rail line.",
            latitude: 40.747994,
            longitude: -74.004765,
            imageURL: URL(string: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25"),
            isFeatured: false
        )
    ]
}
