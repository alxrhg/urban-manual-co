import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/providers/auth_provider.dart';

/// Profile screen with iOS native settings-style design
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          return _buildLoginPrompt(context);
        }
        return _buildProfile(context, ref, user);
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
        middle: Text('Profile'),
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
                  CupertinoIcons.person_circle,
                  size: 80,
                  color: CupertinoColors.systemGrey,
                ),
                const SizedBox(height: 24),
                Text(
                  'Welcome to Urban Manual',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to save places, track visits, and get personalized recommendations.',
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
                    onPressed: () => context.push('/login?redirect=/profile'),
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

  Widget _buildProfile(BuildContext context, WidgetRef ref, dynamic user) {
    final authService = ref.read(authServiceProvider);

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
            largeTitle: Text('Profile'),
            border: null,
          ),

          // User info section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    // Avatar
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: CupertinoColors.systemGrey5.resolveFrom(context),
                        shape: BoxShape.circle,
                      ),
                      child: user.userMetadata?['avatar_url'] != null
                          ? ClipOval(
                              child: Image.network(
                                user.userMetadata!['avatar_url'],
                                fit: BoxFit.cover,
                              ),
                            )
                          : Icon(
                              CupertinoIcons.person_fill,
                              size: 30,
                              color: CupertinoColors.systemGrey.resolveFrom(context),
                            ),
                    ),
                    const SizedBox(width: 16),
                    // User details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.userMetadata?['full_name'] ??
                                user.email?.split('@').first ??
                                'User',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: CupertinoColors.label.resolveFrom(context),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user.email ?? '',
                            style: TextStyle(
                              fontSize: 14,
                              color: CupertinoColors.secondaryLabel.resolveFrom(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Settings sections
          SliverToBoxAdapter(
            child: CupertinoListSection.insetGrouped(
              header: const Text('Account'),
              children: [
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.person),
                  title: const Text('Edit Profile'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Navigate to edit profile
                  },
                ),
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.bell),
                  title: const Text('Notifications'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Navigate to notifications settings
                  },
                ),
              ],
            ),
          ),

          SliverToBoxAdapter(
            child: CupertinoListSection.insetGrouped(
              header: const Text('Preferences'),
              children: [
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.heart),
                  title: const Text('Taste Profile'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Navigate to taste profile
                  },
                ),
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.location),
                  title: const Text('Location Settings'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Navigate to location settings
                  },
                ),
              ],
            ),
          ),

          SliverToBoxAdapter(
            child: CupertinoListSection.insetGrouped(
              header: const Text('Support'),
              children: [
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.question_circle),
                  title: const Text('Help & Support'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Open help
                  },
                ),
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.doc_text),
                  title: const Text('Privacy Policy'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Open privacy policy
                  },
                ),
                CupertinoListTile(
                  leading: const Icon(CupertinoIcons.doc_text),
                  title: const Text('Terms of Service'),
                  trailing: const CupertinoListTileChevron(),
                  onTap: () {
                    // TODO: Open terms
                  },
                ),
              ],
            ),
          ),

          // Sign out button
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: CupertinoButton(
                color: CupertinoColors.destructiveRed,
                onPressed: () async {
                  final confirmed = await showCupertinoDialog<bool>(
                    context: context,
                    builder: (context) => CupertinoAlertDialog(
                      title: const Text('Sign Out'),
                      content: const Text('Are you sure you want to sign out?'),
                      actions: [
                        CupertinoDialogAction(
                          isDefaultAction: true,
                          child: const Text('Cancel'),
                          onPressed: () => Navigator.pop(context, false),
                        ),
                        CupertinoDialogAction(
                          isDestructiveAction: true,
                          child: const Text('Sign Out'),
                          onPressed: () => Navigator.pop(context, true),
                        ),
                      ],
                    ),
                  );

                  if (confirmed == true) {
                    await authService.signOut();
                  }
                },
                child: const Text('Sign Out'),
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
}
