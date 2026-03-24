"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="rounded-3xl border p-8 md:p-12 max-w-md w-full bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
        <h2 className="text-xl font-black mb-4 uppercase tracking-widest text-red-600 dark:text-red-400">
          Connection Error
        </h2>
        <p className="text-sm font-medium mb-8 text-gray-600 dark:text-gray-400">
          Unable to retrieve data. Please ensure the backend services are running and accessible.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
        <div className="mt-8 text-left">
           <details className="text-xs text-gray-500 bg-white/50 dark:bg-black/50 p-3 rounded-lg overflow-x-auto">
             <summary className="cursor-pointer font-bold mb-2">Error Details</summary>
             <pre className="whitespace-pre-wrap">{error.message}</pre>
           </details>
        </div>
      </div>
    </div>
  );
}
