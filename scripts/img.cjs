/* ultra-simple image converter */
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const sharp = require("sharp");

const inRoot = "src/images";
const outRoot = "dist/images";

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

function shouldProcess(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  return [".png", ".jpg", ".jpeg"].includes(ext);
}

async function convertOne(absPath) {
  const rel = path.relative(inRoot, absPath);
  if (!shouldProcess(rel)) return;

  const outDir = path.join(outRoot, path.dirname(rel));
  await ensureDir(outDir);

  const base = path.basename(rel, path.extname(rel));

  // Fallback
  const fallback = path.join(outDir, `${base}.png`);
  await sharp(absPath).png().toFile(fallback);

  // WebP
  const webp = path.join(outDir, `${base}.webp`);
  await sharp(absPath).webp({ quality: 80 }).toFile(webp);

  // AVIF
  const avif = path.join(outDir, `${base}.avif`);
  await sharp(absPath).avif({ quality: 50 }).toFile(avif);

  console.log("[img] converted:", rel);
}

async function build() {
  const files = getFiles(inRoot);
  for (const f of files) {
    await convertOne(f);
  }
}

function getFiles(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const st = fs.statSync(p);
    if (st.isDirectory()) res = res.concat(getFiles(p));
    else res.push(p);
  }
  return res;
}

build();