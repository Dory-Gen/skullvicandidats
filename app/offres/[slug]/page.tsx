import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import JobPageContent, { JobPageLoading } from "@/components/public/job-page-content";
import { getPublishedJobBySlug } from "@/lib/jobs";

export default function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<JobPageLoading />}>
      <JobDetail params={params} />
    </Suspense>
  );
}

async function JobDetail({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  return <JobPageContent job={job} />;
}
