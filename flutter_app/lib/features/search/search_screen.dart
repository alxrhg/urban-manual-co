import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/destination.dart';
import '../../shared/widgets/destination_card.dart';
import 'providers/search_provider.dart';

/// Search screen with iOS native search UI
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchQuery = ref.watch(searchQueryProvider);
    final searchResults = ref.watch(searchResultsProvider);

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: CupertinoSearchTextField(
          controller: _searchController,
          focusNode: _focusNode,
          placeholder: 'Search destinations',
          onChanged: (value) {
            ref.read(searchQueryProvider.notifier).state = value;
          },
          onSubmitted: (value) {
            _focusNode.unfocus();
          },
        ),
        border: null,
      ),
      child: SafeArea(
        child: searchQuery.isEmpty
            ? _buildSuggestions(context)
            : _buildSearchResults(context, searchResults),
      ),
    );
  }

  Widget _buildSuggestions(BuildContext context) {
    return CustomScrollView(
      slivers: [
        // Recent searches header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Popular Searches',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.secondaryLabel.resolveFrom(context),
              ),
            ),
          ),
        ),

        // Popular search terms
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final suggestions = [
                'Tokyo restaurants',
                'Paris hotels',
                'New York bars',
                'London cafes',
                'Michelin star',
                'Rooftop bar',
              ];
              return CupertinoListTile(
                leading: const Icon(
                  CupertinoIcons.search,
                  size: 20,
                ),
                title: Text(suggestions[index]),
                onTap: () {
                  _searchController.text = suggestions[index];
                  ref.read(searchQueryProvider.notifier).state = suggestions[index];
                },
              );
            },
            childCount: 6,
          ),
        ),

        // Categories header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Text(
              'Categories',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.secondaryLabel.resolveFrom(context),
              ),
            ),
          ),
        ),

        // Category chips
        SliverToBoxAdapter(
          child: SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _CategoryChip(label: 'Restaurants', onTap: () => _searchCategory('restaurant')),
                _CategoryChip(label: 'Hotels', onTap: () => _searchCategory('hotel')),
                _CategoryChip(label: 'Bars', onTap: () => _searchCategory('bar')),
                _CategoryChip(label: 'Cafes', onTap: () => _searchCategory('cafe')),
                _CategoryChip(label: 'Shops', onTap: () => _searchCategory('shop')),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _searchCategory(String category) {
    _searchController.text = category;
    ref.read(searchQueryProvider.notifier).state = category;
  }

  Widget _buildSearchResults(
    BuildContext context,
    AsyncValue<List<Destination>> results,
  ) {
    return results.when(
      data: (destinations) {
        if (destinations.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  CupertinoIcons.search,
                  size: 48,
                  color: CupertinoColors.systemGrey,
                ),
                const SizedBox(height: 16),
                Text(
                  'No results found',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Try a different search term',
                  style: TextStyle(
                    fontSize: 15,
                    color: CupertinoColors.secondaryLabel.resolveFrom(context),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: destinations.length,
          itemBuilder: (context, index) {
            final destination = destinations[index];
            return Padding(
              padding: EdgeInsets.only(
                bottom: index < destinations.length - 1 ? 16 : 100,
              ),
              child: DestinationCard(
                destination: destination,
                height: 240,
                onTap: () => context.push('/destination/${destination.slug}'),
              ),
            );
          },
        );
      },
      loading: () => const Center(
        child: CupertinoActivityIndicator(),
      ),
      error: (error, stack) => Center(
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
              'Search failed',
              style: TextStyle(
                color: CupertinoColors.secondaryLabel.resolveFrom(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: CupertinoButton(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
        borderRadius: BorderRadius.circular(20),
        onPressed: onTap,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: CupertinoColors.label.resolveFrom(context),
          ),
        ),
      ),
    );
  }
}
