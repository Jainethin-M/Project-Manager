import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { restoreBackup } from "@/services/project-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }
    const payload = (await request.json()) as unknown;
    const result = await restoreBackup(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import backup." },
      { status: 400 },
    );
  }
}
