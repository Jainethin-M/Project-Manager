import { NextResponse } from "next/server";
import { listProjectCardsByPort } from "@/services/project-service";
import { execSync } from "node:child_process";

export const runtime = "nodejs";

function parseNetstatWindowsOutput(output: string) {
  const lines = output.split(/\r?\n/);
  const listening: Record<number, number> = {};
  for (const line of lines) {
    // Example:  TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       1234
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5) continue;
    const state = cols[3] || cols[4] || "";
    if (!/LISTENING/i.test(line)) continue;
    const local = cols[1];
    const pid = parseInt(cols[cols.length - 1], 10);
    const portMatch = local.match(/:(\d+)$/);
    if (portMatch && !Number.isNaN(pid)) {
      const port = parseInt(portMatch[1], 10);
      listening[port] = pid;
    }
  }
  return listening;
}

function getProcessNameByPidWindows(pid: number) {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: "utf8" });
    // CSV: "Image Name","PID","Session Name","Session#","Mem Usage"
    const cols = out.split(/\r?\n/)[0];
    if (!cols) return undefined;
    const match = cols.match(/^"([^"]+)","?(\d+)"?,/);
    if (match) return match[1];
    return undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const port = url.searchParams.get("port") || undefined;
    const suggest = url.searchParams.get("suggest") === "true";
    const area = (url.searchParams.get("area") || "").toLowerCase();

    if (suggest) {
      // Determine candidate ranges
      let start = 40000;
      if (area === "backend") start = 50000;
      const range = Array.from({ length: 300 }, (_, i) => start + i); // start..start+299

      // On Windows, use netstat to find listening ports and PIDs
      let listening: Record<number, number> = {};
      if (process.platform === "win32") {
        try {
          const netstat = execSync("netstat -ano -p tcp", { encoding: "utf8" });
          listening = parseNetstatWindowsOutput(netstat);
        } catch {
          listening = {};
        }
      }

      const suggestions: Array<Record<string, any>> = [];
      for (const p of range) {
        const usedPid = listening[p];
        const projects = await listProjectCardsByPort(String(p));
        const takenByProject = projects.length > 0 ? { id: projects[0].id, name: projects[0].name } : undefined;
        let takenByProcess: string | undefined = undefined;
        if (usedPid) {
          takenByProcess = process.platform === "win32" ? getProcessNameByPidWindows(usedPid) : undefined;
        }

        suggestions.push({ port: p, available: !usedPid && !takenByProject, takenByProcess, takenByProject });
        if (suggestions.length >= 50) break;
      }

      return NextResponse.json({ suggestions });
    }

    if (!port) return NextResponse.json({ projects: [] });

    // single-port check: return projects + process info (if available)
    const projects = await listProjectCardsByPort(port);
    const portNum = parseInt(port, 10);
    let listening: Record<number, number> = {};
    if (process.platform === "win32") {
      try {
        const netstat = execSync("netstat -ano -p tcp", { encoding: "utf8" });
        listening = parseNetstatWindowsOutput(netstat);
      } catch {
        listening = {};
      }
    }

    const pid = listening[portNum];
    const processName = pid && process.platform === "win32" ? getProcessNameByPidWindows(pid) : undefined;
    const takenByProject = projects.length > 0 ? { id: projects[0].id, name: projects[0].name } : undefined;
    const available = !pid && !takenByProject;

    return NextResponse.json({ projects, available, takenByProcess: processName, takenByPid: pid, takenByProject });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search by port." }, { status: 500 });
  }
}
