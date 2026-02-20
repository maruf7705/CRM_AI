"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-indigo-500">Global error</p>
          <h1 className="mt-2 text-2xl font-bold">The app hit a critical issue</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Reloading usually resolves this. If it continues, check server logs and retry.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
