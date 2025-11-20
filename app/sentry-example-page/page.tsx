'use client';

import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryExamplePage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerClientError = () => {
    try {
      // This will throw a ReferenceError
      // @ts-ignore - intentionally undefined
      myUndefinedFunction();
    } catch (error) {
      Sentry.captureException(error);
      setErrorMessage('Client error captured and sent to Sentry!');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const triggerUnhandledError = () => {
    // This will throw an unhandled error
    throw new Error('Test unhandled error from Sentry test page');
  };

  const triggerAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Test async error from Sentry test page'));
        }, 100);
      });
    } catch (error) {
      Sentry.captureException(error);
      setErrorMessage('Async error captured and sent to Sentry!');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const triggerCustomMessage = () => {
    Sentry.captureMessage('Test message from Sentry example page', 'info');
    setErrorMessage('Custom message sent to Sentry!');
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const triggerErrorWithContext = () => {
    Sentry.withScope((scope) => {
      scope.setTag('test-type', 'manual-test');
      scope.setContext('test-context', {
        page: 'sentry-example-page',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
      Sentry.captureException(new Error('Test error with additional context'));
      setErrorMessage('Error with context sent to Sentry!');
      setTimeout(() => setErrorMessage(null), 3000);
    });
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sentry Test Page</h1>
          <p className="text-muted-foreground">
            Use the buttons below to trigger different types of errors and verify your Sentry integration is working correctly.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-6 border rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">Client-Side Errors</h2>
            <p className="text-sm text-muted-foreground">
              These errors are caught and sent to Sentry using captureException.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={triggerClientError} variant="destructive">
                Trigger Client Error
              </Button>
              <Button onClick={triggerAsyncError} variant="destructive">
                Trigger Async Error
              </Button>
            </div>
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">Unhandled Errors</h2>
            <p className="text-sm text-muted-foreground">
              This will throw an unhandled error that should be automatically captured by Sentry.
            </p>
            <Button onClick={triggerUnhandledError} variant="destructive">
              Trigger Unhandled Error
            </Button>
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">Custom Messages</h2>
            <p className="text-sm text-muted-foreground">
              Send custom messages to Sentry for testing or logging.
            </p>
            <Button onClick={triggerCustomMessage} variant="outline">
              Send Custom Message
            </Button>
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">Errors with Context</h2>
            <p className="text-sm text-muted-foreground">
              Send errors with additional context, tags, and metadata.
            </p>
            <Button onClick={triggerErrorWithContext} variant="outline">
              Trigger Error with Context
            </Button>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Next steps:</strong> After triggering an error, check your Sentry dashboard at{' '}
            <a
              href="https://sentry.io/organizations/the-manual-company/projects/sentry-red-park/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              sentry.io
            </a>{' '}
            to verify the errors are being captured.
          </p>
        </div>
      </div>
    </div>
  );
}

