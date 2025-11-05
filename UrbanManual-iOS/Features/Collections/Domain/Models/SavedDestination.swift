//
//  SavedDestination.swift
//  Urban Manual
//
//  Saved destination model
//

import Foundation

/// Saved destination model
struct SavedDestination: Identifiable, Codable, Sendable {
    let id: Int
    let userId: UUID
    let destinationId: UUID
    let savedAt: Date
    let notes: String?
    let collectionId: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case destinationId = "destination_id"
        case savedAt = "saved_at"
        case notes
        case collectionId = "collection_id"
    }
}

/// Collection model
struct Collection: Identifiable, Codable, Sendable {
    let id: Int
    let userId: UUID
    let name: String
    let description: String?
    let emoji: String?
    let color: String?
    let isPublic: Bool
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name, description, emoji, color
        case isPublic = "is_public"
        case createdAt = "created_at"
    }
}

/// Visited place model
struct VisitedPlace: Identifiable, Codable, Sendable {
    let id: Int
    let userId: UUID
    let destinationSlug: String
    let visitedAt: Date
    let rating: Int?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case destinationSlug = "destination_slug"
        case visitedAt = "visited_at"
        case rating, notes
    }
}
