/**
 * Event Batching System
 * Efficiently batches tracking events to reduce API calls
 *
 * Features:
 * - Batches events (sends every 5 seconds or 50 events)
 * - Uses sendBeacon for page unload
 * - Stores failed batches in IndexedDB for retry
 * - Performance-optimized with requestIdleCallback
 */

import { InteractionSignal } from './enhanced-tracker'

// ============================================
// Types
// ============================================

interface BatchedEvent extends Partial<InteractionSignal> {
  client_timestamp: number
  sequence_number: number
  engagement_score?: number
}

interface FailedBatch {
  id: string
  events: BatchedEvent[]
  timestamp: number
  retryCount: number
}

// ============================================
// IndexedDB Storage for Failed Batches
// ============================================

class FailedBatchStorage {
  private dbName = 'urban_manual_tracking'
  private storeName = 'failed_batches'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  async store(batch: FailedBatch): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(batch)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(): Promise<FailedBatch[]> {
    if (!this.db) await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async delete(id: string): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// ============================================
// Event Batcher
// ============================================

export class EventBatcher {
  private queue: BatchedEvent[] = []
  private readonly BATCH_SIZE = 50
  private readonly FLUSH_INTERVAL_MS = 5000
  private flushTimer: NodeJS.Timeout | null = null
  private storage: FailedBatchStorage
  private isInitialized: boolean = false
  private isFlushing: boolean = false

  constructor() {
    this.storage = new FailedBatchStorage()
    this.initialize()
  }

  private async initialize() {
    if (typeof window === 'undefined') return

    try {
      await this.storage.init()
      this.isInitialized = true

      // Start flush timer
      this.startFlushTimer()

      // Setup beforeunload handler
      this.setupBeaconFallback()

      // Retry failed batches on startup
      this.retryFailedBatches()
    } catch (error) {
      console.error('[EventBatcher] Initialization failed:', error)
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush()
      }
    }, this.FLUSH_INTERVAL_MS)
  }

  private setupBeaconFallback() {
    // Use sendBeacon for page unload (guaranteed delivery)
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        this.flushWithBeacon()
      }
    })

    // Also try on visibility change (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.queue.length > 0) {
        this.flushWithBeacon()
      }
    })
  }

  // ============================================
  // Public API
  // ============================================

  public addEvent(event: Partial<InteractionSignal> & { engagement_score?: number }) {
    const batchedEvent: BatchedEvent = {
      ...event,
      client_timestamp: Date.now(),
      sequence_number: this.queue.length,
    }

    this.queue.push(batchedEvent)

    // Auto-flush if batch size reached
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush()
    }
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isFlushing) return

    this.isFlushing = true

    const batch = this.queue.splice(0, this.BATCH_SIZE)

    try {
      const success = await this.sendBatch(batch)

      if (!success) {
        // Store for retry
        await this.storeFailedBatch(batch)
      }
    } catch (error) {
      console.error('[EventBatcher] Flush failed:', error)
      await this.storeFailedBatch(batch)
    } finally {
      this.isFlushing = false
    }
  }

  public async flushAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush()
    }
  }

  // ============================================
  // Batch Sending
  // ============================================

  private async sendBatch(batch: BatchedEvent[]): Promise<boolean> {
    try {
      const response = await fetch('/api/tracking/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: batch,
          session_id: batch[0]?.session_id,
          user_id: batch[0]?.user_id,
        }),
        // Use keepalive to ensure delivery even if page closes
        keepalive: true,
      })

      if (!response.ok) {
        console.error('[EventBatcher] Batch send failed:', response.status, response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('[EventBatcher] Network error:', error)
      return false
    }
  }

  private flushWithBeacon() {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.BATCH_SIZE)

    const data = JSON.stringify({
      events: batch,
      session_id: batch[0]?.session_id,
      user_id: batch[0]?.user_id,
    })

    const blob = new Blob([data], { type: 'application/json' })

    // Try sendBeacon (best for page unload)
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon('/api/tracking/batch', blob)

      if (!sent) {
        // Beacon failed, store for retry
        this.storeFailedBatch(batch).catch(console.error)
      }
    } else {
      // Fallback: try synchronous fetch (may be cancelled)
      fetch('/api/tracking/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(() => {
        this.storeFailedBatch(batch).catch(console.error)
      })
    }
  }

  // ============================================
  // Failed Batch Management
  // ============================================

  private async storeFailedBatch(batch: BatchedEvent[]) {
    if (!this.isInitialized) return

    try {
      const failedBatch: FailedBatch = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        events: batch,
        timestamp: Date.now(),
        retryCount: 0,
      }

      await this.storage.store(failedBatch)
      console.log('[EventBatcher] Stored failed batch for retry:', failedBatch.id)
    } catch (error) {
      console.error('[EventBatcher] Failed to store batch:', error)
    }
  }

  private async retryFailedBatches() {
    if (!this.isInitialized) return

    try {
      const failedBatches = await this.storage.getAll()

      if (failedBatches.length === 0) return

      console.log(`[EventBatcher] Retrying ${failedBatches.length} failed batches`)

      for (const failedBatch of failedBatches) {
        // Skip if too old (> 7 days)
        const age = Date.now() - failedBatch.timestamp
        if (age > 7 * 24 * 60 * 60 * 1000) {
          await this.storage.delete(failedBatch.id)
          continue
        }

        // Skip if too many retries
        if (failedBatch.retryCount >= 3) {
          await this.storage.delete(failedBatch.id)
          continue
        }

        // Try to send
        const success = await this.sendBatch(failedBatch.events)

        if (success) {
          // Success, delete from storage
          await this.storage.delete(failedBatch.id)
          console.log('[EventBatcher] Retry successful:', failedBatch.id)
        } else {
          // Failed again, increment retry count
          failedBatch.retryCount++
          await this.storage.store(failedBatch)
          console.log('[EventBatcher] Retry failed:', failedBatch.id)
        }

        // Rate limit retries
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('[EventBatcher] Retry failed batches error:', error)
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  public async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Final flush
    await this.flushAll()
  }

  // ============================================
  // Debug Utilities
  // ============================================

  public getQueueSize(): number {
    return this.queue.length
  }

  public async getFailedBatchCount(): Promise<number> {
    if (!this.isInitialized) return 0
    const batches = await this.storage.getAll()
    return batches.length
  }

  public async clearFailedBatches(): Promise<void> {
    if (!this.isInitialized) return
    await this.storage.clear()
  }
}

// ============================================
// Singleton Instance
// ============================================

let globalBatcher: EventBatcher | null = null

export function getGlobalBatcher(): EventBatcher {
  if (!globalBatcher) {
    globalBatcher = new EventBatcher()
  }
  return globalBatcher
}

export function destroyGlobalBatcher(): Promise<void> {
  if (globalBatcher) {
    const batcher = globalBatcher
    globalBatcher = null
    return batcher.destroy()
  }
  return Promise.resolve()
}
