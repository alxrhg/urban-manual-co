import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/models/destination.dart';

/// Provider for search query state
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Provider for search results
final searchResultsProvider = FutureProvider<List<Destination>>((ref) async {
  final query = ref.watch(searchQueryProvider);

  if (query.isEmpty) {
    return [];
  }

  // Debounce search
  await Future.delayed(const Duration(milliseconds: 300));

  // Check if query is still the same after delay
  if (ref.read(searchQueryProvider) != query) {
    return [];
  }

  final supabase = Supabase.instance.client;

  // Search by name, city, category, or description
  final response = await supabase
      .from('destinations')
      .select()
      .or('name.ilike.%$query%,city.ilike.%$query%,category.ilike.%$query%,description.ilike.%$query%')
      .order('rating', ascending: false)
      .limit(30);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});

/// Provider for filtered search (by category)
final categoryFilterProvider = StateProvider<String?>((ref) => null);

/// Provider for destinations filtered by category
final filteredDestinationsProvider =
    FutureProvider<List<Destination>>((ref) async {
  final category = ref.watch(categoryFilterProvider);

  if (category == null) {
    return [];
  }

  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('destinations')
      .select()
      .eq('category', category)
      .not('image', 'is', null)
      .order('rating', ascending: false)
      .limit(50);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});
