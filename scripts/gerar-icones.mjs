// Gera os ícones PNG do PWA a partir de um SVG. Rode com: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const svg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f9d6b"/>
  <rect x="24" y="54" width="12" height="22" rx="3" fill="#fff" opacity=".7"/>
  <rect x="44" y="40" width="12" height="36" rx="3" fill="#fff" opacity=".85"/>
  <rect x="64" y="26" width="12" height="50" rx="3" fill="#fff"/>
</svg>`);

for (const [file, size] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
]) {
  await writeFile(file, await sharp(svg(size)).png().toBuffer());
  console.log(file);
}
