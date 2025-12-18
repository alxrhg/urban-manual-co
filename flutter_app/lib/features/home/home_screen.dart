import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/destination_card.dart';
import '../../shared/widgets/city_card.dart';
import '../../shared/widgets/section_header.dart';
import 'providers/featured_destinations_provider.dart';
import 'providers/popular_cities_provider.dart';

/// Home screen with iOS native design
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          // Large title navigation bar (iOS style)
          const CupertinoSliverNavigationBar(
            largeTitle: Text('Urban Manual'),
            border: null,
          ),

          // Featured destinations section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: SectionHeader(
                title: 'Featured',
                onSeeAll: () => context.push('/explore'),
              ),
            ),
          ),

          // Featured destinations horizontal list
          SliverToBoxAdapter(
            child: SizedBox(
              height: 280,
              child: _FeaturedDestinationsList(),
            ),
          ),

          // Popular cities section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 32, 16, 8),
              child: SectionHeader(
                title: 'Popular Cities',
                onSeeAll: () => context.push('/explore'),
              ),
            ),
          ),

          // Cities grid
          SliverToBoxAdapter(
            child: _PopularCitiesGrid(),
          ),

          // Categories section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 32, 16, 8),
              child: SectionHeader(
                title: 'Browse by Category',
              ),
            ),
          ),

          // Categories list
          SliverToBoxAdapter(
            child: _CategoriesList(),
          ),

          // Bottom spacing
          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }
}

class _FeaturedDestinationsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featuredAsync = ref.watch(featuredDestinationsProvider);

    return featuredAsync.when(
      data: (destinations) => ListView.builder(
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
              width: 220,
              onTap: () => context.push('/destination/${destination.slug}'),
            ),
          );
        },
      ),
      loading: () => const Center(
        child: CupertinoActivityIndicator(),
      ),
      error: (error, stack) => Center(
        child: Text('Error loading destinations'),
      ),
    );
  }
}

class _PopularCitiesGrid extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final citiesAsync = ref.watch(popularCitiesProvider);

    return citiesAsync.when(
      data: (cities) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.4,
          ),
          itemCount: cities.length.clamp(0, 6),
          itemBuilder: (context, index) {
            final city = cities[index];
            return CityCard(
              city: city,
              onTap: () => context.push('/explore/city/${city.slug}'),
            );
          },
        ),
      ),
      loading: () => const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: CupertinoActivityIndicator()),
      ),
      error: (error, stack) => const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: Text('Error loading cities')),
      ),
    );
  }
}

class _CategoriesList extends StatelessWidget {
  static const _categories = [
    ('restaurant', 'Restaurants', CupertinoIcons.flame),
    ('hotel', 'Hotels', CupertinoIcons.bed_double),
    ('bar', 'Bars', CupertinoIcons.drop),
    ('cafe', 'Cafés', CupertinoIcons.cup_and_saucer),
    ('shop', 'Shops', CupertinoIcons.bag),
    ('museum', 'Museums', CupertinoIcons.building_2_fill),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final (slug, name, icon) = _categories[index];
          return Padding(
            padding: EdgeInsets.only(
              right: index < _categories.length - 1 ? 12 : 0,
            ),
            child: _CategoryChip(
              name: name,
              icon: icon,
              onTap: () => context.push('/search?category=$slug'),
            ),
          );
        },
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.name,
    required this.icon,
    required this.onTap,
  });

  final String name;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 28,
              color: CupertinoColors.label.resolveFrom(context),
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: CupertinoColors.label.resolveFrom(context),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
