'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  MapPin,
  Globe,
  Image,
  Settings,
  ArrowRight,
  Plus,
  Layout,
  Palette,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ContentSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
  color: string;
}

export default function CMSPage() {
  const sections: ContentSection[] = [
    {
      title: 'Destinations',
      description: 'Manage travel destinations, add new places, edit details',
      icon: <MapPin className="w-5 h-5" />,
      href: '/admin/destinations',
      count: 897,
      color: 'indigo',
    },
    {
      title: 'Media Library',
      description: 'Upload and manage images, photos, and media files',
      icon: <Image className="w-5 h-5" />,
      href: '/admin/media',
      color: 'purple',
    },
    {
      title: 'Categories',
      description: 'Manage destination categories and tags',
      icon: <Layout className="w-5 h-5" />,
      href: '/admin/categories',
      color: 'amber',
    },
    {
      title: 'Homepage',
      description: 'Configure homepage layout, featured content, hero section',
      icon: <Globe className="w-5 h-5" />,
      href: '/admin/settings',
      color: 'emerald',
    },
  ];

  const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      icon: 'text-indigo-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      icon: 'text-purple-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      icon: 'text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      icon: 'text-emerald-400',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Content Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage all content across Urban Manual
          </p>
        </div>
        <Link
          href="/admin/destinations"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {/* Content Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const colors = colorClasses[section.color];
          return (
            <Link
              key={section.title}
              href={section.href}
              className={`
                group relative p-6 rounded-xl border bg-gray-900/50 transition-all
                ${colors.border}
              `}
            >
              <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity`} />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${colors.bg} ${colors.icon}`}>
                    {section.icon}
                  </div>
                  {section.count !== undefined && (
                    <span className="text-sm font-semibold text-gray-400">
                      {section.count.toLocaleString()} items
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-white">
                  {section.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400 group-hover:text-gray-300">
                  {section.description}
                </p>

                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gray-500 group-hover:text-indigo-400 transition-colors">
                  Manage
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-sm font-medium text-white mb-4">Content Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">897</p>
            <p className="text-xs text-gray-500 mt-1">Destinations</p>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">2.4K</p>
            <p className="text-xs text-gray-500 mt-1">Images</p>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">48</p>
            <p className="text-xs text-gray-500 mt-1">Cities</p>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">12</p>
            <p className="text-xs text-gray-500 mt-1">Categories</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-sm font-medium text-white mb-4">Recent Changes</h3>
        <div className="space-y-3">
          {[
            { action: 'Created', item: 'Sketch - London', user: 'admin', time: '2 hours ago' },
            { action: 'Updated', item: 'Chiltern Firehouse', user: 'admin', time: '5 hours ago' },
            { action: 'Created', item: 'Tokyobike - Tokyo', user: 'admin', time: '1 day ago' },
            { action: 'Deleted', item: 'Test Destination', user: 'admin', time: '2 days ago' },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className={`
                  text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded
                  ${activity.action === 'Created' ? 'bg-emerald-500/10 text-emerald-400' :
                    activity.action === 'Updated' ? 'bg-indigo-500/10 text-indigo-400' :
                    'bg-rose-500/10 text-rose-400'}
                `}>
                  {activity.action}
                </span>
                <span className="text-sm text-white">{activity.item}</span>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
