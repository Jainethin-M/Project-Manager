"use client";

import { ProjectForm } from "@/components/project/project-form";
import type { Project } from "@/types/project";

export function ProjectDetail({ project }: { project: Project }) {
  return <ProjectForm project={project} viewOnly />;
}
