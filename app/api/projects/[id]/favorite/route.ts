import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { updateProjectFavorite } from "@/services/project-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { favorite?: boolean };
    const project = await updateProjectFavorite(id, Boolean(body.favorite));
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update favorite." },
      { status: 400 },
    );
  }
}
