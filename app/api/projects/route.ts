import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createProject, listProjectCards } from "@/services/project-service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: await listProjectCards() });
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }
    const payload = (await request.json()) as unknown;
    const project = await createProject(payload);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create project." },
      { status: 400 },
    );
  }
}
