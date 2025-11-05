//
//  MapView.swift
//  Urban Manual
//
//  Map view with destination markers
//

import SwiftUI
import MapKit

/// Map view with destination markers
struct MapView: View {
    @State private var position: MapCameraPosition = .automatic
    @State private var destinations: [Destination] = Destination.previews

    var body: some View {
        NavigationStack {
            Map(position: $position) {
                ForEach(destinations) { destination in
                    if let coordinate = destination.coordinate {
                        Marker(
                            destination.name,
                            coordinate: CLLocationCoordinate2D(
                                latitude: coordinate.latitude,
                                longitude: coordinate.longitude
                            )
                        )
                        .tint(.textPrimary)
                    }
                }
            }
            .mapStyle(.standard)
            .navigationTitle("Map")
            .navigationBarTitleDisplayMode(.inline)
            .glassNavigationBar()
        }
    }
}

#Preview {
    MapView()
}
