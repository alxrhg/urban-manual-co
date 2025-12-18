import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/models/destination.dart';
import '../../config/theme.dart';
import '../saved/providers/saved_provider.dart';
import 'providers/destination_provider.dart';

/// Destination detail screen with iOS native design
class DestinationDetailScreen extends ConsumerWidget {
  const DestinationDetailScreen({
    super.key,
    required this.slug,
  });

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final destinationAsync = ref.watch(destinationBySlugProvider(slug));
    final isSavedAsync = ref.watch(isDestinationSavedProvider(slug));

    return destinationAsync.when(
      data: (destination) {
        if (destination == null) {
          return CupertinoPageScaffold(
            navigationBar: const CupertinoNavigationBar(
              middle: Text('Not Found'),
            ),
            child: const Center(
              child: Text('Destination not found'),
            ),
          );
        }

        return CupertinoPageScaffold(
          child: CustomScrollView(
            slivers: [
              // Hero image with navigation bar
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                stretch: true,
                backgroundColor: CupertinoColors.systemBackground.resolveFrom(context),
                leading: CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: CupertinoColors.black.withOpacity(0.5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      CupertinoIcons.xmark,
                      color: CupertinoColors.white,
                      size: 20,
                    ),
                  ),
                  onPressed: () => Navigator.pop(context),
                ),
                actions: [
                  // Save button
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: CupertinoColors.black.withOpacity(0.5),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isSavedAsync.value == true
                            ? CupertinoIcons.bookmark_fill
                            : CupertinoIcons.bookmark,
                        color: CupertinoColors.white,
                        size: 20,
                      ),
                    ),
                    onPressed: () async {
                      final notifier = ref.read(savedDestinationsProvider.notifier);
                      if (isSavedAsync.value == true) {
                        await notifier.removeSaved(slug);
                      } else {
                        await notifier.addSaved(slug);
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  // Share button
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: CupertinoColors.black.withOpacity(0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        CupertinoIcons.share,
                        color: CupertinoColors.white,
                        size: 20,
                      ),
                    ),
                    onPressed: () {
                      Share.share(
                        'Check out ${destination.name} on Urban Manual: https://urbanmanual.co/destination/$slug',
                      );
                    },
                  ),
                  const SizedBox(width: 16),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (destination.image != null)
                        CachedNetworkImage(
                          imageUrl: destination.image!,
                          fit: BoxFit.cover,
                        )
                      else
                        Container(
                          color: CupertinoColors.systemGrey5.resolveFrom(context),
                        ),
                      // Gradient overlay
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black54,
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category and rating row
                      Row(
                        children: [
                          Container(
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
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (destination.michelinStars != null &&
                              destination.michelinStars! > 0) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE4002B),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    CupertinoIcons.star_fill,
                                    size: 12,
                                    color: CupertinoColors.white,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${destination.michelinStars} Michelin',
                                    style: const TextStyle(
                                      color: CupertinoColors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const Spacer(),
                          if (destination.rating != null)
                            Row(
                              children: [
                                const Icon(
                                  CupertinoIcons.star_fill,
                                  size: 16,
                                  color: Color(0xFFFFB800),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  destination.rating!.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: CupertinoColors.label.resolveFrom(context),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Name
                      Text(
                        destination.name,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: CupertinoColors.label.resolveFrom(context),
                        ),
                      ),

                      const SizedBox(height: 4),

                      // Location
                      Text(
                        destination.displayLocation,
                        style: TextStyle(
                          fontSize: 17,
                          color: CupertinoColors.secondaryLabel.resolveFrom(context),
                        ),
                      ),

                      if (destination.priceIndicator.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          destination.priceIndicator,
                          style: TextStyle(
                            fontSize: 15,
                            color: CupertinoColors.secondaryLabel.resolveFrom(context),
                          ),
                        ),
                      ],

                      const SizedBox(height: 24),

                      // Description
                      if (destination.description != null) ...[
                        Text(
                          'About',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: CupertinoColors.label.resolveFrom(context),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          destination.description!,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.5,
                            color: CupertinoColors.label.resolveFrom(context),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Contact info
                      _buildContactSection(context, destination),

                      const SizedBox(height: 100),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const CupertinoPageScaffold(
        child: Center(child: CupertinoActivityIndicator()),
      ),
      error: (error, stack) => CupertinoPageScaffold(
        child: Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildContactSection(BuildContext context, Destination destination) {
    final hasContact = destination.address != null ||
        destination.phone != null ||
        destination.website != null;

    if (!hasContact) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Contact',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: CupertinoColors.label.resolveFrom(context),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              if (destination.address != null)
                _ContactTile(
                  icon: CupertinoIcons.location,
                  label: destination.address!,
                  onTap: () => _openMaps(destination),
                ),
              if (destination.phone != null)
                _ContactTile(
                  icon: CupertinoIcons.phone,
                  label: destination.phone!,
                  onTap: () => launchUrl(Uri.parse('tel:${destination.phone}')),
                ),
              if (destination.website != null)
                _ContactTile(
                  icon: CupertinoIcons.globe,
                  label: 'Visit Website',
                  onTap: () => launchUrl(Uri.parse(destination.website!)),
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _openMaps(Destination destination) {
    if (destination.hasCoordinates) {
      launchUrl(Uri.parse(
        'https://maps.apple.com/?q=${destination.latitude},${destination.longitude}',
      ));
    } else if (destination.address != null) {
      launchUrl(Uri.parse(
        'https://maps.apple.com/?q=${Uri.encodeComponent(destination.address!)}',
      ));
    }
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

class _ContactTile extends StatelessWidget {
  const _ContactTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: CupertinoColors.separator.resolveFrom(context),
              width: 0.5,
            ),
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: CupertinoColors.activeBlue,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  color: CupertinoColors.label.resolveFrom(context),
                ),
              ),
            ),
            const Icon(
              CupertinoIcons.chevron_right,
              size: 16,
              color: CupertinoColors.tertiaryLabel,
            ),
          ],
        ),
      ),
    );
  }
}

// Need to add Colors import for gradient
class Colors {
  static const transparent = Color(0x00000000);
  static const black54 = Color(0x8A000000);
}
