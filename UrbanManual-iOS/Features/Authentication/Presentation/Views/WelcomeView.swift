//
//  WelcomeView.swift
//  Urban Manual
//
//  Welcome/onboarding screen
//

import SwiftUI

/// Welcome screen with sign in options
struct WelcomeView: View {
    @State private var showSignIn = false

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xxl) {
                Spacer()

                // Logo / Brand
                VStack(spacing: Spacing.md) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 80))
                        .foregroundColor(.textPrimary)

                    Text("Urban Manual")
                        .font(.urbanDisplayMedium)
                        .foregroundColor(.textPrimary)

                    Text("Curating exceptional experiences for discerning travelers")
                        .font(.urbanBodyMedium)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xxl)
                }

                Spacer()

                // Sign in buttons
                VStack(spacing: Spacing.md) {
                    // Sign in with Apple
                    SignInWithAppleButton()

                    // Email sign in
                    SecondaryButton("Sign in with Email") {
                        showSignIn = true
                    }
                }
                .padding(.horizontal, Spacing.screenPadding)
                .padding(.bottom, Spacing.xl)
            }
            .background(Color.backgroundPrimary)
            .sheet(isPresented: $showSignIn) {
                SignInView()
            }
        }
    }
}

/// Sign in with Apple button
struct SignInWithAppleButton: View {
    var body: some View {
        Button(action: signInWithApple) {
            HStack(spacing: Spacing.iconTextGap) {
                Image(systemName: "apple.logo")
                    .font(.urbanTitleMedium)

                Text("Sign in with Apple")
                    .font(.urbanTitleMedium)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.buttonPaddingVertical)
            .padding(.horizontal, Spacing.buttonPaddingHorizontal)
            .background(
                Capsule()
                    .fill(Color.textPrimary)
            )
            .foregroundColor(.backgroundPrimary)
        }
    }

    private func signInWithApple() {
        // TODO: Implement Sign in with Apple
        print("Sign in with Apple")
    }
}

#Preview {
    WelcomeView()
}
