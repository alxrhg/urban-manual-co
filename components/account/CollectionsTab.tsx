'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection } from '@/types/common';
import { NoCollectionsEmptyState } from '@/components/EmptyStates';

interface CollectionsTabProps {
  collections: Collection[];
}

export default function CollectionsTab({ collections }: CollectionsTabProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(true);
  const [creatingCollection, setCreatingCollection] = useState(false);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setCreatingCollection(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || null,
          is_public: newCollectionPublic,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create collection');
      }

      // Refresh the page to show the new collection
      router.refresh();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating collection:', error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setCreatingCollection(false);
    }
  };

  return (
    <div className="fade-in">
      {collections.length === 0 ? (
        <NoCollectionsEmptyState onCreateCollection={() => setShowCreateModal(true)} />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
            >
              + New Collection
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => router.push(`/collection/${collection.id}`)}
                className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{collection.emoji || '📚'}</span>
                  <h3 className="font-medium text-sm flex-1">{collection.name}</h3>
                </div>
                {collection.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{collection.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{collection.destination_count || 0} places</span>
                  {collection.is_public && <span>• Public</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-light mb-4">Create Collection</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection Name"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm"
              />
              <textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                />
                <label htmlFor="isPublic" className="text-xs">Make public</label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border rounded-2xl text-sm"
                  disabled={creatingCollection}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-2xl text-sm disabled:opacity-50"
                >
                  {creatingCollection ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
