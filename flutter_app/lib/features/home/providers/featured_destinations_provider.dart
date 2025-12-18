import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/models/destination.dart';

/// Provider for featured destinations on home screen
final featuredDestinationsProvider =
    FutureProvider<List<Destination>>((ref) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('destinations')
      .select()
      .not('image', 'is', null)
      .order('rating', ascending: false)
      .limit(10);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});

/// Provider for destinations by category
final destinationsByCategoryProvider =
    FutureProvider.family<List<Destination>, String>((ref, category) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('destinations')
      .select()
      .eq('category', category)
      .not('image', 'is', null)
      .order('rating', ascending: false)
      .limit(20);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});
