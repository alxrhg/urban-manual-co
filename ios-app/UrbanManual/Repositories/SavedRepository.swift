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
    func fetchSaved() async throws -> [SavedDestination] {
        // Get current user
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        let response: [SavedDestination] = try await client
            .from("saved_destinations")
            .select()
            .eq("user_id", value: user.id)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        // Fetch full destination data for each saved item
        var savedWithDestinations: [SavedDestination] = []
        for var saved in response {
            if let dest = try? await DestinationRepository().fetchById(saved.destinationId) {
                saved.destination = dest
                savedWithDestinations.append(saved)
            }
        }
        
        return savedWithDestinations
    }
    
    // Unsave destination
    func unsave(destinationId: UUID) async throws {
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        try await client
            .from("saved_destinations")
            .delete()
            .eq("user_id", value: user.id)
            .eq("destination_id", value: destinationId)
            .execute()
    }
    
    // Check if destination is saved
    func isSaved(destinationId: UUID) async throws -> Bool {
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        let response: [SavedDestination] = try await client
            .from("saved_destinations")
            .select()
            .eq("user_id", value: user.id)
            .eq("destination_id", value: destinationId)
            .execute()
            .value
        
        return !response.isEmpty
    }
    
    // Save destination
    func save(destinationId: UUID) async throws {
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        let saved = SavedDestination(
            id: UUID(),
            userId: user.id,
            destinationId: destinationId,
            createdAt: Date(),
            destination: nil
        )
        
        try await client
            .from("saved_destinations")
            .insert(saved)
            .execute()
    }
}

