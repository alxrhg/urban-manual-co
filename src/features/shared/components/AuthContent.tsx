'use client';

import { useState, useCallback, useId, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * AuthContent - Login/signup view for IntelligentDrawer
 */
const AuthContent = memo(function AuthContent() {
  const router = useRouter();
  const { signIn, signUp, signInWithApple } = useAuth();
  const { close, navigate } = useIntelligentDrawer();
  const uniqueId = useId();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
        setSuccess('Account created! Please check your email to verify.');
        setName('');
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        // Navigate to account after successful login
        navigate('account', {});
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [isSignUp, email, password, name, signUp, signIn, navigate]);

  const handleAppleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      // OAuth will redirect, drawer will close on success
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Apple');
      setLoading(false);
    }
  }, [signInWithApple]);

  const toggleMode = useCallback(() => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
  }, [isSignUp]);

  return (
    <div className="flex flex-col h-full">
      {/* Welcome text */}
      <div className="flex-shrink-0 px-5 pt-4 pb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          {isSignUp ? 'Create Account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isSignUp ? 'Begin your travel journey' : 'Sign in to your account'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe">
        {/* Apple Sign In */}
        <button
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 active:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field (Sign Up only) */}
          {isSignUp && (
            <div>
              <label htmlFor={`auth-name-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Name
              </label>
              <input
                id={`auth-name-${uniqueId}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors text-sm text-gray-900 dark:text-white"
                placeholder="Your name"
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor={`auth-email-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Email
            </label>
              <input
                id={`auth-email-${uniqueId}`}
                type="email"
                value={email}
                onChange={(e) => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/82b45f6a-fbfe-48b1-8584-ea1380f88caa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContent.tsx:139',message:'Email input onChange',data:{oldValue:email,newValue:e.target.value,labelText:'Email',inputId:`auth-email-${uniqueId}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  setEmail(e.target.value);
                }}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors text-sm text-gray-900 dark:text-white"
                placeholder="you@example.com"
              />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor={`auth-password-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Password
            </label>
            <div className="relative">
              <input
                id={`auth-password-${uniqueId}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/82b45f6a-fbfe-48b1-8584-ea1380f88caa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContent.tsx:157',message:'Password input onChange',data:{oldValue:password,newValue:e.target.value,labelText:'Password',inputId:`auth-password-${uniqueId}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  setPassword(e.target.value);
                }}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full px-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors text-sm text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp ? (
              <p className="text-xs text-gray-400 mt-2">Minimum 6 characters</p>
            ) : (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push('/auth/forgot-password');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert variant="default" className="rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">Success</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 active:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 mt-6"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-6 mb-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          By continuing, you agree to our{' '}
          <button
            onClick={() => {
              close();
              router.push('/privacy');
            }}
            className="hover:text-gray-900 dark:hover:text-white underline"
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
});

export default AuthContent;
