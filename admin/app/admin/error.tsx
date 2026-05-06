"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">Admin route failed</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The error has been logged. Retry after fixing configuration or database issues.
        </p>
        <Button className="mt-6" onClick={() => reset()}>
          Retry
        </Button>
      </div>
    </div>
  );
}
