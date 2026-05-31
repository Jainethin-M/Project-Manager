import Link from "next/link";
import { FilePlus2, Shield } from "lucide-react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { ImportBackupButton } from "@/components/import-backup-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjectCards } from "@/services/project-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const projects = await listProjectCards();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin area
          </CardTitle>
          <CardDescription>Project-changing actions are limited to routes under `/admin`.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/projects/new">
              <FilePlus2 className="h-4 w-4" />
              Create project
            </Link>
          </Button>
          <ImportBackupButton />
        </CardContent>
      </Card>

      <DashboardClient initialProjects={projects} />
    </div>
  );
}
