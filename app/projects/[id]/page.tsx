import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/project/project-detail";
import { getProjectById } from "@/services/project-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
