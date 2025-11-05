//
//  SignUpView.swift
//  Urban Manual
//
//  Sign up view
//

import SwiftUI

/// Sign up view
struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Header
                    VStack(spacing: Spacing.sm) {
                        Text("Create Account")
                            .font(.urbanDisplaySmall)
                            .foregroundColor(.textPrimary)

                        Text("Join the community of discerning travelers")
                            .font(.urbanBodySmall)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, Spacing.xxl)

                    // Form
                    VStack(spacing: Spacing.md) {
                        // Name
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Name")
                                .font(.urbanLabelLarge)
                                .foregroundColor(.textSecondary)

                            TextField("Your name", text: $name)
                                .font(.urbanBodyMedium)
                                .textContentType(.name)
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: Radius.input)
                                        .fill(Color.backgroundSecondary)
                                )
                        }

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

                            SecureField("Create password", text: $password)
                                .font(.urbanBodyMedium)
                                .textContentType(.newPassword)
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: Radius.input)
                                        .fill(Color.backgroundSecondary)
                                )

                            Text("Minimum 8 characters")
                                .font(.urbanCaptionMedium)
                                .foregroundColor(.textTertiary)
                        }

                        // Sign up button
                        PrimaryButton(
                            "Create Account",
                            isLoading: isLoading,
                            isDisabled: !isFormValid
                        ) {
                            signUp()
                        }
                        .padding(.top, Spacing.md)
                    }
                    .padding(.horizontal, Spacing.screenPadding)
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
        }
    }

    private var isFormValid: Bool {
        !name.isEmpty && !email.isEmpty && !password.isEmpty &&
        email.contains("@") && password.count >= 8
    }

    private func signUp() {
        isLoading = true

        // TODO: Implement actual sign up
        Task {
            try? await Task.sleep(for: .seconds(1))
            isLoading = false
            dismiss()
        }
    }
}

#Preview {
    SignUpView()
}
