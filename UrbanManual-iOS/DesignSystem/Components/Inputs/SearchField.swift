//
//  SearchField.swift
//  Urban Manual
//
//  Search input field with magnifying glass icon
//

import SwiftUI

/// Search field with icon and clear button
struct SearchField: View {
    @Binding var text: String
    var placeholder: String = "Search destinations..."
    var onSubmit: (() -> Void)?

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Search icon
            UrbanIcon.magnifyingglass.image()
                .font(.urbanBodyMedium)
                .foregroundColor(.textSecondary)

            // Text field
            TextField(placeholder, text: $text)
                .font(.urbanBodyMedium)
                .foregroundColor(.textPrimary)
                .focused($isFocused)
                .submitLabel(.search)
                .onSubmit {
                    onSubmit?()
                }

            // Clear button
            if !text.isEmpty {
                Button(action: clearText) {
                    UrbanIcon.xmark.image()
                        .font(.urbanBodySmall)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: Radius.input)
                .fill(Color.backgroundSecondary)
        )
    }

    private func clearText() {
        text = ""
        isFocused = false
    }
}

#Preview("Search Field") {
    SearchField(text: .constant(""))
        .padding()
}
