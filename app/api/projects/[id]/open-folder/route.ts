import { spawn } from "node:child_process";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { getProjectById } from "@/services/project-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function openFolder(folderPath: string) {
  if (process.platform === "darwin") {
    spawn("open", [folderPath], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", folderPath], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [folderPath], { detached: true, stdio: "ignore" }).unref();
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = await getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Prefer development.backend.storagePath, then development.frontend.storagePath, then the legacy location.local
  const backendStorage = project.development?.backend?.storagePath?.trim();
  const frontendStorage = project.development?.frontend?.storagePath?.trim();
  const local = project.location?.local?.trim();

  const candidatePaths = [backendStorage, frontendStorage, local].filter(Boolean) as string[];
  if (candidatePaths.length === 0) {
    return NextResponse.json({ error: "No folder path is saved for this project." }, { status: 400 });
  }

  // Use the first existing path from the preferred list
  const folderPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!folderPath) {
    return NextResponse.json({ error: "None of the saved folder paths exist on this machine." }, { status: 400 });
  }

  openFolder(folderPath);
  return NextResponse.json({ ok: true });
}
