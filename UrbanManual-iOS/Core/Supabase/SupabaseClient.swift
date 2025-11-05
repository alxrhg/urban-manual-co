//
//  SupabaseClient.swift
//  Urban Manual
//
//  Supabase client wrapper
//  Provides access to Supabase services
//

import Foundation
import Supabase

/// Shared Supabase client
actor SupabaseManager {
    static let shared = SupabaseManager()

    private let client: SupabaseClient

    private init() {
        self.client = SupabaseClient(
            supabaseURL: Configuration.supabaseURL,
            supabaseKey: Configuration.supabaseAnonKey
        )
    }

    // MARK: - Database Access

    func database() -> PostgrestClient {
        client.database
    }

    // MARK: - Auth Access

    func auth() -> AuthClient {
        client.auth
    }

    // MARK: - Storage Access

    func storage() -> StorageClient {
        client.storage
    }

    // MARK: - Realtime Access

    func realtime() -> RealtimeClient {
        client.realtime
    }
}

// MARK: - Convenience Extensions

extension SupabaseManager {
    /// Fetch destinations from Supabase
    func fetchDestinations(
        limit: Int = 100,
        offset: Int = 0,
        category: String? = nil,
        city: String? = nil
    ) async throws -> [Destination] {
        var query = database()
            .from("destinations")
            .select()
            .limit(limit)
            .range(from: offset, to: offset + limit - 1)
            .order("created_at", ascending: false)

        if let category = category {
            query = query.eq("category", value: category)
        }

        if let city = city {
            query = query.eq("city", value: city)
        }

        let response: [Destination] = try await query.execute().value
        return response
    }

    /// Search destinations
    func searchDestinations(query: String) async throws -> [Destination] {
        let response: [Destination] = try await database()
            .from("destinations")
            .select()
            .or("name.ilike.%\(query)%,city.ilike.%\(query)%,category.ilike.%\(query)%")
            .limit(50)
            .execute()
            .value

        return response
    }

    /// Get destination by ID
    func getDestination(id: UUID) async throws -> Destination {
        let response: [Destination] = try await database()
            .from("destinations")
            .select()
            .eq("id", value: id.uuidString)
            .limit(1)
            .execute()
            .value

        guard let destination = response.first else {
            throw SupabaseError.notFound
        }

        return destination
    }

    /// Get destination by slug
    func getDestination(slug: String) async throws -> Destination {
        let response: [Destination] = try await database()
            .from("destinations")
            .select()
            .eq("slug", value: slug)
            .limit(1)
            .execute()
            .value

        guard let destination = response.first else {
            throw SupabaseError.notFound
        }

        return destination
    }
}

// MARK: - Errors

enum SupabaseError: LocalizedError {
    case notFound
    case unauthorized
    case invalidResponse
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Resource not found"
        case .unauthorized:
            return "Unauthorized access"
        case .invalidResponse:
            return "Invalid response from server"
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}
