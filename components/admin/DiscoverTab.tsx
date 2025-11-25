"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  X,
  Loader2,
  RefreshCw,
  MapPin,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import Image from "next/image";
import { VALID_CATEGORIES } from "@/lib/categories";

interface Candidate {
  id: number;
  place_id: string;
  name: string;
  address: string;
  city: string;
  category: string;
  image_url: string | null;
  google_rating: number | null;
  google_user_ratings_total: number | null;
  created_at: string;
  raw?: any;
}

interface FetchParams {
  city?: string;
  category?: string;
  minRating?: number;
}

export default function DiscoverTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 12;

  // Filters
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch state
  const [fetching, setFetching] = useState(false);
  const [fetchCity, setFetchCity] = useState("");
  const [fetchCategory, setFetchCategory] = useState("");
  const [fetchResult, setFetchResult] = useState<any>(null);

  // Action states
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (cityFilter) params.set("city", cityFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/discovery/candidates?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

      const data = await res.json();
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [offset, cityFilter, categoryFilter]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleFetch = async () => {
    setFetching(true);
    setFetchResult(null);

    try {
      const body: FetchParams = { minRating: 4.0 };
      if (fetchCity) body.city = fetchCity;
      if (fetchCategory) body.category = fetchCategory;

      const res = await fetch("/api/discovery/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setFetchResult(data);

      // Reload candidates if any were inserted
      if (data.inserted > 0) {
        loadCandidates();
      }
    } catch (err: any) {
      setFetchResult({ error: err.message });
    } finally {
      setFetching(false);
    }
  };

  const handleApprove = async (candidate: Candidate) => {
    setProcessingId(candidate.id);

    try {
      const res = await fetch(`/api/discovery/candidates/${candidate.id}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        // Remove from local state
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
        setTotal((prev) => prev - 1);
      } else {
        alert(data.error || "Failed to approve");
      }
    } catch (err: any) {
      alert(err.message || "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidate: Candidate) => {
    setProcessingId(candidate.id);

    try {
      const res = await fetch(`/api/discovery/candidates/${candidate.id}/reject`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
        setTotal((prev) => prev - 1);
      } else {
        alert(data.error || "Failed to reject");
      }
    } catch (err: any) {
      alert(err.message || "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-8">
      {/* Fetch New Places Section */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Discover New Places
        </h3>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              City (optional)
            </label>
            <input
              type="text"
              value={fetchCity}
              onChange={(e) => setFetchCity(e.target.value)}
              placeholder="e.g., Tokyo, London, Paris"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Category (optional)
            </label>
            <select
              value={fetchCategory}
              onChange={(e) => setFetchCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            >
              <option value="">All categories</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {fetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Fetch Places
              </>
            )}
          </button>
        </div>

        {fetchResult && (
          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {fetchResult.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{fetchResult.error}</p>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {fetchResult.inserted}
                </span>{" "}
                new places added
                {fetchResult.already_exists > 0 && (
                  <span className="text-gray-400 ml-2">
                    ({fetchResult.already_exists} already existed)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters and Count */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{total}</span> candidates
            pending review
          </div>
          <button
            onClick={loadCandidates}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setOffset(0);
            }}
            placeholder="Filter by city…"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none w-36"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
          >
            <option value="">All categories</option>
            {VALID_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadCandidates}
            className="mt-3 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && candidates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No candidates pending. Use the fetch tool above to discover new places.
          </p>
        </div>
      )}

      {/* Candidates Grid */}
      {!loading && !error && candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden group"
            >
              {/* Image */}
              <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                {candidate.image_url ? (
                  <Image
                    src={candidate.image_url}
                    alt={candidate.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-medium">
                    {candidate.category || "Other"}
                  </span>
                </div>

                {/* Rating Badge */}
                {candidate.google_rating && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 text-xs font-medium">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    {candidate.google_rating.toFixed(1)}
                    {candidate.google_user_ratings_total && (
                      <span className="text-gray-400">
                        ({candidate.google_user_ratings_total.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                  {candidate.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.city}
                </p>
                {candidate.address && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                    {candidate.address}
                  </p>
                )}

                {/* Google Maps Link */}
                {candidate.place_id && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${candidate.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Google Maps
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleApprove(candidate)}
                    disabled={processingId === candidate.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition disabled:opacity-50"
                  >
                    {processingId === candidate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(candidate)}
                    disabled={processingId === candidate.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
                  >
                    {processingId === candidate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
