'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Log {
  id: number;
  timestamp: string;
  level: string;
  type: string;
  message: string;
  user_id?: string;
  context?: any;
  error?: any;
}

interface Stats {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  securityEvents: number;
  rateLimitEvents: number;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedType !== 'all') params.append('type', selectedType);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      });
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [selectedLevel, selectedType]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedLevel, selectedType]);

  // Get log level badge color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Get type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'rate_limit':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'performance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📊 System Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor security events, errors, and system activity
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Logs</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalLogs.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-red-600 dark:text-red-400 mb-1">Errors</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.errorCount.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Warnings</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.warnCount.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Security Events</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.securityEvents.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Rate Limits</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.rateLimitEvents.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Levels</option>
                <option value="fatal">Fatal</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="security">Security</option>
                <option value="rate_limit">Rate Limit</option>
                <option value="error">Error</option>
                <option value="upload">Upload</option>
                <option value="performance">Performance</option>
              </select>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-md font-medium ${
                autoRefresh
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {autoRefresh ? '🔴 Auto-refresh ON' : '⚪ Auto-refresh OFF'}
            </button>

            <button
              onClick={() => {
                fetchLogs();
                fetchStats();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No logs found matching the filters
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(
                            log.level
                          )}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                            log.type
                          )}`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="truncate max-w-md">{log.message}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Log Details</h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Timestamp
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Level
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getLevelColor(
                          selectedLog.level
                        )}`}
                      >
                        {selectedLog.level}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTypeColor(
                          selectedLog.type
                        )}`}
                      >
                        {selectedLog.type}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-gray-900 dark:text-white">
                      {selectedLog.message}
                    </div>
                  </div>

                  {selectedLog.user_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User ID
                      </label>
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        {selectedLog.user_id}
                      </div>
                    </div>
                  )}

                  {selectedLog.context && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Context
                      </label>
                      <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                        {JSON.stringify(selectedLog.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.error && (
                    <div>
                      <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                        Error Details
                      </label>
                      <pre className="bg-red-50 dark:bg-red-900 p-3 rounded text-xs overflow-x-auto text-red-900 dark:text-red-100">
                        {JSON.stringify(selectedLog.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
