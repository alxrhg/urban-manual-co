'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Clock,
  Server,
  Database,
  Globe,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { MetricCard } from '@/components/admin/analytics';

export const dynamic = 'force-dynamic';

interface PerformanceMetric {
  name: string;
  value: string;
  change?: number;
  status: 'good' | 'warning' | 'critical';
}

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState<{
    webVitals: PerformanceMetric[];
    apiMetrics: PerformanceMetric[];
    databaseMetrics: PerformanceMetric[];
  }>({
    webVitals: [],
    apiMetrics: [],
    databaseMetrics: [],
  });

  useEffect(() => {
    // Simulate loading performance metrics
    const loadMetrics = () => {
      setMetrics({
        webVitals: [
          { name: 'LCP (Largest Contentful Paint)', value: '1.8s', change: -12.5, status: 'good' },
          { name: 'FID (First Input Delay)', value: '45ms', change: -8.3, status: 'good' },
          { name: 'CLS (Cumulative Layout Shift)', value: '0.05', change: -15.2, status: 'good' },
          { name: 'TTFB (Time to First Byte)', value: '180ms', change: 5.2, status: 'good' },
          { name: 'FCP (First Contentful Paint)', value: '1.2s', change: -10.1, status: 'good' },
          { name: 'INP (Interaction to Next Paint)', value: '120ms', change: -3.8, status: 'good' },
        ],
        apiMetrics: [
          { name: 'Average Response Time', value: '85ms', change: -5.2, status: 'good' },
          { name: 'P95 Response Time', value: '245ms', change: 2.1, status: 'good' },
          { name: 'P99 Response Time', value: '520ms', change: 8.5, status: 'warning' },
          { name: 'Error Rate', value: '0.12%', change: -22.0, status: 'good' },
          { name: 'Request Rate', value: '1.2K/min', change: 15.3, status: 'good' },
          { name: 'Cache Hit Rate', value: '94.5%', change: 2.8, status: 'good' },
        ],
        databaseMetrics: [
          { name: 'Query Latency (avg)', value: '12ms', change: -8.3, status: 'good' },
          { name: 'Active Connections', value: '24', change: 5.0, status: 'good' },
          { name: 'Connection Pool Usage', value: '48%', change: 3.2, status: 'good' },
          { name: 'Storage Used', value: '2.4 GB', change: 1.5, status: 'good' },
          { name: 'Index Hit Rate', value: '99.2%', change: 0.1, status: 'good' },
          { name: 'Slow Queries (>100ms)', value: '3', change: -40.0, status: 'good' },
        ],
      });
      setLoading(false);
    };

    loadMetrics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      case 'critical':
        return 'text-rose-400';
    }
  };

  const getStatusBg = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-emerald-500/10';
      case 'warning':
        return 'bg-amber-500/10';
      case 'critical':
        return 'bg-rose-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Performance Monitoring</h1>
          <p className="mt-1 text-sm text-gray-400">
            Track Core Web Vitals, API performance, and database health
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Score"
          value="96"
          change={4.2}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          loading={loading}
        />
        <MetricCard
          title="Uptime"
          value="99.98%"
          icon={<Zap className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
        <MetricCard
          title="Avg Response"
          value="85ms"
          change={-5.2}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <MetricCard
          title="Error Rate"
          value="0.12%"
          change={-22.0}
          icon={<Server className="w-5 h-5" />}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Web Vitals */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Core Web Vitals</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.webVitals.map((metric, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${getStatusBg(metric.status)} border border-gray-800`}
            >
              <p className="text-xs text-gray-500 mb-1">{metric.name}</p>
              <p className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}
              </p>
              {metric.change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {metric.change < 0 ? (
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={`text-xs ${metric.change < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Performance */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-white">API Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.apiMetrics.map((metric, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${getStatusBg(metric.status)} border border-gray-800`}
            >
              <p className="text-xs text-gray-500 mb-1">{metric.name}</p>
              <p className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}
              </p>
              {metric.change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {metric.change < 0 ? (
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={`text-xs ${metric.change < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Database Metrics */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Database Health</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.databaseMetrics.map((metric, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${getStatusBg(metric.status)} border border-gray-800`}
            >
              <p className="text-xs text-gray-500 mb-1">{metric.name}</p>
              <p className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}
              </p>
              {metric.change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {metric.change < 0 ? (
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={`text-xs ${metric.change < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
