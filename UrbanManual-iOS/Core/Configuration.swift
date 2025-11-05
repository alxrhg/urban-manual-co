//
//  Configuration.swift
//  Urban Manual
//
//  App configuration and environment setup
//

import Foundation

enum Configuration {
    // MARK: - Environment

    static var environment: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    enum Environment {
        case development
        case production
    }

    // MARK: - Supabase

    static var supabaseURL: URL {
        guard let urlString = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
              let url = URL(string: urlString) else {
            // Fallback to hardcoded value for development
            return URL(string: "https://your-project.supabase.co")!
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String else {
            // Fallback for development
            return "your-anon-key"
        }
        return key
    }

    // MARK: - API Endpoints

    static var baseURL: URL {
        return supabaseURL
    }

    static var apiURL: URL {
        return baseURL.appendingPathComponent("rest/v1")
    }

    // MARK: - App Info

    static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    static var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}
