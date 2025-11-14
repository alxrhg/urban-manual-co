/**
 * Performance Monitoring for AI Operations
 * Track and log performance metrics for AI/ML features
 */

import { MONITORING_CONFIG } from './config';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Track the performance of an async operation
   */
  async trackAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      this.recordMetric(operation, Date.now() - startTime, metadata);
      return result;
    } catch (error) {
      this.recordMetric(operation, Date.now() - startTime, {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, metadata?: Record<string, unknown>) {
    if (!MONITORING_CONFIG.ENABLED) return;

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // Log slow queries
    if (MONITORING_CONFIG.LOG_SLOW_QUERIES && duration > MONITORING_CONFIG.SLOW_QUERY_THRESHOLD) {
      console.warn(`[Performance] Slow ${operation}: ${duration}ms`, metadata);
    }

    // Add to metrics array
    this.metrics.push(metric);

    // Trim old metrics if we exceed max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    if (!operation) return [...this.metrics];
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get statistics for all operations
   */
  getStatistics() {
    const operations = new Set(this.metrics.map(m => m.operation));
    const stats: Record<string, { count: number; avgDuration: number; maxDuration: number; minDuration: number }> = {};

    operations.forEach(operation => {
      const metrics = this.getMetrics(operation);
      const durations = metrics.map(m => m.duration);
      
      stats[operation] = {
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
      };
    });

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper to measure and log function execution time
 */
export function withPerformanceTracking<T>(
  operation: string,
  metadata?: Record<string, unknown>
) {
  return (fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.trackAsync(operation, fn, metadata);
  };
}
