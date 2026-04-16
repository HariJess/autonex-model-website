import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict") || process.env.SEO_STRICT === "1" || process.env.CI === "true";
const envModeArg = process.argv.find((x) => x.startsWith("--env="));
const envModeRaw = (envModeArg ? envModeArg.split("=")[1] : process.env.SEO_VERIFY_ENV || "").toLowerCase().trim();

function resolveMode() {
  if (envModeRaw === "production" || envModeRaw === "prod") return "production";
  if (envModeRaw === "staging" || envModeRaw === "preview") return "staging";
  if (envModeRaw === "local" || envModeRaw === "dev") return "local";
  if (strict) return process.env.CI === "true" ? "production" : "staging";
  return "local";
}

const mode = resolveMode();

const REQUIRED_ENV_FOR_INVENTORY = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const OPTIONAL_CONTEXT_ENV = ["SITE_URL", "SEO_VERIFY_ENV", "SEO_STRICT", "CI"];

const MODE_POLICY = {
  local: {
    enforceInventoryPreflight: false,
    allowWarnOnly: true,
  },
  staging: {
    enforceInventoryPreflight: true,
    allowWarnOnly: false,
  },
  production: {
    enforceInventoryPreflight: true,
    allowWarnOnly: false,
  },
};

function boolFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes"].includes(raw.toLowerCase());
}

function nowIso() {
  return new Date().toISOString();
}

async function writeAuditReport(report) {
  const outPath = path.resolve(root, "artifacts", "seo-preflight-report.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  return outPath;
}

function printStatus(level, msg) {
  const icon = level === "pass" ? "✅" : level === "warn" ? "⚠️" : "❌";
  const fn = level === "fail" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`${icon} ${msg}`);
}

async function main() {
  const modePolicy = MODE_POLICY[mode];
  const enforceInventoryPreflight = boolFromEnv(
    "SEO_ENFORCE_INVENTORY_PREFLIGHT",
    modePolicy.enforceInventoryPreflight,
  );

  const checks = [];
  const addCheck = (check) => checks.push(check);

  const requiredEnv = REQUIRED_ENV_FOR_INVENTORY.map((key) => ({
    key,
    present: String(process.env[key] || "").trim().length > 0,
  }));
  const missingRequiredEnv = requiredEnv.filter((x) => !x.present).map((x) => x.key);

  const modeAllowed = ["local", "staging", "production"].includes(mode);
  addCheck({
    id: "MODE_VALID",
    level: modeAllowed ? "pass" : "fail",
    message: modeAllowed ? `Mode '${mode}' is valid.` : `Mode '${mode}' is invalid.`,
  });

  if (enforceInventoryPreflight) {
    addCheck({
      id: "INVENTORY_ENV_REQUIRED",
      level: missingRequiredEnv.length === 0 ? "pass" : "fail",
      message:
        missingRequiredEnv.length === 0
          ? "All required inventory SEO env vars are present."
          : `Missing required inventory SEO env vars: ${missingRequiredEnv.join(", ")}`,
      details: {
        required: REQUIRED_ENV_FOR_INVENTORY,
        missing: missingRequiredEnv,
      },
    });
  } else {
    addCheck({
      id: "INVENTORY_ENV_RELAXED",
      level: missingRequiredEnv.length === 0 ? "pass" : "warn",
      message:
        missingRequiredEnv.length === 0
          ? "Inventory SEO env vars are present (relaxed mode)."
          : `Inventory SEO env vars missing but allowed in relaxed mode: ${missingRequiredEnv.join(", ")}`,
      details: {
        required: REQUIRED_ENV_FOR_INVENTORY,
        missing: missingRequiredEnv,
      },
    });
  }

  const baseScripts = ["build", "prebuild", "postbuild", "seo:verify"];
  const missingScripts = [];
  try {
    const pkgRaw = await fs.readFile(path.resolve(root, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    const scripts = pkg?.scripts || {};
    for (const key of baseScripts) {
      if (!scripts[key]) missingScripts.push(key);
    }
  } catch {
    missingScripts.push(...baseScripts);
  }
  addCheck({
    id: "SCRIPTS_BASELINE",
    level: missingScripts.length === 0 ? "pass" : "fail",
    message:
      missingScripts.length === 0
        ? "Required build/SEO scripts exist in package.json."
        : `Missing required scripts in package.json: ${missingScripts.join(", ")}`,
    details: { requiredScripts: baseScripts, missingScripts },
  });

  const failures = checks.filter((c) => c.level === "fail");
  const warnings = checks.filter((c) => c.level === "warn");

  const effectiveFail = failures.length > 0 || (strict && !modePolicy.allowWarnOnly && warnings.length > 0);
  const finalResult = effectiveFail ? "fail" : warnings.length > 0 ? "warn" : "pass";

  const report = {
    generatedAt: nowIso(),
    script: "scripts/seo/preflight-seo.mjs",
    result: finalResult,
    strict,
    mode,
    policy: {
      enforceInventoryPreflight,
      allowWarnOnly: modePolicy.allowWarnOnly,
    },
    requiredEnvForInventory: REQUIRED_ENV_FOR_INVENTORY,
    envPresence: {
      required: requiredEnv,
      context: OPTIONAL_CONTEXT_ENV.map((key) => ({
        key,
        value: process.env[key] ?? null,
      })),
    },
    checks,
  };

  const reportPath = await writeAuditReport(report);

  console.log(`[seo:preflight] mode=${mode} strict=${strict ? "1" : "0"}`);
  for (const check of checks) {
    printStatus(check.level, `${check.id}: ${check.message}`);
  }
  console.log(`[seo:preflight] report=${path.relative(root, reportPath)}`);

  if (effectiveFail) {
    console.error("❌ SEO preflight failed. Fix the checks above before running release build.");
    process.exitCode = 1;
    return;
  }

  if (warnings.length > 0) {
    console.warn("⚠️ SEO preflight completed with warnings.");
  } else {
    console.log("✅ SEO preflight passed.");
  }
}

main().catch((err) => {
  console.error(`❌ Unexpected preflight error: ${err?.message || String(err)}`);
  process.exitCode = 1;
});

