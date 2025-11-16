import { trpc } from '@/lib/trpc/client';

export function useCollections() {
  const { data: collections, isLoading: loading, error, refetch } = trpc.collections.getCollections.useQuery();

  const createCollectionMutation = trpc.collections.createCollection.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const updateCollectionMutation = trpc.collections.updateCollection.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteCollectionMutation = trpc.collections.deleteCollection.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return {
    collections,
    loading,
    error,
    createCollection: createCollectionMutation.mutateAsync,
    updateCollection: updateCollectionMutation.mutateAsync,
    deleteCollection: deleteCollectionMutation.mutateAsync,
    refresh: refetch,
  };
}
