import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const collectionsRouter = router({
  // Get all collections for the current user
  getCollections: protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, userId } = ctx;
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Get a single collection by ID, with its items
  getCollectionById: protectedProcedure
    .input(z.object({ collectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          collection_items (
            *
          )
        `)
        .eq('id', input.collectionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Create a new collection
  createCollection: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      is_public: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: input.name,
          description: input.description,
          is_public: input.is_public,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Get public collections for the discover page
  getPublicCollections: protectedProcedure
    .input(z.object({
      sortBy: z.string().optional(),
      searchQuery: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      let query = supabase
        .from('collections')
        .select(`
          *,
          user_profiles (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('is_public', true);

      if (input.searchQuery) {
        query = query.ilike('name', `%${input.searchQuery}%`);
      }

      if (input.sortBy === 'popular') {
        query = query.order('destination_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Update a collection
  updateCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data, error } = await supabase
        .from('collections')
        .update({
          name: input.name,
          description: input.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.collectionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Delete a collection
  deleteCollection: protectedProcedure
    .input(z.object({ collectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', input.collectionId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
      return { success: true };
    }),

  // Add an item to a collection
  addCollectionItem: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      destinationSlug: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;

      // Check if the user owns the collection
      const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('id', input.collectionId)
        .eq('user_id', userId)
        .single();

      if (!collection) {
        throw new Error('Collection not found or user does not have access.');
      }

      const { data, error } = await supabase
        .from('collection_items')
        .insert({
          collection_id: input.collectionId,
          destination_slug: input.destinationSlug,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Remove an item from a collection
  removeCollectionItem: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      destinationSlug: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;

      // This is a more complex query because we need to join to ensure the user owns the collection
      // An alternative is a pre-check like in `addCollectionItem`
      const { error } = await supabase.rpc('remove_collection_item_for_user', {
        p_user_id: userId,
        p_collection_id: input.collectionId,
        p_destination_slug: input.destinationSlug,
      });


      if (error) {
        throw new Error(error.message);
      }
      return { success: true };
    }),

  // Update item notes or position (example)
  updateCollectionItem: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      destinationSlug: z.string(),
      notes: z.string().optional(),
      position: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;

      // For this to be secure, we need a pl/pgsql function or a join
      // Here's a simplified version with a check first
      const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('id', input.collectionId)
        .eq('user_id', userId)
        .single();

      if (!collection) {
        throw new Error('Collection not found or user does not have access.');
      }

      const { data, error } = await supabase
        .from('collection_items')
        .update({
          notes: input.notes,
          position: input.position,
        })
        .eq('collection_id', input.collectionId)
        .eq('destination_slug', input.destinationSlug)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Get comments for a collection
  getComments: protectedProcedure
    .input(z.object({ collectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      const { data, error } = await supabase
        .from('collection_comments')
        .select(`
          *,
          user_profiles (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('collection_id', input.collectionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Create a new comment
  createComment: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      comment_text: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data, error } = await supabase
        .from('collection_comments')
        .insert({
          collection_id: input.collectionId,
          user_id: userId,
          comment_text: input.comment_text,
        })
        .select(`
          *,
          user_profiles (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }),

  // Delete a comment
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { error } = await supabase
        .from('collection_comments')
        .delete()
        .eq('id', input.commentId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
      return { success: true };
    }),
});
