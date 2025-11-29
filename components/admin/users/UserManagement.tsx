'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  MoreVertical,
  Mail,
  Calendar,
  MapPin,
  Bookmark,
  Eye,
  Crown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Filter,
  UserPlus,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MetricCard } from '../analytics/MetricCard';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: {
    role?: string;
    provider?: string;
  };
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
  };
  saved_count: number;
  visited_count: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  adminUsers: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    adminUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const ITEMS_PER_PAGE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch saved places to get user activity
      const { data: savedPlaces } = await supabase
        .from('saved_places')
        .select('user_id');

      const { data: visitedPlaces } = await supabase
        .from('visited_places')
        .select('user_id');

      // Count saves and visits per user
      const userSaves: Record<string, number> = {};
      const userVisits: Record<string, number> = {};

      savedPlaces?.forEach(sp => {
        userSaves[sp.user_id] = (userSaves[sp.user_id] || 0) + 1;
      });

      visitedPlaces?.forEach(vp => {
        userVisits[vp.user_id] = (userVisits[vp.user_id] || 0) + 1;
      });

      // Get unique user IDs
      const allUserIds = new Set([
        ...Object.keys(userSaves),
        ...Object.keys(userVisits),
      ]);

      // Simulate user data since we don't have direct access to auth.users
      const simulatedUsers: UserData[] = Array.from(allUserIds).map((userId, i) => ({
        id: userId,
        email: `user${i + 1}@example.com`,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_sign_in_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        app_metadata: {
          role: Math.random() > 0.95 ? 'admin' : 'user',
          provider: Math.random() > 0.5 ? 'google' : 'email',
        },
        user_metadata: {
          full_name: `User ${i + 1}`,
        },
        saved_count: userSaves[userId] || 0,
        visited_count: userVisits[userId] || 0,
      }));

      // Apply filters
      let filteredUsers = simulatedUsers;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter(
          u => u.email.toLowerCase().includes(query) ||
               u.user_metadata.full_name?.toLowerCase().includes(query)
        );
      }

      if (roleFilter) {
        filteredUsers = filteredUsers.filter(u => u.app_metadata.role === roleFilter);
      }

      // Sort by activity
      filteredUsers.sort((a, b) => (b.saved_count + b.visited_count) - (a.saved_count + a.visited_count));

      // Paginate
      const from = (page - 1) * ITEMS_PER_PAGE;
      const paginatedUsers = filteredUsers.slice(from, from + ITEMS_PER_PAGE);

      setUsers(paginatedUsers);
      setTotalCount(filteredUsers.length);

      // Calculate stats
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      setStats({
        totalUsers: simulatedUsers.length,
        activeUsers: simulatedUsers.filter(u =>
          u.last_sign_in_at && new Date(u.last_sign_in_at) > weekAgo
        ).length,
        newUsersThisMonth: simulatedUsers.filter(u =>
          new Date(u.created_at) > monthAgo
        ).length,
        adminUsers: simulatedUsers.filter(u => u.app_metadata.role === 'admin').length,
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage users and their permissions
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
        <MetricCard
          title="Active (7d)"
          value={stats.activeUsers}
          change={12.5}
          icon={<Activity className="w-5 h-5" />}
          color="emerald"
          loading={loading}
        />
        <MetricCard
          title="New This Month"
          value={stats.newUsersThisMonth}
          change={8.3}
          icon={<TrendingUp className="w-5 h-5" />}
          color="amber"
          loading={loading}
        />
        <MetricCard
          title="Admins"
          value={stats.adminUsers}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">User</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Role</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Activity</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Joined</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Last Active</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-10 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-800 rounded animate-pulse" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          {user.user_metadata.avatar_url ? (
                            <img
                              src={user.user_metadata.avatar_url}
                              alt={user.email}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-semibold">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user.user_metadata.full_name || user.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${user.app_metadata.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-gray-800 text-gray-400'}
                      `}>
                        {user.app_metadata.role === 'admin' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {user.app_metadata.role || 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Bookmark className="w-3.5 h-3.5" />
                          {user.saved_count}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {user.visited_count}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${
                        user.last_sign_in_at && new Date(user.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                      }`}>
                        {getTimeAgo(user.last_sign_in_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdown === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveDropdown(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-gray-900 border border-gray-800 shadow-xl z-20 py-1 overflow-hidden">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                                <Mail className="w-4 h-4" />
                                Send Email
                              </button>
                              {user.app_metadata.role !== 'admin' && (
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                                  <Crown className="w-4 h-4" />
                                  Make Admin
                                </button>
                              )}
                              <div className="my-1 border-t border-gray-800" />
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                                <Ban className="w-4 h-4" />
                                Suspend User
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg bg-gray-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    {selectedUser.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedUser.user_metadata.full_name || selectedUser.email.split('@')[0]}
                  </h2>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  <span className={`
                    inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium
                    ${selectedUser.app_metadata.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-gray-800 text-gray-400'}
                  `}>
                    {selectedUser.app_metadata.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {selectedUser.app_metadata.role || 'User'}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Saved Places</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{selectedUser.saved_count}</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Visited</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{selectedUser.visited_count}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-500">Joined</span>
                  <span className="text-sm text-white">{formatDate(selectedUser.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-500">Last Active</span>
                  <span className="text-sm text-white">{getTimeAgo(selectedUser.last_sign_in_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Provider</span>
                  <span className="text-sm text-white capitalize">{selectedUser.app_metadata.provider || 'email'}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
                <Mail className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
