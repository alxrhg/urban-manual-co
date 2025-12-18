import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/destination.dart';
import '../../shared/widgets/destination_card.dart';
import '../auth/providers/auth_provider.dart';
import 'providers/saved_provider.dart';

/// Saved places screen with iOS native design
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          return _buildLoginPrompt(context);
        }
        return _buildSavedList(context, ref);
      },
      loading: () => const CupertinoPageScaffold(
        child: Center(child: CupertinoActivityIndicator()),
      ),
      error: (error, stack) => CupertinoPageScaffold(
        child: Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildLoginPrompt(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Saved'),
        border: null,
      ),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  CupertinoIcons.bookmark,
                  size: 64,
                  color: CupertinoColors.systemGrey,
                ),
                const SizedBox(height: 24),
                Text(
                  'Save your favorites',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to save destinations and access them anywhere.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    color: CupertinoColors.secondaryLabel.resolveFrom(context),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    onPressed: () => context.push('/login?redirect=/saved'),
                    child: const Text('Sign In'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSavedList(BuildContext context, WidgetRef ref) {
    final savedAsync = ref.watch(savedDestinationsProvider);

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
            largeTitle: Text('Saved'),
            border: null,
          ),
          savedAsync.when(
            data: (destinations) {
              if (destinations.isEmpty) {
                return SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          CupertinoIcons.bookmark,
                          size: 48,
                          color: CupertinoColors.systemGrey,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No saved places yet',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: CupertinoColors.label.resolveFrom(context),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Start exploring and save your favorites',
                          style: TextStyle(
                            fontSize: 15,
                            color: CupertinoColors.secondaryLabel.resolveFrom(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final destination = destinations[index];
                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index < destinations.length - 1 ? 16 : 100,
                        ),
                        child: Dismissible(
                          key: Key(destination.slug),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 20),
                            decoration: BoxDecoration(
                              color: CupertinoColors.destructiveRed,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              CupertinoIcons.delete,
                              color: CupertinoColors.white,
                            ),
                          ),
                          onDismissed: (_) {
                            ref
                                .read(savedDestinationsProvider.notifier)
                                .removeSaved(destination.slug);
                          },
                          child: DestinationCard(
                            destination: destination,
                            height: 240,
                            onTap: () => context.push('/destination/${destination.slug}'),
                          ),
                        ),
                      );
                    },
                    childCount: destinations.length,
                  ),
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
                      'Error loading saved places',
                      style: TextStyle(
                        color: CupertinoColors.secondaryLabel.resolveFrom(context),
                      ),
                    ),
                    const SizedBox(height: 16),
                    CupertinoButton(
                      child: const Text('Retry'),
                      onPressed: () => ref.invalidate(savedDestinationsProvider),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
