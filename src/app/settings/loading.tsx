import { Page, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Page size="sm">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
      <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </Page>
  );
}
