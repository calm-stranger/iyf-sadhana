import { requireSadhakaProfile } from "@/lib/data";
import { getAnalysis, parseRange } from "@/lib/analysis";
import { AnalysisView } from "@/components/AnalysisView";
import { BottomNav } from "@/components/BottomNav";

export default async function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  const profile = await requireSadhakaProfile();
  const sp = await searchParams;
  const data = await getAnalysis(profile.id, parseRange(sp.r));

  return (
    <>
      <main className="page page-md animate-page flex-1">
        <h1 className="text-[1.35rem] font-semibold tracking-tight">Analysis</h1>
        <AnalysisView data={data} />
      </main>
      <BottomNav portal={profile.role === "servant_leader" ? "leader" : undefined} />
    </>
  );
}
