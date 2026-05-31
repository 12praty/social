"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[global error]", error.message);
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Critical error</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Please reload the page.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
