import type { ReactNode } from "react";
import Link from "next/link";
import { Download, Plus, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportBackupButton } from "@/components/import-backup-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/55 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-cyan-400/35 via-sky-500/20 to-emerald-300/25 shadow-lg shadow-cyan-500/15">
              <Vault className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">DevVault</span>
              <span className="block text-xs text-muted-foreground">Self-hosted developer control center</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/backup/export">
                <Download className="h-4 w-4" />
                Export
              </a>
            </Button>
            <ImportBackupButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </TooltipProvider>
  );
}
