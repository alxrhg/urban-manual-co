//
//  AuthenticationManager.swift
//  Urban Manual
//
//  Authentication manager using Supabase Auth
//

import Foundation
import Supabase
import AuthenticationServices

/// Authentication manager
@Observable
@MainActor
final class AuthenticationManager {
    // MARK: - Shared Instance

    static let shared = AuthenticationManager()

    // MARK: - Published State

    private(set) var authState: AuthenticationState = .unauthenticated
    private(set) var currentUser: User?

    // MARK: - Private Properties

    private let supabase = SupabaseManager.shared

    // MARK: - Initialization

    private init() {
        Task {
            await checkSession()
        }
    }

    // MARK: - Public Methods

    /// Check current session
    func checkSession() async {
        authState = .loading

        do {
            let session = try await supabase.auth().session
            let user = User(
                id: UUID(uuidString: session.user.id.uuidString) ?? UUID(),
                email: session.user.email ?? "",
                name: session.user.userMetadata["name"]?.stringValue,
                avatarURL: nil,
                createdAt: session.user.createdAt
            )

            currentUser = user
            authState = .authenticated(user)
        } catch {
            authState = .unauthenticated
        }
    }

    /// Sign in with email and password
    func signIn(email: String, password: String) async throws {
        authState = .loading

        do {
            let session = try await supabase.auth().signIn(
                email: email,
                password: password
            )

            let user = User(
                id: UUID(uuidString: session.user.id.uuidString) ?? UUID(),
                email: session.user.email ?? "",
                name: session.user.userMetadata["name"]?.stringValue,
                avatarURL: nil,
                createdAt: session.user.createdAt
            )

            currentUser = user
            authState = .authenticated(user)
        } catch {
            authState = .unauthenticated
            throw error
        }
    }

    /// Sign up with email and password
    func signUp(email: String, password: String, name: String) async throws {
        authState = .loading

        do {
            let session = try await supabase.auth().signUp(
                email: email,
                password: password,
                data: ["name": .string(name)]
            )

            let user = User(
                id: UUID(uuidString: session.user.id.uuidString) ?? UUID(),
                email: session.user.email ?? "",
                name: name,
                avatarURL: nil,
                createdAt: session.user.createdAt
            )

            currentUser = user
            authState = .authenticated(user)
        } catch {
            authState = .unauthenticated
            throw error
        }
    }

    /// Sign in with Apple
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async throws {
        authState = .loading

        guard let identityToken = credential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            authState = .unauthenticated
            throw AuthError.invalidCredential
        }

        do {
            let session = try await supabase.auth().signInWithIdToken(
                credentials: .init(
                    provider: .apple,
                    idToken: tokenString
                )
            )

            let user = User(
                id: UUID(uuidString: session.user.id.uuidString) ?? UUID(),
                email: session.user.email ?? "",
                name: credential.fullName?.givenName,
                avatarURL: nil,
                createdAt: session.user.createdAt
            )

            currentUser = user
            authState = .authenticated(user)
        } catch {
            authState = .unauthenticated
            throw error
        }
    }

    /// Sign out
    func signOut() async throws {
        try await supabase.auth().signOut()
        currentUser = nil
        authState = .unauthenticated
    }

    /// Get current session
    var session: Session? {
        get async {
            try? await supabase.auth().session
        }
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case invalidCredential
    case userCancelled
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .invalidCredential:
            return "Invalid credential"
        case .userCancelled:
            return "User cancelled"
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}
