//
//  NetworkClient.swift
//  Urban Manual
//
//  Actor-isolated network client with Swift 6 concurrency
//  Modern async/await API
//

import Foundation

/// Actor-isolated network client for thread-safe networking
actor NetworkClient {
    // MARK: - Properties

    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder

    // MARK: - Initialization

    init(baseURL: URL, configuration: URLSessionConfiguration = .default) {
        self.baseURL = baseURL
        self.session = URLSession(configuration: configuration)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Request Methods

    /// Execute a typed request
    func request<T: Decodable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        let request = try buildRequest(for: endpoint)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }

    /// Execute request without response body
    func request(_ endpoint: Endpoint) async throws {
        let request = try buildRequest(for: endpoint)

        let (_, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
    }

    // MARK: - Private Helpers

    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(endpoint.path),
            resolvingAgainstBaseURL: true
        )
        components?.queryItems = endpoint.queryItems

        guard let url = components?.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.allHTTPHeaderFields = endpoint.headers
        request.httpBody = endpoint.body
        request.timeoutInterval = 30

        return request
    }
}

// MARK: - Endpoint Protocol

protocol Endpoint {
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String] { get }
    var queryItems: [URLQueryItem]? { get }
    var body: Data? { get }
}

extension Endpoint {
    var headers: [String: String] {
        ["Content-Type": "application/json"]
    }

    var queryItems: [URLQueryItem]? {
        nil
    }

    var body: Data? {
        nil
    }
}

// MARK: - HTTP Method

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

// MARK: - Network Errors

enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case noData
    case unauthorized
    case timeout

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .noData:
            return "No data received"
        case .unauthorized:
            return "Unauthorized request"
        case .timeout:
            return "Request timed out"
        }
    }
}
