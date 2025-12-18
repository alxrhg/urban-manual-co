import 'package:flutter/cupertino.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../features/home/providers/popular_cities_provider.dart';

/// Native iOS styled city card
class CityCard extends StatelessWidget {
  const CityCard({
    super.key,
    required this.city,
    this.onTap,
  });

  final City city;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background image
            if (city.image != null)
              CachedNetworkImage(
                imageUrl: city.image!,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: CupertinoColors.systemGrey5.resolveFrom(context),
                ),
                errorWidget: (context, url, error) => Container(
                  color: CupertinoColors.systemGrey5.resolveFrom(context),
                ),
              )
            else
              Container(
                color: CupertinoColors.systemGrey5.resolveFrom(context),
              ),

            // Gradient overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    CupertinoColors.black.withOpacity(0),
                    CupertinoColors.black.withOpacity(0.6),
                  ],
                ),
              ),
            ),

            // Content
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    city.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${city.destinationCount} places',
                    style: TextStyle(
                      fontSize: 12,
                      color: CupertinoColors.white.withOpacity(0.8),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
