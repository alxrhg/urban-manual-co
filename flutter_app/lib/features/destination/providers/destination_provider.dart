import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/models/destination.dart';

/// Provider for fetching a destination by slug
final destinationBySlugProvider =
    FutureProvider.family<Destination?, String>((ref, slug) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('destinations')
      .select()
      .eq('slug', slug)
      .maybeSingle();

  if (response == null) return null;

  return Destination.fromJson(response);
});

/// Provider for destinations in a city
final destinationsByCityProvider =
    FutureProvider.family<List<Destination>, String>((ref, citySlug) async {
  final supabase = Supabase.instance.client;

  // Convert slug back to city name (basic conversion)
  final cityName = citySlug
      .split('-')
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(' ');

  final response = await supabase
      .from('destinations')
      .select()
      .ilike('city', cityName)
      .order('rating', ascending: false);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});

/// Provider for nearby destinations
final nearbyDestinationsProvider =
    FutureProvider.family<List<Destination>, (double lat, double lng)>(
        (ref, coords) async {
  final (lat, lng) = coords;
  final supabase = Supabase.instance.client;

  // Simple bounding box query (approx 5km radius)
  final latRange = 0.045; // ~5km
  final lngRange = 0.045;

  final response = await supabase
      .from('destinations')
      .select()
      .gte('latitude', lat - latRange)
      .lte('latitude', lat + latRange)
      .gte('longitude', lng - lngRange)
      .lte('longitude', lng + lngRange)
      .order('rating', ascending: false)
      .limit(20);

  return (response as List)
      .map((json) => Destination.fromJson(json))
      .toList();
});
