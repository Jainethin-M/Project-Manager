"use client";

import { CopyButton } from "@/components/copy-button";
import { formatCredentialsForClipboard } from "@/services/client-formatters";
import type { Project } from "@/types/project";

export function CredentialCopyButton({ projectId, disabled }: { projectId: string; disabled?: boolean }) {
  async function getCredentials() {
    const response = await fetch(`/api/projects/${projectId}`);
    const result = (await response.json()) as { project?: Project; error?: string };
    if (!response.ok || !result.project) {
      throw new Error(result.error || "Unable to load credentials.");
    }
    return formatCredentialsForClipboard(result.project);
  }

  return <CopyButton getValue={getCredentials} label="Copy Credentials" copiedLabel="Copied" disabled={disabled} />;
}
