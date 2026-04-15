import fs from "node:fs";
import path from "node:path";

function parseEnvFile(content) {
  const output = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    output[key] = value;
  });
  return output;
}

export function loadLocalEnv() {
  const cwd = process.cwd();
  const files = [".env.local", ".env"];
  files.forEach((name) => {
    const full = path.join(cwd, name);
    if (!fs.existsSync(full)) return;
    const parsed = parseEnvFile(fs.readFileSync(full, "utf8"));
    Object.entries(parsed).forEach(([key, value]) => {
      if (!process.env[key]) process.env[key] = value;
    });
  });
}
