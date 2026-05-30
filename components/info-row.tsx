import { ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { compactText, isLikelyUrl, safeHref } from "@/lib/utils";

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const hasUrl = isLikelyUrl(value);

  return (
    <div className="rounded-lg border bg-muted/35 p-3 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm">{compactText(value)}</p>
      {hasUrl && value ? (
        <div className="mt-2 flex gap-2">
          <CopyButton value={safeHref(value)} label="Copy Link" />
          <Button asChild variant="outline" size="sm">
            <a href={safeHref(value)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
