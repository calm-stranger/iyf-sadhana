import { Page, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Page size="md">
      <Skeleton className="mb-4 h-6 w-48" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </Page>
  );
}
