'use client';

import { useState } from 'react';
import { Mail, Loader2, Check, ArrowRight } from 'lucide-react';

/**
 * Newsletter subscription section
 */
export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Submit to newsletter API
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <section className="py-16 md:py-24 bg-gray-900 dark:bg-black">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center bg-white/10 rounded-xl">
            <Mail className="w-6 h-6 text-white" />
          </div>

          {/* Headline */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-white mb-4">
            Join discerning travelers worldwide
          </h2>

          <p className="text-gray-400 mb-8">
            Weekly insider picks. No spam. Unsubscribe anytime.
          </p>

          {/* Form */}
          {status === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>Thanks for subscribing!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="Enter your email"
                className="
                  flex-1 px-5 py-3.5
                  bg-white/10
                  border border-white/20
                  rounded-xl
                  text-white placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-white/30
                  transition-all duration-200
                "
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="
                  flex items-center justify-center gap-2
                  px-6 py-3.5
                  bg-white text-gray-900
                  rounded-xl
                  font-medium
                  hover:bg-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Error Message */}
          {status === 'error' && errorMessage && (
            <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
          )}

          {/* Privacy Note */}
          <p className="mt-6 text-xs text-gray-500">
            By subscribing, you agree to our{' '}
            <a href="/privacy" className="underline hover:text-gray-400">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
