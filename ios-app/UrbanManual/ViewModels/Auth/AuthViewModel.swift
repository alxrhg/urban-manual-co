//
//  AuthViewModel.swift
//  UrbanManual
//
//  Authentication view model
//

import Foundation
import Supabase

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let authRepository = AuthRepository()
    
    init() {
        Task {
            await checkAuthStatus()
            await listenToAuthChanges()
        }
    }
    
    func checkAuthStatus() async {
        do {
            if let user = try await authRepository.getCurrentUser() {
                self.currentUser = user
                self.isAuthenticated = true
            }
        } catch {
            print("Error checking auth status: \(error)")
        }
    }
    
    func listenToAuthChanges() async {
        // Check auth status periodically since authStateChanges might not work exactly as expected
        for await _ in authRepository.authStateChanges() {
            await checkAuthStatus()
        }
    }
    
    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await authRepository.signUp(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await authRepository.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func signOut() async {
        isLoading = true
        
        do {
            try await authRepository.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

