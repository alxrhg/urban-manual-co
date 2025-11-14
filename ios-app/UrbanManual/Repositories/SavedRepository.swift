//
//  SavedRepository.swift
//  UrbanManual
//
//  Repository for saved destinations operations
//

import Foundation
import Supabase

class SavedRepository {
    private let client = SupabaseConfig.client
    
    // Fetch saved destinations for user
    func fetchSavedDestinations(userId: UUID) async throws -> [Destination] {
        let response: [SavedDestination] = try await client
            .from("saved_destinations")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        // Fetch full destination data for each saved item
        var destinations: [Destination] = []
        for saved in response {
            if let dest = try? await DestinationRepository().fetchDestination(id: saved.destinationId) {
                destinations.append(dest)
            }
        }
        
        return destinations
    }
    
    // Check if destination is saved
    func isDestinationSaved(userId: UUID, destinationId: UUID) async throws -> Bool {
        let response: [SavedDestination] = try await client
            .from("saved_destinations")
            .select()
            .eq("user_id", value: userId)
            .eq("destination_id", value: destinationId)
            .execute()
            .value
        
        return !response.isEmpty
    }
    
    // Save destination
    func saveDestination(userId: UUID, destinationId: UUID) async throws {
        let saved = SavedDestination(
            id: UUID(),
            userId: userId,
            destinationId: destinationId,
            createdAt: Date()
        )
        
        try await client
            .from("saved_destinations")
            .insert(saved)
            .execute()
    }
    
    // Unsave destination
    func unsaveDestination(userId: UUID, destinationId: UUID) async throws {
        try await client
            .from("saved_destinations")
            .delete()
            .eq("user_id", value: userId)
            .eq("destination_id", value: destinationId)
            .execute()
    }
}

