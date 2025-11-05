//
//  SignInView.swift
//  Urban Manual
//
//  Email/password sign in view
//

import SwiftUI

/// Email/password sign in view
struct SignInView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Header
                    VStack(spacing: Spacing.sm) {
                        Text("Welcome Back")
                            .font(.urbanDisplaySmall)
                            .foregroundColor(.textPrimary)

                        Text("Sign in to continue exploring")
                            .font(.urbanBodySmall)
                            .foregroundColor(.textSecondary)
                    }
                    .padding(.top, Spacing.xxl)

                    // Form
                    VStack(spacing: Spacing.md) {
                        // Email
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Email")
                                .font(.urbanLabelLarge)
                                .foregroundColor(.textSecondary)

                            TextField("you@example.com", text: $email)
                                .font(.urbanBodyMedium)
                                .textContentType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: Radius.input)
                                        .fill(Color.backgroundSecondary)
                                )
                        }

                        // Password
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Password")
                                .font(.urbanLabelLarge)
                                .foregroundColor(.textSecondary)

                            SecureField("Enter password", text: $password)
                                .font(.urbanBodyMedium)
                                .textContentType(.password)
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: Radius.input)
                                        .fill(Color.backgroundSecondary)
                                )
                        }

                        // Sign in button
                        PrimaryButton(
                            "Sign In",
                            isLoading: isLoading,
                            isDisabled: !isFormValid
                        ) {
                            signIn()
                        }
                        .padding(.top, Spacing.md)
                    }
                    .padding(.horizontal, Spacing.screenPadding)

                    // Sign up link
                    Button(action: { showSignUp = true }) {
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundColor(.textSecondary)
                            Text("Sign up")
                                .foregroundColor(.textPrimary)
                                .fontWeight(.medium)
                        }
                        .font(.urbanBodySmall)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .glassNavigationBar()
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { dismiss() }) {
                        UrbanIcon.xmark.image()
                            .foregroundColor(.textPrimary)
                    }
                }
            }
            .sheet(isPresented: $showSignUp) {
                SignUpView()
            }
        }
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && email.contains("@")
    }

    private func signIn() {
        isLoading = true

        // TODO: Implement actual sign in
        Task {
            try? await Task.sleep(for: .seconds(1))
            isLoading = false
            dismiss()
        }
    }
}

#Preview {
    SignInView()
}
