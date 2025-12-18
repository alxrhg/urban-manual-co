import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// City model for home screen display
class City {
  final String name;
  final String slug;
  final String? country;
  final String? image;
  final int destinationCount;

  City({
    required this.name,
    required this.slug,
    this.country,
    this.image,
    required this.destinationCount,
  });
}

/// Provider for popular cities on home screen
final popularCitiesProvider = FutureProvider<List<City>>((ref) async {
  final supabase = Supabase.instance.client;

  // Get cities with destination counts
  final response = await supabase
      .from('destinations')
      .select('city, country, image')
      .not('image', 'is', null);

  // Aggregate by city
  final cityMap = <String, City>{};

  for (final row in response as List) {
    final cityName = row['city'] as String;
    final slug = cityName.toLowerCase().replaceAll(' ', '-');

    if (cityMap.containsKey(slug)) {
      cityMap[slug] = City(
        name: cityName,
        slug: slug,
        country: row['country'] as String?,
        image: cityMap[slug]!.image ?? row['image'] as String?,
        destinationCount: cityMap[slug]!.destinationCount + 1,
      );
    } else {
      cityMap[slug] = City(
        name: cityName,
        slug: slug,
        country: row['country'] as String?,
        image: row['image'] as String?,
        destinationCount: 1,
      );
    }
  }

  // Sort by destination count and return top cities
  final cities = cityMap.values.toList()
    ..sort((a, b) => b.destinationCount.compareTo(a.destinationCount));

  return cities.take(12).toList();
});
