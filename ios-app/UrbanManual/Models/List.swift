//
//  List.swift
//  UrbanManual
//
//  User list model
//

import Foundation

struct List: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let name: String
    let description: String?
    let isPublic: Bool
    let createdAt: Date
    let updatedAt: Date
    var items: [ListItem]? // Populated from join query or separately
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name, description
        case isPublic = "is_public"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case items
    }
}

