//
//  DestinationRepository.swift
//  Urban Manual
//
//  Destination data repository
//

import Foundation

/// Destination repository - Full implementation with Supabase
actor DestinationRepository {
    static let shared = DestinationRepository()

    private let supabase = SupabaseManager.shared
    private var cachedDestinations: [Destination] = []
    private var lastFetchTime: Date?

    private init() {}

    // MARK: - Public Methods

    /// Fetch all destinations
    func fetchDestinations(forceRefresh: Bool = false) async throws -> [Destination] {
        // Return cached if recent (within 5 minutes)
        if !forceRefresh,
           let lastFetch = lastFetchTime,
           Date().timeIntervalSince(lastFetch) < 300,
           !cachedDestinations.isEmpty {
            return cachedDestinations
        }

        let destinations = try await supabase.fetchDestinations(limit: 1000)
        cachedDestinations = destinations
        lastFetchTime = Date()

        return destinations
    }

    /// Search destinations
    func searchDestinations(query: String) async throws -> [Destination] {
        guard !query.isEmpty else {
            return try await fetchDestinations()
        }

        return try await supabase.searchDestinations(query: query)
    }

    /// Get destination by ID
    func getDestination(id: UUID) async throws -> Destination {
        // Check cache first
        if let cached = cachedDestinations.first(where: { $0.id == id }) {
            return cached
        }

        return try await supabase.getDestination(id: id)
    }

    /// Get destination by slug
    func getDestination(slug: String) async throws -> Destination {
        // Check cache first
        if let cached = cachedDestinations.first(where: { $0.slug == slug }) {
            return cached
        }

        return try await supabase.getDestination(slug: slug)
    }

    /// Filter destinations
    func filterDestinations(
        category: String? = nil,
        city: String? = nil,
        isFeatured: Bool? = nil,
        hasMichelinStars: Bool? = nil
    ) async throws -> [Destination] {
        var results = try await fetchDestinations()

        if let category = category {
            results = results.filter { $0.category == category }
        }

        if let city = city {
            results = results.filter { $0.city == city }
        }

        if let isFeatured = isFeatured {
            results = results.filter { $0.isFeatured == isFeatured }
        }

        if let hasMichelinStars = hasMichelinStars {
            results = results.filter { ($0.michelinStars ?? 0) > 0 == hasMichelinStars }
        }

        return results
    }

    /// Get categories
    func getCategories() async throws -> [String] {
        let destinations = try await fetchDestinations()
        return Array(Set(destinations.map { $0.category })).sorted()
    }

    /// Get cities
    func getCities() async throws -> [String] {
        let destinations = try await fetchDestinations()
        return Array(Set(destinations.map { $0.city })).sorted()
    }

    /// Clear cache
    func clearCache() {
        cachedDestinations = []
        lastFetchTime = nil
    }
}
