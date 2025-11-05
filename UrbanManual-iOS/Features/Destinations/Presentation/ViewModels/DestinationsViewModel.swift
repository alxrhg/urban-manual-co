//
//  DestinationsViewModel.swift
//  Urban Manual
//
//  Destinations list view model
//  Uses @Observable for iOS 26
//

import SwiftUI
import Observation

/// Destinations view model - Browse and search destinations
@Observable
@MainActor
final class DestinationsViewModel {
    // MARK: - Published State

    private(set) var destinations: [Destination] = []
    private(set) var isLoading = false
    private(set) var error: Error?

    var searchQuery = "" {
        didSet {
            if searchQuery != oldValue {
                performSearch()
            }
        }
    }

    var selectedCategory: String?
    var selectedCity: String?

    // MARK: - Private Properties

    private var searchTask: Task<Void, Never>?
    private let destinationRepository: DestinationRepository

    // MARK: - Computed Properties

    var filteredDestinations: [Destination] {
        var results = destinations

        if let category = selectedCategory {
            results = results.filter { $0.category == category }
        }

        if let city = selectedCity {
            results = results.filter { $0.city == city }
        }

        return results
    }

    var categories: [String] {
        Array(Set(destinations.map { $0.category })).sorted()
    }

    var cities: [String] {
        Array(Set(destinations.map { $0.city })).sorted()
    }

    // MARK: - Initialization

    init(destinationRepository: DestinationRepository = .shared) {
        self.destinationRepository = destinationRepository
    }

    // MARK: - Actions

    func loadDestinations() async {
        isLoading = true
        error = nil

        do {
            destinations = try await destinationRepository.fetchDestinations()
            isLoading = false
        } catch {
            self.error = error
            isLoading = false
        }
    }

    func refresh() async {
        await loadDestinations()
    }

    private func performSearch() {
        searchTask?.cancel()

        guard !searchQuery.isEmpty else {
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))

            guard !Task.isCancelled else { return }

            isLoading = true
            do {
                destinations = try await destinationRepository.searchDestinations(query: searchQuery)
                isLoading = false
            } catch {
                self.error = error
                isLoading = false
            }
        }
    }

    func clearFilters() {
        selectedCategory = nil
        selectedCity = nil
        searchQuery = ""
    }
}

// MARK: - Destination Repository (Temporary)

actor DestinationRepository {
    static let shared = DestinationRepository()

    func fetchDestinations() async throws -> [Destination] {
        // TODO: Implement actual Supabase fetch
        try await Task.sleep(for: .seconds(1))
        return Destination.previews
    }

    func searchDestinations(query: String) async throws -> [Destination] {
        try await Task.sleep(for: .seconds(0.5))
        return Destination.previews.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.city.localizedCaseInsensitiveContains(query)
        }
    }
}
