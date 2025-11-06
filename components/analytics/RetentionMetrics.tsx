'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, Activity, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RetentionMetricsData {
  retentionRates: {
    day1: { returned: number; total: number; rate: number };
    day7: { returned: number; total: number; rate: number };
    day30: { returned: number; total: number; rate: number };
  };
  wau: Array<{ week: string; count: number }>;
  mau: Array<{ month: string; count: number }>;
  engagementByType: Array<{ type: string; count: number }>;
  lifecycleStages: {
    new: number;
    active: number;
    returning: number;
    dormant: number;
    churned: number;
  };
}

const COLORS = {
  primary: '#000000',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const LIFECYCLE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export function RetentionMetrics() {
  const [data, setData] = useState<RetentionMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRetentionData();
  }, []);

  async function loadRetentionData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/retention-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load retention metrics');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error loading retention metrics:', err);
      setError(err.message || 'Failed to load retention metrics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 dark:border-red-800 rounded-2xl bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <p className="text-sm text-gray-500">No retention data available yet</p>
      </div>
    );
  }

  // Prepare lifecycle data for pie chart
  const lifecycleData = [
    { name: 'New', value: data.lifecycleStages.new },
    { name: 'Active', value: data.lifecycleStages.active },
    { name: 'Returning', value: data.lifecycleStages.returning },
    { name: 'Dormant', value: data.lifecycleStages.dormant },
    { name: 'Churned', value: data.lifecycleStages.churned },
  ];

  return (
    <div className="space-y-6">
      {/* Retention Rate Cards */}
      <div>
        <h3 className="text-sm font-medium mb-4">Day N Retention</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-400" />
              <div className="text-xs text-gray-500">Day 1 Retention</div>
            </div>
            <div className="text-3xl font-light mb-1">{data.retentionRates.day1.rate}%</div>
            <div className="text-xs text-gray-500">
              {data.retentionRates.day1.returned} of {data.retentionRates.day1.total} users
            </div>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-400" />
              <div className="text-xs text-gray-500">Day 7 Retention</div>
            </div>
            <div className="text-3xl font-light mb-1">{data.retentionRates.day7.rate}%</div>
            <div className="text-xs text-gray-500">
              {data.retentionRates.day7.returned} of {data.retentionRates.day7.total} users
            </div>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-400" />
              <div className="text-xs text-gray-500">Day 30 Retention</div>
            </div>
            <div className="text-3xl font-light mb-1">{data.retentionRates.day30.rate}%</div>
            <div className="text-xs text-gray-500">
              {data.retentionRates.day30.returned} of {data.retentionRates.day30.total} users
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Active Users */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Weekly Active Users (Last 12 Weeks)</h3>
          <p className="text-xs text-gray-500 mt-1">Number of unique users active each week</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.wau}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Active Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Active Users */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Monthly Active Users (Last 6 Months)</h3>
          <p className="text-xs text-gray-500 mt-1">Number of unique users active each month</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.mau}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="count"
              fill={COLORS.primary}
              name="Active Users"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement by Type and Lifecycle Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement by Type */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Engagement by Type</h3>
            <p className="text-xs text-gray-500 mt-1">Distribution of user interactions</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.engagementByType} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis
                dataKey="type"
                type="category"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="count"
                fill={COLORS.info}
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Lifecycle Stages */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">User Lifecycle Stages</h3>
            <p className="text-xs text-gray-500 mt-1">Current distribution of users</p>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lifecycleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) =>
                    `${props.name}: ${(props.percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {lifecycleData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={LIFECYCLE_COLORS[index % LIFECYCLE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {lifecycleData.map((stage, idx) => (
              <div key={stage.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: LIFECYCLE_COLORS[idx] }}
                />
                <span className="text-gray-600 dark:text-gray-400">
                  {stage.name}: {stage.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
