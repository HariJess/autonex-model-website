// Generate responsive hero variants from the three master PNGs in
// public/hero-source/. Outputs WebP at quality 80 (modern browsers) and a
// JPEG fallback at quality 75 with mozjpeg (Safari < 14, ancient mobile).
//
// Sizes per variant cover 1x / retina:
//   mobile  -> 640, 1080, 1440  (iPhone SE up to Pro Max @2x)
//   tablet  -> 1024, 2048       (iPad up to @2x)
//   desktop -> 1280, 1920, 2560 (HD up to 4K @2x)
//
// Idempotent: re-running just overwrites the outputs. Run via:
//   npm run optimize:hero

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SOURCE = "public/hero-source";
const DEST = "public/hero";

const VARIANTS = {
  mobile: { sizes: [640, 1080, 1440], source: "hero-mobile.png" },
  tablet: { sizes: [1024, 2048], source: "hero-tablet.png" },
  desktop: { sizes: [1280, 1920, 2560], source: "hero-desktop.png" },
};

async function main() {
  if (!existsSync(DEST)) await mkdir(DEST, { recursive: true });

  let any = false;
  for (const [variant, { sizes, source }] of Object.entries(VARIANTS)) {
    const sourcePath = path.join(SOURCE, source);
    if (!existsSync(sourcePath)) {
      console.warn(`[hero] Missing source: ${sourcePath} — skipping ${variant}`);
      continue;
    }
    any = true;

    for (const size of sizes) {
      const baseOut = path.join(DEST, `hero-${variant}-${size}`);

      await sharp(sourcePath)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 80, effort: 6 })
        .toFile(`${baseOut}.webp`);

      await sharp(sourcePath)
        .resize({ width: size, withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toFile(`${baseOut}.jpg`);

      console.log(`[hero] ${variant} ${size}px -> webp + jpg`);
    }
  }

  if (!any) {
    console.warn(
      `[hero] No source PNGs found in ${SOURCE}/. Drop hero-mobile.png, ` +
        `hero-tablet.png, hero-desktop.png there and re-run.`,
    );
    process.exit(0);
  }
  console.log("[hero] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
