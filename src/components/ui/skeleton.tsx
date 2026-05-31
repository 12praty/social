import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-secondary", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-12" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
