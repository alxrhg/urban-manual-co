//
//  AIChatView.swift
//  Urban Manual
//
//  AI Chat interface for travel intelligence
//

import SwiftUI

/// AI Chat view for travel recommendations
struct AIChatView: View {
    @State private var viewModel = AIChatViewModel()
    @State private var messageText = ""
    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(viewModel.messages) { message in
                            ChatMessageView(message: message)
                                .id(message.id)
                        }

                        if viewModel.isLoading {
                            HStack {
                                ProgressView()
                                    .tint(.textSecondary)
                                Text("Thinking...")
                                    .font(.urbanBodySmall)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                    }
                    .padding(Spacing.screenPadding)
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let lastMessage = viewModel.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            Divider()

            // Input
            HStack(spacing: Spacing.sm) {
                TextField("Ask about destinations...", text: $messageText, axis: .vertical)
                    .font(.urbanBodyMedium)
                    .focused($isTextFieldFocused)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Radius.input)
                            .fill(Color.backgroundSecondary)
                    )

                Button(action: sendMessage) {
                    UrbanIcon.arrowRight.image()
                        .font(.urbanBodyMedium)
                        .foregroundColor(.backgroundPrimary)
                        .padding(Spacing.sm)
                        .background(
                            Circle()
                                .fill(messageText.isEmpty ? Color.gray : Color.textPrimary)
                        )
                }
                .disabled(messageText.isEmpty || viewModel.isLoading)
            }
            .padding(Spacing.screenPadding)
            .background(Color.backgroundPrimary)
        }
        .navigationTitle("Travel Assistant")
        .navigationBarTitleDisplayMode(.inline)
        .glassNavigationBar()
        .task {
            if viewModel.messages.isEmpty {
                viewModel.addWelcomeMessage()
            }
        }
    }

    private func sendMessage() {
        let text = messageText
        messageText = ""
        isTextFieldFocused = false

        Task {
            await viewModel.sendMessage(text)
        }
    }
}

/// Chat message view
struct ChatMessageView: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            if message.role == .assistant {
                UrbanIcon.sparkles.sized(.small)
                    .foregroundColor(.textSecondary)
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: Spacing.xs) {
                Text(message.content)
                    .font(.urbanBodyMedium)
                    .foregroundColor(.textPrimary)
                    .padding(Spacing.md)
                    .background(
                        RoundedRectangle(cornerRadius: Radius.card)
                            .fill(message.role == .user ? Color.textPrimary.opacity(0.1) : Color.backgroundSecondary)
                    )

                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.urbanCaptionMedium)
                    .foregroundColor(.textTertiary)
            }

            if message.role == .user {
                UrbanIcon.person.sized(.small)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
    }
}

/// AI Chat view model
@Observable
@MainActor
final class AIChatViewModel {
    private(set) var messages: [ChatMessage] = []
    private(set) var isLoading = false
    private(set) var conversationId: String?

    private let aiService = AIService.shared

    func addWelcomeMessage() {
        let welcome = ChatMessage(
            id: UUID().uuidString,
            role: .assistant,
            content: "Hi! I'm your Urban Manual travel assistant. I can help you discover amazing destinations, plan trips, and answer questions about places around the world. What would you like to know?",
            timestamp: Date()
        )
        messages.append(welcome)
    }

    func sendMessage(_ text: String) async {
        // Add user message
        let userMessage = ChatMessage(
            id: UUID().uuidString,
            role: .user,
            content: text,
            timestamp: Date()
        )
        messages.append(userMessage)

        isLoading = true

        do {
            let response = try await aiService.sendMessage(text, conversationId: conversationId)

            // Save conversation ID
            if conversationId == nil {
                conversationId = response.conversationId
            }

            // Add assistant response
            let assistantMessage = ChatMessage(
                id: UUID().uuidString,
                role: .assistant,
                content: response.message,
                timestamp: Date()
            )
            messages.append(assistantMessage)

            isLoading = false
        } catch {
            let errorMessage = ChatMessage(
                id: UUID().uuidString,
                role: .assistant,
                content: "Sorry, I encountered an error: \(error.localizedDescription)",
                timestamp: Date()
            )
            messages.append(errorMessage)
            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        AIChatView()
    }
}
