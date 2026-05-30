import { makeBackup } from "@/services/project-service";

export const runtime = "nodejs";

export async function GET() {
  const backup = await makeBackup();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="devvault-backup-${date}.json"`,
    },
  });
}
