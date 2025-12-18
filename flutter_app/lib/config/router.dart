import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/home/home_screen.dart';
import '../features/explore/explore_screen.dart';
import '../features/search/search_screen.dart';
import '../features/saved/saved_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/destination/destination_detail_screen.dart';
import '../features/city/city_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../shared/widgets/tab_scaffold.dart';

/// App router provider with native iOS navigation
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/home',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isLoggingIn = state.matchedLocation == '/login';

      // Redirect to login if accessing protected routes while not logged in
      final protectedRoutes = ['/saved', '/profile'];
      final isProtectedRoute = protectedRoutes.contains(state.matchedLocation);

      if (isProtectedRoute && !isLoggedIn && !isLoggingIn) {
        return '/login?redirect=${state.matchedLocation}';
      }

      return null;
    },
    routes: [
      // Tab-based navigation shell
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return TabScaffold(navigationShell: navigationShell);
        },
        branches: [
          // Home tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                name: 'home',
                pageBuilder: (context, state) => const CupertinoPage(
                  child: HomeScreen(),
                ),
              ),
            ],
          ),
          // Explore tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                name: 'explore',
                pageBuilder: (context, state) => const CupertinoPage(
                  child: ExploreScreen(),
                ),
                routes: [
                  GoRoute(
                    path: 'city/:slug',
                    name: 'city',
                    pageBuilder: (context, state) => CupertinoPage(
                      child: CityScreen(
                        slug: state.pathParameters['slug']!,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          // Search tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/search',
                name: 'search',
                pageBuilder: (context, state) => const CupertinoPage(
                  child: SearchScreen(),
                ),
              ),
            ],
          ),
          // Saved tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/saved',
                name: 'saved',
                pageBuilder: (context, state) => const CupertinoPage(
                  child: SavedScreen(),
                ),
              ),
            ],
          ),
          // Profile tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                name: 'profile',
                pageBuilder: (context, state) => const CupertinoPage(
                  child: ProfileScreen(),
                ),
              ),
            ],
          ),
        ],
      ),

      // Destination detail (modal/push route)
      GoRoute(
        path: '/destination/:slug',
        name: 'destination',
        pageBuilder: (context, state) => CupertinoPage(
          fullscreenDialog: true,
          child: DestinationDetailScreen(
            slug: state.pathParameters['slug']!,
          ),
        ),
      ),

      // Auth routes
      GoRoute(
        path: '/login',
        name: 'login',
        pageBuilder: (context, state) => CupertinoPage(
          fullscreenDialog: true,
          child: LoginScreen(
            redirectTo: state.uri.queryParameters['redirect'],
          ),
        ),
      ),
    ],
  );
});
