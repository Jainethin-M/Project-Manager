const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function readEnvPort() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return "";
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (key?.trim() === "PORT") {
      return rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}

const mode = process.argv[2] === "start" ? "start" : "dev";
const port = readEnvPort() || process.env.PORT || "3000";
const nextBinPath = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const useNpx = !fs.existsSync(nextBinPath);
const spawnCmd = useNpx ? "npx" : nextBinPath;
const spawnArgs = useNpx ? ["next", mode, "--port", port] : [mode, "--port", port];
const shellNeeded = process.platform === "win32" || useNpx;
let child;
if (shellNeeded) {
  const escape = (s) => String(s).replace(/"/g, '\\"');
  const cmdStr = useNpx
    ? `npx next ${mode} --port ${port}`
    : `"${spawnCmd.replace(/"/g, '\\"')}" ${spawnArgs.map((a) => {
        return /\s/.test(a) ? `"${escape(a)}"` : escape(a);
      }).join(" ")}`;
  child = spawn(cmdStr, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT: port },
  });
} else {
  child = spawn(spawnCmd, spawnArgs, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, PORT: port },
  });
}

child.on("error", (err) => {
  console.error("Failed to start Next.js:", err && err.message ? err.message : err);
  if (useNpx) {
    console.error("Tried using 'npx next' but it failed. Ensure Node.js and npm are installed.");
  } else {
    console.error("Next binary not found at", nextBinPath, "— run 'npm install' to install dependencies.");
  }
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
