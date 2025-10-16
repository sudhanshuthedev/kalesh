'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-white text-5xl md:text-6xl font-bold mb-6">Something went wrong</h1>
        <p className="text-gray-400 text-base md:text-lg mb-8 max-w-md mx-auto">
          An unexpected error occurred. We've been notified and are working to fix the issue.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-white text-black font-medium px-6 py-3 rounded-md hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-transparent border border-white text-white font-medium px-6 py-3 rounded-md hover:bg-white/10 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
