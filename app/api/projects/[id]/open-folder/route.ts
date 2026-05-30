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

  const local = project.location?.local?.trim();
  if (!local) {
    return NextResponse.json({ error: "No local project path is saved for this project." }, { status: 400 });
  }

  if (!fs.existsSync(local)) {
    return NextResponse.json({ error: "The saved local project path does not exist on this machine." }, { status: 400 });
  }

  openFolder(local);
  return NextResponse.json({ ok: true });
}
