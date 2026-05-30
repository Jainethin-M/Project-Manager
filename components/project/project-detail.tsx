"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, ExternalLink, FolderOpen, ListChecks, StickyNote, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { InfoRow } from "@/components/info-row";
import { ProjectForm } from "@/components/project/project-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCredentialsForClipboard } from "@/services/client-formatters";
import { formatDateTime, safeHref } from "@/lib/utils";
import type { Project } from "@/types/project";

function SectionEmpty({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No {label} saved for this project.</p>;
}

export function ProjectDetail({ project }: { project: Project }) {
  const router = useRouter();
  const [message, setMessage] = React.useState("");
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});
  const [busyEnvId, setBusyEnvId] = React.useState<string | null>(null);

  async function openFolder() {
    setMessage("");
    const response = await fetch(`/api/projects/${project.id}/open-folder`, { method: "POST" });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setMessage(result.error || "Unable to open folder.");
    }
  }

  async function deleteProject() {
    const confirmed = window.confirm(`Delete "${project.name}" from DevVault?`);
    if (!confirmed) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    const result = (await response.json()) as { error?: string };
    setMessage(result.error || "Unable to delete project.");
  }

  return <ProjectForm project={project} viewOnly />;
}
