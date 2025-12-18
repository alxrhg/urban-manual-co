import 'package:freezed_annotation/freezed_annotation.dart';

part 'destination.freezed.dart';
part 'destination.g.dart';

/// Destination model matching the Supabase destinations table
@freezed
class Destination with _$Destination {
  const factory Destination({
    int? id,
    required String slug,
    required String name,
    required String city,
    String? country,
    required String category,
    String? description,
    @JsonKey(name: 'micro_description') String? microDescription,
    String? image,
    double? latitude,
    double? longitude,
    @JsonKey(name: 'michelin_stars') int? michelinStars,
    double? rating,
    String? neighborhood,
    String? address,
    String? phone,
    String? website,
    @JsonKey(name: 'price_level') int? priceLevel,
    @JsonKey(name: 'opening_hours') Map<String, dynamic>? openingHours,
    List<String>? tags,
    @JsonKey(name: 'instagram_handle') String? instagramHandle,
    @JsonKey(name: 'google_place_id') String? googlePlaceId,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _Destination;

  factory Destination.fromJson(Map<String, dynamic> json) =>
      _$DestinationFromJson(json);
}

/// Category enum for type-safe category handling
enum DestinationCategory {
  restaurant,
  hotel,
  bar,
  cafe,
  shop,
  museum,
  attraction,
  experience,
  other;

  String get displayName {
    switch (this) {
      case DestinationCategory.restaurant:
        return 'Restaurant';
      case DestinationCategory.hotel:
        return 'Hotel';
      case DestinationCategory.bar:
        return 'Bar';
      case DestinationCategory.cafe:
        return 'Café';
      case DestinationCategory.shop:
        return 'Shop';
      case DestinationCategory.museum:
        return 'Museum';
      case DestinationCategory.attraction:
        return 'Attraction';
      case DestinationCategory.experience:
        return 'Experience';
      case DestinationCategory.other:
        return 'Other';
    }
  }

  static DestinationCategory fromString(String value) {
    return DestinationCategory.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => DestinationCategory.other,
    );
  }
}

/// Extension methods for Destination
extension DestinationX on Destination {
  DestinationCategory get categoryEnum =>
      DestinationCategory.fromString(category);

  String get displayLocation {
    if (neighborhood != null && neighborhood!.isNotEmpty) {
      return '$neighborhood, $city';
    }
    if (country != null && country!.isNotEmpty) {
      return '$city, $country';
    }
    return city;
  }

  String get priceIndicator {
    if (priceLevel == null) return '';
    return '\$' * priceLevel!;
  }

  bool get hasCoordinates => latitude != null && longitude != null;
}
