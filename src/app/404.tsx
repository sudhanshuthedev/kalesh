'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function NotFoundContent() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-white text-6xl md:text-8xl font-bold mb-6">404</h1>
          <h2 className="text-white text-2xl md:text-3xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-400 text-base md:text-lg mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link href="/" className="inline-block bg-white text-black font-medium px-6 py-3 rounded-md hover:bg-gray-200 transition-colors">
            Return Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}
