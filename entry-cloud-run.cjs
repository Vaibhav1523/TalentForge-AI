/**
 * Cloud Run: load dotenv from Secret Manager file mount (/secrets/.env), then start Next standalone.
 * Secret is mounted by Cloud Run via --set-secrets=/secrets/.env=SECRET_NAME:VERSION
 */
const fs = require("fs");
const { spawn } = require("child_process");
const path = "/secrets/.env";

function parseDotenv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    let s = line.trim();
    if (!s || s.startsWith("#")) continue;
    if (s.startsWith("export ")) s = s.slice(7).trim();
    const i = s.indexOf("=");
    if (i === -1) continue;
    const k = s.slice(0, i).trim();
    if (!k) continue;
    let v = s.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    out[k] = v;
  }
  return out;
}

const env = { ...process.env };
try {
  if (fs.existsSync(path)) {
    const raw = fs.readFileSync(path, "utf8");
    const fromFile = parseDotenv(raw);
    // Cloud Run injects PORT (8080). A copied .env often has PORT=3000 and would break health checks.
    if (process.env.K_SERVICE) {
      delete fromFile.PORT;
      delete fromFile.HOSTNAME;
      delete fromFile.HOST;
    }
    Object.assign(env, fromFile);
  }
} catch (e) {
  console.error("[entry-cloud-run] failed to read secrets file:", e.message);
}

const child = spawn("node", ["server.js"], {
  stdio: "inherit",
  env,
  cwd: "/app",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
