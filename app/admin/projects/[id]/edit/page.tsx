import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/project/project-form";
import { getProjectById } from "@/services/project-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return <ProjectForm project={project} />;
}
