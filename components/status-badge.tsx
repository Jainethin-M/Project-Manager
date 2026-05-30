import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/types/project";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const variant = status === "active" ? "success" : status === "paused" ? "warning" : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
