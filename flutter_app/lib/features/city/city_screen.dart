import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/destination.dart';
import '../../shared/widgets/destination_card.dart';
import '../destination/providers/destination_provider.dart';

/// City screen showing destinations in a specific city
class CityScreen extends ConsumerWidget {
  const CityScreen({
    super.key,
    required this.slug,
  });

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final destinationsAsync = ref.watch(destinationsByCityProvider(slug));

    // Convert slug to display name
    final cityName = slug
        .split('-')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          CupertinoSliverNavigationBar(
            largeTitle: Text(cityName),
            border: null,
          ),

          // Category filter chips
          SliverToBoxAdapter(
            child: _CategoryFilter(
              onCategorySelected: (category) {
                // TODO: Implement category filtering
              },
            ),
          ),

          // Destinations list
          destinationsAsync.when(
            data: (destinations) {
              if (destinations.isEmpty) {
                return SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          CupertinoIcons.map,
                          size: 48,
                          color: CupertinoColors.systemGrey,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No places found in $cityName',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: CupertinoColors.label.resolveFrom(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              // Group destinations by category
              final grouped = _groupByCategory(destinations);

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final category = grouped.keys.elementAt(index);
                    final items = grouped[category]!;

                    return _CategorySection(
                      category: category,
                      destinations: items,
                      onDestinationTap: (slug) =>
                          context.push('/destination/$slug'),
                    );
                  },
                  childCount: grouped.length,
                ),
              );
            },
            loading: () => const SliverFillRemaining(
              child: Center(child: CupertinoActivityIndicator()),
            ),
            error: (error, stack) => SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      CupertinoIcons.exclamationmark_circle,
                      size: 48,
                      color: CupertinoColors.systemGrey,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Error loading destinations',
                      style: TextStyle(
                        color: CupertinoColors.secondaryLabel.resolveFrom(context),
                      ),
                    ),
                    const SizedBox(height: 16),
                    CupertinoButton(
                      child: const Text('Retry'),
                      onPressed: () =>
                          ref.invalidate(destinationsByCityProvider(slug)),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom spacing
          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }

  Map<String, List<Destination>> _groupByCategory(List<Destination> destinations) {
    final grouped = <String, List<Destination>>{};

    for (final dest in destinations) {
      final category = dest.categoryEnum.displayName;
      grouped.putIfAbsent(category, () => []).add(dest);
    }

    // Sort categories by item count
    final sorted = Map.fromEntries(
      grouped.entries.toList()
        ..sort((a, b) => b.value.length.compareTo(a.value.length)),
    );

    return sorted;
  }
}

class _CategoryFilter extends StatefulWidget {
  const _CategoryFilter({
    required this.onCategorySelected,
  });

  final void Function(String?) onCategorySelected;

  @override
  State<_CategoryFilter> createState() => _CategoryFilterState();
}

class _CategoryFilterState extends State<_CategoryFilter> {
  String? _selectedCategory;

  static const _categories = [
    ('All', null),
    ('Restaurants', 'restaurant'),
    ('Hotels', 'hotel'),
    ('Bars', 'bar'),
    ('Cafes', 'cafe'),
    ('Shops', 'shop'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final (label, value) = _categories[index];
          final isSelected = _selectedCategory == value;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: CupertinoButton(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              color: isSelected
                  ? CupertinoColors.activeBlue
                  : CupertinoColors.secondarySystemBackground.resolveFrom(context),
              borderRadius: BorderRadius.circular(20),
              onPressed: () {
                setState(() => _selectedCategory = value);
                widget.onCategorySelected(value);
              },
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: isSelected
                      ? CupertinoColors.white
                      : CupertinoColors.label.resolveFrom(context),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CategorySection extends StatelessWidget {
  const _CategorySection({
    required this.category,
    required this.destinations,
    required this.onDestinationTap,
  });

  final String category;
  final List<Destination> destinations;
  final void Function(String slug) onDestinationTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Row(
            children: [
              Text(
                category,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: CupertinoColors.label.resolveFrom(context),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: CupertinoColors.systemGrey5.resolveFrom(context),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${destinations.length}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.secondaryLabel.resolveFrom(context),
                  ),
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 260,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: destinations.length,
            itemBuilder: (context, index) {
              final destination = destinations[index];
              return Padding(
                padding: EdgeInsets.only(
                  right: index < destinations.length - 1 ? 12 : 0,
                ),
                child: DestinationCard(
                  destination: destination,
                  width: 200,
                  onTap: () => onDestinationTap(destination.slug),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
