import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'config/router.dart';

/// Urban Manual iOS App with native Cupertino design
class UrbanManualApp extends ConsumerWidget {
  const UrbanManualApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    // Use CupertinoApp for native iOS look and feel
    return CupertinoApp.router(
      title: 'Urban Manual',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.cupertinoLight,
      routerConfig: router,
      // Wrap with Material for occasional Material widgets
      builder: (context, child) {
        return Material(
          color: CupertinoColors.systemBackground.resolveFrom(context),
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.noScaling,
            ),
            child: child!,
          ),
        );
      },
    );
  }
}
