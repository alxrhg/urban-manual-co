//
//  SavedDestinationsRepository.swift
//  Urban Manual
//
//  Repository for saved destinations
//

import Foundation

/// Saved destinations repository
actor SavedDestinationsRepository {
    static let shared = SavedDestinationsRepository()

    private let supabase = SupabaseManager.shared
    private var cachedSaved: [SavedDestination] = []

    private init() {}

    // MARK: - Fetch

    /// Fetch saved destinations for current user
    func fetchSaved() async throws -> [SavedDestination] {
        guard let userId = await AuthenticationManager.shared.currentUser?.id else {
            throw SupabaseError.unauthorized
        }

        let saved: [SavedDestination] = try await supabase.database()
            .from("saved_destinations")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("saved_at", ascending: false)
            .execute()
            .value

        cachedSaved = saved
        return saved
    }

    /// Check if destination is saved
    func isSaved(destinationId: UUID) async -> Bool {
        cachedSaved.contains { $0.destinationId == destinationId }
    }

    // MARK: - Save

    /// Save a destination
    func save(destinationId: UUID, notes: String? = nil, collectionId: Int? = nil) async throws {
        guard let userId = await AuthenticationManager.shared.currentUser?.id else {
            throw SupabaseError.unauthorized
        }

        struct SaveRequest: Encodable {
            let userId: String
            let destinationId: String
            let notes: String?
            let collectionId: Int?

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case destinationId = "destination_id"
                case notes
                case collectionId = "collection_id"
            }
        }

        let request = SaveRequest(
            userId: userId.uuidString,
            destinationId: destinationId.uuidString,
            notes: notes,
            collectionId: collectionId
        )

        try await supabase.database()
            .from("saved_destinations")
            .insert(request)
            .execute()

        // Refresh cache
        _ = try? await fetchSaved()
    }

    /// Unsave a destination
    func unsave(destinationId: UUID) async throws {
        guard let userId = await AuthenticationManager.shared.currentUser?.id else {
            throw SupabaseError.unauthorized
        }

        try await supabase.database()
            .from("saved_destinations")
            .delete()
            .eq("user_id", value: userId.uuidString)
            .eq("destination_id", value: destinationId.uuidString)
            .execute()

        // Update cache
        cachedSaved.removeAll { $0.destinationId == destinationId }
    }

    // MARK: - Collections

    /// Fetch collections
    func fetchCollections() async throws -> [Collection] {
        guard let userId = await AuthenticationManager.shared.currentUser?.id else {
            throw SupabaseError.unauthorized
        }

        let collections: [Collection] = try await supabase.database()
            .from("lists")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .execute()
            .value

        return collections
    }

    /// Create collection
    func createCollection(name: String, description: String?, emoji: String?, color: String?, isPublic: Bool) async throws -> Collection {
        guard let userId = await AuthenticationManager.shared.currentUser?.id else {
            throw SupabaseError.unauthorized
        }

        struct CreateRequest: Encodable {
            let userId: String
            let name: String
            let description: String?
            let emoji: String?
            let color: String?
            let isPublic: Bool

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case name, description, emoji, color
                case isPublic = "is_public"
            }
        }

        let request = CreateRequest(
            userId: userId.uuidString,
            name: name,
            description: description,
            emoji: emoji,
            color: color,
            isPublic: isPublic
        )

        let collection: Collection = try await supabase.database()
            .from("lists")
            .insert(request)
            .select()
            .single()
            .execute()
            .value

        return collection
    }
}
