"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export function SecretField({ label, value, className }: { label: string; value: string; className?: string }) {
  const [visible, setVisible] = React.useState(false);
  const displayValue = visible ? value : value ? "•".repeat(Math.min(Math.max(value.length, 8), 24)) : "Not set";

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setVisible((current) => !current)} disabled={!value}>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {visible ? "Hide" : "Show"}
          </Button>
          <CopyButton value={value} label="Copy" disabled={!value} />
        </div>
      </div>
      <code className="block break-all rounded-md bg-background px-3 py-2 text-sm">{displayValue}</code>
    </div>
  );
}
