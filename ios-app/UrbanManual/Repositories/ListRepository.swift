//
//  ListRepository.swift
//  UrbanManual
//
//  Repository for user lists operations
//

import Foundation
import Supabase

class ListRepository {
    private let client = SupabaseConfig.client
    
    // Fetch user's lists
    func fetchLists() async throws -> [List] {
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        let response: [List] = try await client
            .from("lists")
            .select()
            .eq("user_id", value: user.id)
            .order("updated_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    // Create new list
    func createList(name: String, description: String?) async throws -> List {
        guard let user = try? await client.auth.session.user else {
            throw NetworkError.unauthorized
        }
        
        let newList = List(
            id: UUID(),
            userId: user.id,
            name: name,
            description: description,
            isPublic: false,
            createdAt: Date(),
            updatedAt: Date(),
            items: nil
        )
        
        let response: [List] = try await client
            .from("lists")
            .insert(newList)
            .select()
            .execute()
            .value
        
        guard let list = response.first else {
            throw NetworkError.noData
        }
        
        return list
    }
    
    // Update list
    func updateList(_ listId: UUID, name: String, description: String?) async throws -> List {
        struct UpdatePayload: Encodable {
            let name: String
            let description: String?
            let updated_at: Date
        }
        
        let update = UpdatePayload(
            name: name,
            description: description,
            updated_at: Date()
        )
        
        let response: [List] = try await client
            .from("lists")
            .update(update)
            .eq("id", value: listId)
            .select()
            .execute()
            .value
        
        guard let list = response.first else {
            throw NetworkError.noData
        }
        
        return list
    }
    
    // Delete list
    func deleteList(_ listId: UUID) async throws {
        try await client
            .from("lists")
            .delete()
            .eq("id", value: listId)
            .execute()
    }
    
    // Fetch items in a list with destinations
    func fetchListItems(listId: UUID) async throws -> [ListItem] {
        let response: [ListItem] = try await client
            .from("list_items")
            .select()
            .eq("list_id", value: listId)
            .execute()
            .value
        
        // Fetch full destination data for each list item
        var itemsWithDestinations: [ListItem] = []
        for var item in response {
            if let dest = try? await DestinationRepository().fetchById(item.destinationId) {
                item.destination = dest
                itemsWithDestinations.append(item)
            }
        }
        
        return itemsWithDestinations
    }
    
    // Add destination to list
    func addToList(listId: UUID, destinationId: UUID) async throws {
        let item = ListItem(
            id: UUID(),
            listId: listId,
            destinationId: destinationId,
            createdAt: Date(),
            destination: nil
        )
        
        try await client
            .from("list_items")
            .insert(item)
            .execute()
    }
    
    // Remove destination from list
    func removeFromList(listId: UUID, destinationId: UUID) async throws {
        try await client
            .from("list_items")
            .delete()
            .eq("list_id", value: listId)
            .eq("destination_id", value: destinationId)
            .execute()
    }
}

