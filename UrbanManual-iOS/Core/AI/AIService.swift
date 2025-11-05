//
//  AIService.swift
//  Urban Manual
//
//  AI service for travel intelligence
//  Integrates with web app's AI endpoints
//

import Foundation

/// AI service for travel recommendations and chat
actor AIService {
    static let shared = AIService()

    private let baseURL: URL
    private let networkClient: NetworkClient

    private init() {
        self.baseURL = Configuration.baseURL
        self.networkClient = NetworkClient(baseURL: baseURL)
    }

    // MARK: - Chat

    /// Send chat message to AI
    func sendMessage(_ message: String, conversationId: String? = nil) async throws -> AIResponse {
        struct Request: Encodable {
            let message: String
            let conversationId: String?

            enum CodingKeys: String, CodingKey {
                case message
                case conversationId = "conversation_id"
            }
        }

        let request = Request(message: message, conversationId: conversationId)

        return try await networkClient.request(
            ChatEndpoint.sendMessage(request),
            responseType: AIResponse.self
        )
    }

    /// Get conversation history
    func getConversationHistory(conversationId: String) async throws -> [ChatMessage] {
        return try await networkClient.request(
            ChatEndpoint.getHistory(conversationId),
            responseType: [ChatMessage].self
        )
    }

    // MARK: - Recommendations

    /// Get AI recommendations
    func getRecommendations(preferences: UserPreferences? = nil) async throws -> [Destination] {
        return try await networkClient.request(
            RecommendationsEndpoint.getRecommendations(preferences),
            responseType: [Destination].self
        )
    }

    /// Get similar destinations
    func getSimilarDestinations(to destinationId: UUID, limit: Int = 10) async throws -> [Destination] {
        return try await networkClient.request(
            RecommendationsEndpoint.getSimilar(destinationId, limit: limit),
            responseType: [Destination].self
        )
    }

    /// Generate itinerary
    func generateItinerary(city: String, days: Int, preferences: UserPreferences?) async throws -> Itinerary {
        struct Request: Encodable {
            let city: String
            let days: Int
            let preferences: UserPreferences?
        }

        let request = Request(city: city, days: days, preferences: preferences)

        return try await networkClient.request(
            AIEndpoint.generateItinerary(request),
            responseType: Itinerary.self
        )
    }
}

// MARK: - Models

struct AIResponse: Codable {
    let message: String
    let conversationId: String
    let suggestions: [String]?

    enum CodingKeys: String, CodingKey {
        case message
        case conversationId = "conversation_id"
        case suggestions
    }
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let role: Role
    let content: String
    let timestamp: Date

    enum Role: String, Codable {
        case user
        case assistant
    }
}

struct UserPreferences: Codable {
    let categories: [String]?
    let cities: [String]?
    let priceRange: PriceRange?
    let michelinOnly: Bool?

    enum PriceRange: String, Codable {
        case budget = "$"
        case moderate = "$$"
        case expensive = "$$$"
        case luxury = "$$$$"
    }
}

struct Itinerary: Codable {
    let id: String
    let city: String
    let days: [ItineraryDay]
    let summary: String
}

struct ItineraryDay: Codable {
    let day: Int
    let date: Date?
    let activities: [ItineraryActivity]
}

struct ItineraryActivity: Codable {
    let time: String
    let destination: Destination?
    let description: String
    let duration: String?
}

// MARK: - Endpoints

enum ChatEndpoint: Endpoint {
    case sendMessage(Encodable)
    case getHistory(String)

    var path: String {
        switch self {
        case .sendMessage:
            return "/api/intelligence/chat"
        case .getHistory(let id):
            return "/api/intelligence/conversations/\(id)"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .sendMessage:
            return .post
        case .getHistory:
            return .get
        }
    }

    var body: Data? {
        switch self {
        case .sendMessage(let request):
            return try? JSONEncoder().encode(request)
        case .getHistory:
            return nil
        }
    }
}

enum RecommendationsEndpoint: Endpoint {
    case getRecommendations(UserPreferences?)
    case getSimilar(UUID, limit: Int)

    var path: String {
        switch self {
        case .getRecommendations:
            return "/api/recommendations/personalized"
        case .getSimilar(let id, _):
            return "/api/recommendations/similar/\(id.uuidString)"
        }
    }

    var method: HTTPMethod {
        .get
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .getRecommendations:
            return nil
        case .getSimilar(_, let limit):
            return [URLQueryItem(name: "limit", value: "\(limit)")]
        }
    }
}

enum AIEndpoint: Endpoint {
    case generateItinerary(Encodable)

    var path: String {
        switch self {
        case .generateItinerary:
            return "/api/intelligence/itinerary"
        }
    }

    var method: HTTPMethod {
        .post
    }

    var body: Data? {
        switch self {
        case .generateItinerary(let request):
            return try? JSONEncoder().encode(request)
        }
    }
}
