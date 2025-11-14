//
//  SavedDestination.swift
//  UrbanManual
//
//  Saved destination model
//

import Foundation

struct SavedDestination: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let destinationId: UUID
    let createdAt: Date
    var destination: Destination? // Populated from join query or separately
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case destinationId = "destination_id"
        case createdAt = "created_at"
        case destination
    }
}

