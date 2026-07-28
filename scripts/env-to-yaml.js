#!/usr/bin/env node
/**
 * Convert one .env file to YAML for: gcloud run services update --env-vars-file
 * Skips PORT (reserved by Cloud Run).
 *
 * Usage: node scripts/env-to-yaml.js [path]
 *   Default path: .env.production (relative to frontend/)
 */
const fs = require('fs');
const path = require('path');

const RESERVED = ['PORT'];

function escapeYamlValue(s) {
  if (s === null || s === undefined) return '""';
  const str = String(s).trim();
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const rest = trimmed.replace(/^export\s+/, '').trim();
    const eq = rest.indexOf('=');
    if (eq === -1) continue;
    const key = rest.slice(0, eq).trim();
    let value = rest.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    if (!key || RESERVED.includes(key)) continue;
    out[key] = value;
  }
  return out;
}

function main() {
  const baseDir = path.join(__dirname, '..');
  const arg = process.argv[2];
  const envPath = arg
    ? path.isAbsolute(arg)
      ? arg
      : path.join(baseDir, arg)
    : path.join(baseDir, '.env.production');

  if (!fs.existsSync(envPath)) {
    process.stderr.write(`Error: env file not found: ${envPath}\n`);
    process.exit(1);
  }
  let content;
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    process.stderr.write(`Error reading env file: ${err.message}\n`);
    process.exit(1);
  }

  const merged = parseEnvFile(content);
  const lines = Object.entries(merged).map(([key, value]) => `${key}: ${escapeYamlValue(value)}`);
  process.stdout.write(lines.join('\n') + '\n');
}

main();
