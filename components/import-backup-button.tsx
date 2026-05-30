"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ImportBackupButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<string>("");
  const [isImporting, setIsImporting] = React.useState(false);

  async function importBackup() {
    if (!file) {
      setStatus("Choose a JSON backup first.");
      return;
    }

    const confirmed = window.confirm("Importing a backup replaces all current DevVault projects. Continue?");
    if (!confirmed) return;

    setIsImporting(true);
    setStatus("");

    try {
      const json = JSON.parse(await file.text()) as unknown;
      const response = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(json),
      });
      const result = (await response.json()) as { importedProjects?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Import failed.");
      setStatus(`Imported ${result.importedProjects ?? 0} project(s).`);
      router.refresh();
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import JSON backup</DialogTitle>
          <DialogDescription>
            Restore a DevVault backup from a local JSON file. This replaces every project currently saved in the local database.
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept="application/json,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={importBackup} disabled={isImporting}>
            {isImporting ? "Importing..." : "Import backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
