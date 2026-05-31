import Link from "next/link";
import { Shield } from "lucide-react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Button } from "@/components/ui/button";
import { listProjectCards } from "@/services/project-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await listProjectCards();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Local-first project memory</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your personal developer control center.</h1>
          <p className="text-muted-foreground">
            Keep local URLs, ports, storage paths, deployment notes, service metadata, links, and project notes in one self-hosted MongoDB vault.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin">
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        </Button>
      </section>
      <DashboardClient initialProjects={projects} />
    </div>
  );
}
