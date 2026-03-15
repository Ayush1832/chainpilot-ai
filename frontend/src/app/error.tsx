'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-()/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-()" />
      </div>
      
      <h2 className="text-3xl font-bold mb-4">Something went wrong</h2>
      
      <p className="text-() max-w-md mx-auto mb-8">
        We encountered an unexpected error while rendering this page. 
        {error.message && (
          <span className="block mt-2 text-sm text-() font-mono bg-() p-2 rounded">
            {error.message}
          </span>
        )}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = '/'}
          className="btn-outline"
        >
          Go Home
        </button>
        <button
          onClick={() => reset()}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
