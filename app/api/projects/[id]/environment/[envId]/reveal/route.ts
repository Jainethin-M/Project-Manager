import { NextResponse } from "next/server";
import { isValidRevealPassword, revealEnvironmentValue } from "@/services/project-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; envId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id, envId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidRevealPassword(password)) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const value = await revealEnvironmentValue(id, envId, password);
    return NextResponse.json({ value });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reveal value." }, { status: 400 });
  }
}
