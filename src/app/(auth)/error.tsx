"use client";

import { Button } from "@/components/ui/button";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[auth error]", error.message);
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Please try signing in again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
