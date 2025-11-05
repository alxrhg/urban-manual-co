//
//  User.swift
//  Urban Manual
//
//  User model
//

import Foundation

/// User model
struct User: Identifiable, Codable, Sendable {
    let id: UUID
    let email: String
    let name: String?
    let avatarURL: URL?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, email, name
        case avatarURL = "avatar"
        case createdAt = "created_at"
    }
}

/// Authentication state
enum AuthenticationState {
    case authenticated(User)
    case unauthenticated
    case loading

    var isAuthenticated: Bool {
        if case .authenticated = self {
            return true
        }
        return false
    }

    var user: User? {
        if case .authenticated(let user) = self {
            return user
        }
        return nil
    }
}
