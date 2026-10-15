import { Suspense } from "react";
import DemoJobPage from "@/components/public/demo-job-page";

export default function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <DemoJob params={params} />
    </Suspense>
  );
}

async function DemoJob({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DemoJobPage slug={slug} />;
}
