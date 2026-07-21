import { AnalysisScreen } from "@/features/analysis/analysis-screen";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisScreen analysisId={id} />;
}
