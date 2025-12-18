import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/models/destination.dart';
import '../../auth/providers/auth_provider.dart';

/// Provider for saved destinations
final savedDestinationsProvider =
    AsyncNotifierProvider<SavedDestinationsNotifier, List<Destination>>(
  SavedDestinationsNotifier.new,
);

class SavedDestinationsNotifier extends AsyncNotifier<List<Destination>> {
  @override
  Future<List<Destination>> build() async {
    final authState = await ref.watch(authStateProvider.future);

    if (authState == null) {
      return [];
    }

    final supabase = Supabase.instance.client;

    // Get saved place slugs
    final savedResponse = await supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', authState.id);

    final slugs = (savedResponse as List)
        .map((row) => row['destination_slug'] as String)
        .toList();

    if (slugs.isEmpty) {
      return [];
    }

    // Get destination details
    final destinationsResponse = await supabase
        .from('destinations')
        .select()
        .inFilter('slug', slugs);

    return (destinationsResponse as List)
        .map((json) => Destination.fromJson(json))
        .toList();
  }

  /// Add a destination to saved
  Future<void> addSaved(String slug) async {
    final authState = await ref.read(authStateProvider.future);
    if (authState == null) return;

    final supabase = Supabase.instance.client;

    await supabase.from('saved_places').insert({
      'user_id': authState.id,
      'destination_slug': slug,
    });

    ref.invalidateSelf();
  }

  /// Remove a destination from saved
  Future<void> removeSaved(String slug) async {
    final authState = await ref.read(authStateProvider.future);
    if (authState == null) return;

    final supabase = Supabase.instance.client;

    await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', authState.id)
        .eq('destination_slug', slug);

    // Update local state immediately
    state = AsyncData(
      state.value?.where((d) => d.slug != slug).toList() ?? [],
    );
  }

  /// Check if a destination is saved
  Future<bool> isSaved(String slug) async {
    final destinations = state.value ?? [];
    return destinations.any((d) => d.slug == slug);
  }
}

/// Provider to check if specific destination is saved
final isDestinationSavedProvider =
    FutureProvider.family<bool, String>((ref, slug) async {
  final savedDestinations = await ref.watch(savedDestinationsProvider.future);
  return savedDestinations.any((d) => d.slug == slug);
});
