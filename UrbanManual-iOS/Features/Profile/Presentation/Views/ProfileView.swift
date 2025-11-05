//
//  ProfileView.swift
//  Urban Manual
//
//  User profile view
//

import SwiftUI

/// User profile view
struct ProfileView: View {
    @State private var user: User?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Profile header
                    VStack(spacing: Spacing.md) {
                        // Avatar
                        Circle()
                            .fill(Color.backgroundSecondary)
                            .frame(width: 100, height: 100)
                            .overlay {
                                UrbanIcon.person.sized(.extraLarge)
                                    .foregroundColor(.textSecondary)
                            }

                        // Name
                        Text(user?.name ?? "Guest")
                            .font(.urbanHeadlineMedium)
                            .foregroundColor(.textPrimary)

                        // Email
                        if let email = user?.email {
                            Text(email)
                                .font(.urbanBodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }
                    .padding(.top, Spacing.xl)

                    // Stats
                    HStack(spacing: Spacing.xl) {
                        statItem(value: "0", label: "Saved")
                        statItem(value: "0", label: "Visited")
                        statItem(value: "0", label: "Cities")
                    }

                    Divider()
                        .padding(.horizontal, Spacing.screenPadding)

                    // Menu items
                    VStack(spacing: 0) {
                        menuItem(icon: .collections, title: "Collections")
                        menuItem(icon: .settings, title: "Settings")
                        menuItem(icon: .info, title: "About")
                        menuItem(icon: .logout, title: "Sign Out", destructive: true)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .glassNavigationBar()
        }
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: Spacing.xxs) {
            Text(value)
                .font(.urbanHeadlineLarge)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(.urbanLabelMedium)
                .foregroundColor(.textSecondary)
        }
    }

    private func menuItem(icon: UrbanIcon, title: String, destructive: Bool = false) -> some View {
        Button(action: {}) {
            HStack(spacing: Spacing.md) {
                icon.image()
                    .foregroundColor(destructive ? .statusError : .textSecondary)

                Text(title)
                    .font(.urbanBodyMedium)
                    .foregroundColor(destructive ? .statusError : .textPrimary)

                Spacer()

                if !destructive {
                    UrbanIcon.chevronRight.image()
                        .font(.urbanBodySmall)
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(.horizontal, Spacing.screenPadding)
            .padding(.vertical, Spacing.md)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ProfileView()
}
