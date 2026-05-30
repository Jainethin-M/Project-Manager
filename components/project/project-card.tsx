"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, ExternalLink, Eye, FolderOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { safeHref } from "@/lib/utils";
import type { ProjectCard as ProjectCardType } from "@/types/project";

type ProjectCardProps = {
  project: ProjectCardType;
  onDeleted?: (id: string) => void;
};

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function deleteProject() {
    if (!window.confirm(`Delete "${project.name}" from DevVault?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed.");
      onDeleted?.(project.id);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openFolder() {
    setMessage("");
    const response = await fetch(`/api/projects/${project.id}/open-folder`, { method: "POST" });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setMessage(result.error || "Unable to open folder.");
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="line-clamp-1 text-lg">
            <Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link>
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">{project.description || "No description yet."}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <Badge variant="outline">{project.hostingProvider}</Badge>
          {project.stack.slice(0, 4).map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
        </div>
      </CardHeader>
      
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="ghost" aria-label="Open frontend URL">
          <a href={safeHref(project.liveUrl || project.frontendUrl || `/projects/${project.id}`)} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
        </Button>
        <Button asChild size="sm" variant="ghost" aria-label="Edit project">
          <Link href={`/projects/${project.id}/edit`}><Edit3 className="h-4 w-4" /></Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={openFolder}
          disabled={!(project.localPath || project.backendStoragePath || project.frontendStoragePath)}
          aria-label="Open folder"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        {project.liveUrl ? (
          <Button asChild size="sm" variant="ghost" aria-label="Open hosted URL">
            <a href={safeHref(project.liveUrl)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        ) : null}
        <Button size="sm" variant="destructive" type="button" onClick={deleteProject} disabled={busy} aria-label="Delete project">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
