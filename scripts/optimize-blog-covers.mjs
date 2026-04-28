// Convert blog cover JPGs to WebP at 2 widths (mobile 640, desktop 1280).
// Idempotent: re-running just overwrites the WebP output, JPGs are kept
// as legacy fallback. Run via:
//   node scripts/optimize-blog-covers.mjs

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const COVERS_DIR = "public/blog-covers";
const SIZES = [
  { width: 640, suffix: "-mobile" },
  { width: 1280, suffix: "-desktop" },
];
const QUALITY = 82;

async function main() {
  const files = await readdir(COVERS_DIR);
  const jpgs = files.filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg"));

  if (jpgs.length === 0) {
    console.log("No JPG files in", COVERS_DIR);
    return;
  }

  for (const file of jpgs) {
    const inputPath = path.join(COVERS_DIR, file);
    const baseName = path.basename(file, path.extname(file));

    for (const size of SIZES) {
      const outputPath = path.join(COVERS_DIR, `${baseName}${size.suffix}.webp`);
      await sharp(inputPath)
        .resize({ width: size.width, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outputPath);
      console.log(`  -> ${outputPath}`);
    }
    console.log(`Done ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
