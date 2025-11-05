//
//  ImageCache.swift
//  Urban Manual
//
//  Actor-isolated image cache for thread-safe caching
//

import UIKit
import Foundation

/// Actor-isolated image cache
actor ImageCache {
    static let shared = ImageCache()

    // MARK: - Cache

    private let cache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private lazy var cacheDirectory: URL = {
        let urls = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        let cacheURL = urls[0].appendingPathComponent("ImageCache")
        try? fileManager.createDirectory(at: cacheURL, withIntermediateDirectories: true)
        return cacheURL
    }()

    // MARK: - Configuration

    private init() {
        cache.countLimit = 100 // Max 100 images in memory
        cache.totalCostLimit = 50 * 1024 * 1024 // Max 50MB
    }

    // MARK: - Public Methods

    /// Get image from cache
    func image(for url: URL) -> UIImage? {
        let key = url.absoluteString as NSString

        // Check memory cache first
        if let image = cache.object(forKey: key) {
            return image
        }

        // Check disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key.hash.description)
        if let data = try? Data(contentsOf: fileURL),
           let image = UIImage(data: data) {
            cache.setObject(image, forKey: key)
            return image
        }

        return nil
    }

    /// Store image in cache
    func store(_ image: UIImage, for url: URL) {
        let key = url.absoluteString as NSString

        // Store in memory
        cache.setObject(image, forKey: key)

        // Store on disk
        let fileURL = cacheDirectory.appendingPathComponent(key.hash.description)
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
        }
    }

    /// Remove image from cache
    func remove(for url: URL) {
        let key = url.absoluteString as NSString

        // Remove from memory
        cache.removeObject(forKey: key)

        // Remove from disk
        let fileURL = cacheDirectory.appendingPathComponent(key.hash.description)
        try? fileManager.removeItem(at: fileURL)
    }

    /// Clear all cached images
    func clearAll() {
        cache.removeAllObjects()

        if let items = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil) {
            for item in items {
                try? fileManager.removeItem(at: item)
            }
        }
    }

    /// Get cache size
    func cacheSize() -> Int64 {
        guard let items = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }

        return items.reduce(0) { size, url in
            let fileSize = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
            return size + Int64(fileSize)
        }
    }
}

// MARK: - Image Loader

/// Image loader that uses cache
@MainActor
class CachedImageLoader: ObservableObject {
    @Published var image: UIImage?
    @Published var isLoading = false
    @Published var error: Error?

    private var task: Task<Void, Never>?

    func load(url: URL) {
        // Cancel previous task
        task?.cancel()

        task = Task {
            isLoading = true
            error = nil

            // Check cache first
            if let cachedImage = await ImageCache.shared.image(for: url) {
                image = cachedImage
                isLoading = false
                return
            }

            // Download image
            do {
                let (data, _) = try await URLSession.shared.data(from: url)

                guard !Task.isCancelled else { return }

                if let downloadedImage = UIImage(data: data) {
                    image = downloadedImage

                    // Cache the image
                    await ImageCache.shared.store(downloadedImage, for: url)
                }

                isLoading = false
            } catch {
                guard !Task.isCancelled else { return }

                self.error = error
                isLoading = false
            }
        }
    }

    func cancel() {
        task?.cancel()
    }

    deinit {
        task?.cancel()
    }
}

// MARK: - Cached AsyncImage

struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @StateObject private var loader = CachedImageLoader()

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image = loader.image {
                content(Image(uiImage: image))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            guard let url = url else { return }
            loader.load(url: url)
        }
    }
}
