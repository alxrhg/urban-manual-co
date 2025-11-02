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
    func getSession() async throws -> Auth.Session? {
        try? await client.auth.session
    }
    
    // Get current user
    func getCurrentUser() async throws -> User? {
        do {
            let session = try await client.auth.session
            guard let session = session else { return nil }
            let authUser = session.user
            
            return User(
                id: UUID(uuidString: authUser.id.uuidString) ?? UUID(),
                email: authUser.email ?? "",
                createdAt: Date()
            )
        } catch {
            return nil
        }
    }
    
    // Listen to auth state changes
    func authStateChanges() -> AsyncStream<AuthChangeEvent> {
        AsyncStream { continuation in
            Task {
                do {
                    for try await state in await client.auth.authStateChanges {
                        continuation.yield(state)
                    }
                } catch {
                    continuation.finish()
                }
            }
        }
    }
}

