"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Try again. If the problem persists, check Supabase connectivity and env vars.
        </p>
        <Button className="mt-6" onClick={() => reset()}>
          Retry
        </Button>
      </div>
    </div>
  );
}
