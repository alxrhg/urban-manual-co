import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Provider for current auth state
final authStateProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map(
    (event) => event.session?.user,
  );
});

/// Provider for current user profile
final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authState = await ref.watch(authStateProvider.future);
  if (authState == null) return null;

  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('user_preferences')
      .select()
      .eq('user_id', authState.id)
      .maybeSingle();

  return response;
});

/// Auth service for login/logout operations
class AuthService {
  final _supabase = Supabase.instance.client;

  /// Sign in with Google
  Future<AuthResponse> signInWithGoogle() async {
    return await _supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.urbanmanual.app://login-callback',
    );
  }

  /// Sign in with Apple
  Future<AuthResponse> signInWithApple() async {
    return await _supabase.auth.signInWithOAuth(
      OAuthProvider.apple,
      redirectTo: 'io.urbanmanual.app://login-callback',
    );
  }

  /// Sign out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  /// Get current user
  User? get currentUser => _supabase.auth.currentUser;

  /// Check if user is logged in
  bool get isLoggedIn => currentUser != null;
}

/// Provider for auth service
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});
