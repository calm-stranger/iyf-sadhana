import { Page, Skeleton } from "@/components/ui";

export function ListSkeleton({
  size = "sm",
  rows = 5,
  header = true,
}: {
  size?: "sm" | "md" | "lg";
  rows?: number;
  header?: boolean;
}) {
  return (
    <Page size={size}>
      {header && (
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
        ))}
      </div>
    </Page>
  );
}

export function CardEntrySkeleton() {
  return (
    <Page size="sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
        ))}
      </div>
    </Page>
  );
}

export function AnalysisSkeleton() {
  return (
    <Page size="md">
      <Skeleton className="mb-4 h-7 w-36" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </Page>
  );
}
