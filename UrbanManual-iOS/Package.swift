// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "UrbanManual",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "UrbanManual",
            targets: ["UrbanManual"]
        )
    ],
    dependencies: [
        // Supabase Swift SDK
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "UrbanManual",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "PostgREST", package: "supabase-swift"),
                .product(name: "Storage", package: "supabase-swift"),
                .product(name: "Realtime", package: "supabase-swift")
            ]
        ),
        .testTarget(
            name: "UrbanManualTests",
            dependencies: ["UrbanManual"]
        )
    ]
)
