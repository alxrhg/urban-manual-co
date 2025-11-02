//
//  AuthRepository.swift
//  UrbanManual
//
//  Repository for authentication operations
//

import Foundation
import Supabase

class AuthRepository {
    private let client = SupabaseConfig.client
    
    // Sign up
    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(
            email: email,
            password: password
        )
    }
    
    // Sign in
    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(
            email: email,
            password: password
        )
    }
    
    // Sign out
    func signOut() async throws {
        try await client.auth.signOut()
    }
    
    // Get current session
    func getSession() async throws -> Session? {
        try? await client.auth.session
    }
    
    // Get current user
    func getCurrentUser() async throws -> User? {
        guard let session = try await getSession() else { return nil }
        let authUser = try await client.auth.user
        
        return User(
            id: UUID(uuidString: authUser.id.uuidString) ?? UUID(),
            email: authUser.email ?? "",
            createdAt: Date()
        )
    }
    
    // Listen to auth state changes
    func authStateChanges() -> AsyncStream<AuthChangeEvent> {
        AsyncStream { continuation in
            Task {
                for await state in await client.auth.authStateChanges {
                    continuation.yield(state)
                }
            }
        }
    }
}

