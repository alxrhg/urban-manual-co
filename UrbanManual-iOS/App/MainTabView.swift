//
//  MainTabView.swift
//  Urban Manual
//
//  Main tab bar navigation
//  iOS 26 Liquid Glass floating tab bar
//

import SwiftUI

/// Main tab bar with iOS 26 Liquid Glass effect
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DestinationsView()
                .tabItem {
                    Label("Explore", systemImage: UrbanIcon.explore.systemName)
                }
                .tag(0)

            SavedView()
                .tabItem {
                    Label("Saved", systemImage: UrbanIcon.saved.systemName)
                }
                .tag(1)

            MapView()
                .tabItem {
                    Label("Map", systemImage: UrbanIcon.map.systemName)
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: UrbanIcon.profile.systemName)
                }
                .tag(3)
        }
        .tint(.textPrimary) // Match Urban Manual aesthetic
    }
}

#Preview {
    MainTabView()
}
