/**
 * Builds:
 * - public/brand/favicon-light.png (64px) — tab icon for light theme (see ThemeFavicon)
 * - public/favicon.png (48px) — stable square icon for Google Search + default link rel=icon
 *
 * Re-run after changing public/brand/logo.png: npm run icons:favicon-light
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const input = join(root, "public", "brand", "logo.png");
const output = join(root, "public", "brand", "favicon-light.png");
const outputSearch = join(root, "public", "favicon.png");

const contrast = 1.1;
const offset = Math.round(255 * (0.5 - 0.5 * contrast));

async function tunedPng(size, dest) {
  await sharp(input)
    .resize(128, 128, { fit: "inside", withoutEnlargement: true })
    .modulate({ brightness: 0.5, saturation: 1.6 })
    .linear(contrast, offset)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
}

await tunedPng(64, output);
await tunedPng(48, outputSearch);

console.log("Wrote", output);
console.log("Wrote", outputSearch);
