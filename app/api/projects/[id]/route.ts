import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { deleteProject, getProjectById, updateProject } from "@/services/project-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = await getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    if (!(await hasAdminSession())) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }
    const { id } = await context.params;
    const payload = (await request.json()) as unknown;
    const project = await updateProject(id, payload);
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update project." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { id } = await context.params;
  const deleted = await deleteProject(id);
  if (!deleted) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
