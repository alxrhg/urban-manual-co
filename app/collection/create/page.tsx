'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { PageLoader } from '@/components/LoadingStates';

const DEFAULT_EMOJI = '📍';
const DEFAULT_COLOR = '#3B82F6';

function CreateCollectionForm() {
  const router = useRouter();
  const { user, loading, refreshAll } = useUserContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="px-6 py-24">
        <PageLoader message="Preparing collection tools..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in required</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You need an account to create collections. Please sign in and try again.
        </p>
        <div className="flex justify-center">
          <Link
            href="/auth/login"
            className="rounded-2xl bg-black px-6 py-2 text-sm font-medium text-white transition hover:opacity-80 dark:bg-white dark:text-black"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('A name is required to create your collection.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const supabaseClient = createClient();
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();

      const { data, error: supabaseError } = await supabaseClient
        .from('collections')
        .insert({
          user_id: user.id,
          name: trimmedName,
          description: trimmedDescription ? trimmedDescription : null,
          emoji: emoji || DEFAULT_EMOJI,
          color: DEFAULT_COLOR,
          is_public: false,
          destination_count: 0,
        })
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        throw new Error('Collection was created but no data was returned.');
      }

      await refreshAll().catch(error => {
        console.warn('Failed to refresh account data after creating collection', error);
      });

      router.replace(`/collection/${data.id}`);
    } catch (creationError: any) {
      console.error('Error creating collection:', creationError);
      setError(creationError?.message || 'Failed to create collection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/account/history#collections');
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/account/history#collections"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to collections
        </Link>
        <span className="text-xs text-gray-400 dark:text-gray-500">Collections help you curate themed lists.</span>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Create a collection</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Give your list a memorable name, add an optional description, and choose an emoji to represent it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="collection-name" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="collection-name"
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="e.g., Tokyo Favorites"
              className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="collection-description" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Description
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="collection-emoji" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Emoji
            </label>
            <input
              id="collection-emoji"
              type="text"
              value={emoji}
              onChange={event => setEmoji(event.target.value)}
              maxLength={2}
              className="w-20 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">Keep it short and expressive. Two characters max.</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-black px-6 py-2 text-sm font-medium text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {submitting ? 'Creating…' : 'Create collection'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-2xl bg-gray-200 px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectionCreatePage() {
  return <CreateCollectionForm />;
}
