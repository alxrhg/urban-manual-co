import 'package:flutter/cupertino.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/models/destination.dart';
import '../../config/theme.dart';

/// Native iOS styled destination card
class DestinationCard extends StatelessWidget {
  const DestinationCard({
    super.key,
    required this.destination,
    this.width,
    this.height,
    this.onTap,
  });

  final Destination destination;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width ?? double.infinity,
        height: height ?? 260,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (destination.image != null)
                    CachedNetworkImage(
                      imageUrl: destination.image!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: CupertinoColors.systemGrey5.resolveFrom(context),
                        child: const Center(
                          child: CupertinoActivityIndicator(),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: CupertinoColors.systemGrey5.resolveFrom(context),
                        child: const Icon(
                          CupertinoIcons.photo,
                          size: 40,
                          color: CupertinoColors.systemGrey,
                        ),
                      ),
                    )
                  else
                    Container(
                      color: CupertinoColors.systemGrey5.resolveFrom(context),
                      child: const Icon(
                        CupertinoIcons.photo,
                        size: 40,
                        color: CupertinoColors.systemGrey,
                      ),
                    ),

                  // Category badge
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(destination.category),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        destination.categoryEnum.displayName,
                        style: const TextStyle(
                          color: CupertinoColors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),

                  // Michelin stars
                  if (destination.michelinStars != null &&
                      destination.michelinStars! > 0)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: CupertinoColors.black.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              CupertinoIcons.star_fill,
                              size: 12,
                              color: Color(0xFFE4002B),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${destination.michelinStars}',
                              style: const TextStyle(
                                color: CupertinoColors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Content
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name
                    Text(
                      destination.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.label.resolveFrom(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),

                    // Location
                    Text(
                      destination.displayLocation,
                      style: TextStyle(
                        fontSize: 13,
                        color: CupertinoColors.secondaryLabel.resolveFrom(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),

                    const Spacer(),

                    // Rating and price
                    Row(
                      children: [
                        if (destination.rating != null) ...[
                          const Icon(
                            CupertinoIcons.star_fill,
                            size: 12,
                            color: Color(0xFFFFB800),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            destination.rating!.toStringAsFixed(1),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: CupertinoColors.label.resolveFrom(context),
                            ),
                          ),
                        ],
                        if (destination.priceIndicator.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            destination.priceIndicator,
                            style: TextStyle(
                              fontSize: 12,
                              color: CupertinoColors.secondaryLabel
                                  .resolveFrom(context),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'restaurant':
        return AppColors.restaurant;
      case 'hotel':
        return AppColors.hotel;
      case 'bar':
        return AppColors.bar;
      case 'cafe':
        return AppColors.cafe;
      case 'shop':
        return AppColors.shop;
      case 'museum':
        return AppColors.museum;
      case 'attraction':
        return AppColors.attraction;
      default:
        return CupertinoColors.systemGrey;
    }
  }
}
