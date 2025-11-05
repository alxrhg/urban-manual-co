//
//  UrbanManualApp.swift
//  Urban Manual
//
//  Main app entry point
//  iOS 26 with Liquid Glass design
//

import SwiftUI

@main
struct UrbanManualApp: App {
    @State private var authState: AuthenticationState = .unauthenticated

    var body: some Scene {
        WindowGroup {
            Group {
                switch authState {
                case .loading:
                    LoadingView(message: "Loading...")

                case .authenticated:
                    MainTabView()

                case .unauthenticated:
                    WelcomeView()
                }
            }
            .preferredColorScheme(nil) // Support system dark mode
        }
    }
}
