//
//  StatusBadge.swift
//  Urban Manual
//
//  Status badge component (Open/Closed/Busy)
//  Matches web app badge design with iOS 26 Liquid Glass
//

import SwiftUI

/// Status badge for destination availability
/// Matches web: px-3 py-1 bg-green-50 text-green-600 rounded-full
struct StatusBadge: View {
    // MARK: - Status Type

    enum Status {
        case open
        case closed
        case busy
        case unknown

        var title: String {
            switch self {
            case .open: return "Open"
            case .closed: return "Closed"
            case .busy: return "Busy"
            case .unknown: return "Unknown"
            }
        }

        var color: Color {
            switch self {
            case .open: return .green
            case .closed: return .red
            case .busy: return .orange
            case .unknown: return .gray
            }
        }

        var backgroundColor: Color {
            switch self {
            case .open: return Color.green.opacity(0.1)
            case .closed: return Color.red.opacity(0.1)
            case .busy: return Color.orange.opacity(0.1)
            case .unknown: return Color.gray.opacity(0.1)
            }
        }
    }

    // MARK: - Properties

    let status: Status

    // MARK: - Body

    var body: some View {
        Text(status.title)
            .font(.urbanLabelMedium)
            .foregroundColor(status.color)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(status.backgroundColor)
            )
    }
}

// MARK: - Previews

#Preview("Status Badges") {
    VStack(spacing: Spacing.md) {
        StatusBadge(status: .open)
        StatusBadge(status: .closed)
        StatusBadge(status: .busy)
        StatusBadge(status: .unknown)
    }
    .padding()
}
