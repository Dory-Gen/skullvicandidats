import { Suspense } from "react";
import ApplicationDetailPage from "@/components/admin/application-detail-page";

export default function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="admin-loading"><span className="loading-mark">k.</span><p>Chargement du profil…</p></main>}>
      <ApplicationDetail params={params} />
    </Suspense>
  );
}

async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationDetailPage id={id} />;
}
