import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';

/// Login screen with iOS native design and OAuth options
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({
    super.key,
    this.redirectTo,
  });

  final String? redirectTo;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Sign In'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Text('Cancel'),
          onPressed: () => context.pop(),
        ),
        border: null,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),

              // Logo/Title
              const Icon(
                CupertinoIcons.map,
                size: 64,
                color: CupertinoColors.label,
              ),
              const SizedBox(height: 24),
              Text(
                'Urban Manual',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: CupertinoColors.label.resolveFrom(context),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Discover curated destinations worldwide',
                style: TextStyle(
                  fontSize: 15,
                  color: CupertinoColors.secondaryLabel.resolveFrom(context),
                ),
              ),

              const Spacer(),

              // Sign in with Apple (native iOS feel)
              SizedBox(
                width: double.infinity,
                height: 50,
                child: CupertinoButton(
                  padding: EdgeInsets.zero,
                  color: CupertinoColors.black,
                  borderRadius: BorderRadius.circular(12),
                  onPressed: _isLoading ? null : _signInWithApple,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        CupertinoIcons.logo_apple,
                        color: CupertinoColors.white,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isLoading ? 'Signing in...' : 'Continue with Apple',
                        style: const TextStyle(
                          color: CupertinoColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Sign in with Google
              SizedBox(
                width: double.infinity,
                height: 50,
                child: CupertinoButton(
                  padding: EdgeInsets.zero,
                  color: CupertinoColors.secondarySystemBackground.resolveFrom(context),
                  borderRadius: BorderRadius.circular(12),
                  onPressed: _isLoading ? null : _signInWithGoogle,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Google icon placeholder
                      Container(
                        width: 20,
                        height: 20,
                        decoration: const BoxDecoration(
                          color: CupertinoColors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text(
                            'G',
                            style: TextStyle(
                              color: Color(0xFF4285F4),
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Continue with Google',
                        style: TextStyle(
                          color: CupertinoColors.label.resolveFrom(context),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Terms and privacy
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: CupertinoColors.tertiaryLabel.resolveFrom(context),
                ),
              ),

              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signInWithApple() async {
    setState(() => _isLoading = true);

    try {
      final authService = ref.read(authServiceProvider);
      await authService.signInWithApple();

      if (mounted) {
        if (widget.redirectTo != null) {
          context.go(widget.redirectTo!);
        } else {
          context.pop();
        }
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to sign in with Apple');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _signInWithGoogle() async {
    setState(() => _isLoading = true);

    try {
      final authService = ref.read(authServiceProvider);
      await authService.signInWithGoogle();

      if (mounted) {
        if (widget.redirectTo != null) {
          context.go(widget.redirectTo!);
        } else {
          context.pop();
        }
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to sign in with Google');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            child: const Text('OK'),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }
}
