'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  RefreshCw,
  MapPin,
  Database,
  Award,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AdminStatsProps {
  refreshKey?: number;
}

interface StatData {
  current: number;
  previous: number;
  trend: number; // percentage change
  sparkline: number[]; // data points for mini chart
}

interface TopItem {
  name: string;
  count: number;
}

interface HealthStatus {
  sync: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
}

export function StatsDashboard({ refreshKey }: AdminStatsProps) {
  const [stats, setStats] = useState<{
    total: StatData;
    enriched: StatData;
    michelin: StatData;
    crown: StatData;
  }>({
    total: { current: 0, previous: 0, trend: 0, sparkline: [] },
    enriched: { current: 0, previous: 0, trend: 0, sparkline: [] },
    michelin: { current: 0, previous: 0, trend: 0, sparkline: [] },
    crown: { current: 0, previous: 0, trend: 0, sparkline: [] },
  });
  const [topCities, setTopCities] = useState<TopItem[]>([]);
  const [topCategories, setTopCategories] = useState<TopItem[]>([]);
  const [topArchitects, setTopArchitects] = useState<TopItem[]>([]);
  const [growthData, setGrowthData] = useState<Array<{ date: string; count: number }>>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    sync: 'healthy',
    api: 'healthy',
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [statsLoading, setStatsLoading] = useState(true);

  // Calculate days for time range
  const getDaysForRange = (range: string) => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return null; // all time
    }
  };

  // Generate sparkline data (simplified - in production, fetch actual historical data)
  const generateSparkline = (current: number, days: number): number[] => {
    const points = 10;
    const data: number[] = [];
    const base = current * 0.8; // Start at 80% of current
    const variance = current * 0.2;
    
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const value = base + (variance * progress) + (Math.random() * variance * 0.1);
      data.push(Math.max(0, Math.round(value)));
    }
    return data;
  };

  // Load comprehensive stats
  const loadAdminStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const days = getDaysForRange(timeRange);
      const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

      // Execute queries in parallel
      const [
        { count: totalCurrent },
        { count: enrichedCurrent },
        { count: michelinCurrent },
        { count: crownCurrent },
        { count: totalPrevious },
        { count: enrichedPrevious },
        { count: michelinPrevious },
        { count: crownPrevious },
      ] = await Promise.all([
        supabase.from('destinations').select('count', { count: 'exact', head: true }),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).not('google_place_id', 'is', null),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).gt('michelin_stars', 0),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).eq('crown', true),
        // Previous period counts (simplified - using created_at for now)
        startDate
          ? supabase.from('destinations').select('count', { count: 'exact', head: true }).lt('created_at', startDate)
          : { count: 0 },
        startDate
          ? supabase.from('destinations').select('count', { count: 'exact', head: true }).not('google_place_id', 'is', null).lt('created_at', startDate)
          : { count: 0 },
        startDate
          ? supabase.from('destinations').select('count', { count: 'exact', head: true }).gt('michelin_stars', 0).lt('created_at', startDate)
          : { count: 0 },
        startDate
          ? supabase.from('destinations').select('count', { count: 'exact', head: true }).eq('crown', true).lt('created_at', startDate)
          : { count: 0 },
      ]);

      const total = totalCurrent || 0;
      const enriched = enrichedCurrent || 0;
      const michelin = michelinCurrent || 0;
      const crown = crownCurrent || 0;

      const totalPrev = totalPrevious || 0;
      const enrichedPrev = enrichedPrevious || 0;
      const michelinPrev = michelinPrevious || 0;
      const crownPrev = crownPrevious || 0;

      // Calculate trends
      const calculateTrend = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      setStats({
        total: {
          current: total,
          previous: totalPrev,
          trend: calculateTrend(total, totalPrev),
          sparkline: generateSparkline(total, days || 30),
        },
        enriched: {
          current: enriched,
          previous: enrichedPrev,
          trend: calculateTrend(enriched, enrichedPrev),
          sparkline: generateSparkline(enriched, days || 30),
        },
        michelin: {
          current: michelin,
          previous: michelinPrev,
          trend: calculateTrend(michelin, michelinPrev),
          sparkline: generateSparkline(michelin, days || 30),
        },
        crown: {
          current: crown,
          previous: crownPrev,
          trend: calculateTrend(crown, crownPrev),
          sparkline: generateSparkline(crown, days || 30),
        },
      });

      // Load top cities
      const { data: cityData } = await supabase
        .from('destinations')
        .select('city')
        .not('city', 'is', null);

      if (cityData) {
        const cityCounts = cityData.reduce((acc: Record<string, number>, d) => {
          const city = d.city || '';
          acc[city] = (acc[city] || 0) + 1;
          return acc;
        }, {});

        const topCitiesList = Object.entries(cityCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopCities(topCitiesList);
      }

      // Load top categories
      const { data: categoryData } = await supabase
        .from('destinations')
        .select('category')
        .not('category', 'is', null);

      if (categoryData) {
        const categoryCounts = categoryData.reduce((acc: Record<string, number>, d) => {
          const category = d.category || '';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        const topCategoriesList = Object.entries(categoryCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopCategories(topCategoriesList);
      }

      // Load top architects
      const { data: architectData } = await supabase
        .from('destinations')
        .select('architect')
        .not('architect', 'is', null);

      if (architectData) {
        const architectCounts = architectData.reduce((acc: Record<string, number>, d) => {
          const architect = d.architect || '';
          acc[architect] = (acc[architect] || 0) + 1;
          return acc;
        }, {});

        const topArchitectsList = Object.entries(architectCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopArchitects(topArchitectsList);
      }

      // Load growth data for chart
      if (days) {
        const growthPoints: Array<{ date: string; count: number }> = [];
        const interval = Math.ceil(days / 10);
        
        for (let i = 0; i <= days; i += interval) {
          const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          
          const { count } = await supabase
            .from('destinations')
            .select('count', { count: 'exact', head: true })
            .lte('created_at', date.toISOString());
          
          growthPoints.push({
            date: dateStr,
            count: count || 0,
          });
        }
        
        setGrowthData(growthPoints);
      }

      // Check health status (simplified)
      setHealthStatus({
        sync: 'healthy', // In production, check actual sync status
        api: 'healthy', // In production, check API endpoints
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setHealthStatus({
        sync: 'error',
        api: 'error',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats, refreshKey]);

  // Sparkline component
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length === 0) return null;

    const width = 60;
    const height = 20;
    const padding = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Growth chart component
  const GrowthChart = ({ data }: { data: Array<{ date: string; count: number }> }) => {
    if (data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-gray-400">
          No data available
        </div>
      );
    }

    const width = 100;
    const height = 80;
    const padding = 8;
    const max = Math.max(...data.map(d => d.count));
    const min = Math.min(...data.map(d => d.count));
    const range = max - min || 1;

    const points = data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.count - min) / range) * (height - padding * 2);
      return { x, y, count: d.count };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="w-full">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <defs>
            <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#growthGradient)"
          />
          <path
            d={pathData}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill="rgb(59, 130, 246)"
              className="opacity-0 hover:opacity-100 transition-opacity"
            />
          ))}
        </svg>
      </div>
    );
  };

  // Trend indicator component
  const TrendIndicator = ({ trend }: { trend: number }) => {
    if (Math.abs(trend) < 0.1) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
          <Minus className="h-3 w-3" />
          <span>0%</span>
        </span>
      );
    }

    const isPositive = trend > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

    return (
      <span className={cn('inline-flex items-center gap-0.5 text-xs', color)}>
        <Icon className="h-3 w-3" />
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </span>
    );
  };

  // Health indicator component
  const HealthIndicator = ({ status, label }: { status: 'healthy' | 'warning' | 'error'; label: string }) => {
    const icon = status === 'healthy' ? CheckCircle2 : status === 'warning' ? AlertCircle : XCircle;
    const color = status === 'healthy' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-red-500';
    const Icon = icon;

    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Icon className={cn('h-3 w-3', color)} />
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      </div>
    );
  };

  const statCards = [
    {
      key: 'total',
      label: 'Destinations',
      value: stats.total,
      icon: MapPin,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      sparklineColor: 'rgb(37, 99, 235)',
    },
    {
      key: 'enriched',
      label: 'Enriched',
      value: stats.enriched,
      icon: Database,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      sparklineColor: 'rgb(34, 197, 94)',
    },
    {
      key: 'michelin',
      label: 'Michelin',
      value: stats.michelin,
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      sparklineColor: 'rgb(245, 158, 11)',
    },
    {
      key: 'crown',
      label: 'Crown',
      value: stats.crown,
      icon: Crown,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      sparklineColor: 'rgb(168, 85, 247)',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stats Overview</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Live counts with trends and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => loadAdminStats()}
            disabled={statsLoading}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <RefreshCw className={cn('h-3 w-3', statsLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className={cn('p-4 rounded-xl border border-gray-200 dark:border-gray-800', stat.bgColor)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', stat.color)} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</span>
                </div>
                <Sparkline data={stat.value.sparkline} color={stat.sparklineColor} />
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '…' : stat.value.current.toLocaleString()}
                </div>
                <TrendIndicator trend={stat.value.trend} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Growth Chart */}
      <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              Growth Chart (Last {timeRange === 'all' ? 'All Time' : timeRange})
            </span>
          </div>
        </div>
        <GrowthChart data={growthData} />
      </div>

      {/* Top Lists and Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Cities */}
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3">Top Cities</h4>
          {topCities.length > 0 ? (
            <div className="space-y-2">
              {topCities.map((city, index) => (
                <div key={city.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-4">{index + 1}.</span>
                    <span className="text-gray-900 dark:text-white">{city.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {city.count}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No data available</div>
          )}
        </div>

        {/* Top Categories */}
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3">Top Categories</h4>
          {topCategories.length > 0 ? (
            <div className="space-y-2">
              {topCategories.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-4">{index + 1}.</span>
                    <span className="text-gray-900 dark:text-white">{category.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No data available</div>
          )}
        </div>

        {/* Health Indicators */}
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3">Health Status</h4>
          <div className="space-y-2">
            <HealthIndicator status={healthStatus.sync} label="Sync Status" />
            <HealthIndicator status={healthStatus.api} label="API Status" />
          </div>
        </div>
      </div>
    </div>
  );
}

