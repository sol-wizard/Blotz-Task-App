/**
 * Resize and compress oversized app images for PBI #1675.
 *
 * Run from blotztask-mobile/:
 *   npm run optimize-images
 *
 * Full-size design originals stay outside this repo. Re-running is safe:
 * images already at or under the target edge are not upscaled; JPEG
 * outputs are rewritten from the matching PNG source when it still exists.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PNG_DIR = path.resolve(__dirname, "../assets/images-png");

const JOBS = [
  { file: "green-house.png", maxEdge: 120, format: "png" },
  { file: "notes.png", maxEdge: 120, format: "png" },
  { file: "setting-icon.png", maxEdge: 120, format: "png" },
  { file: "yellow-star.png", maxEdge: 180, format: "png" },
  { file: "green-star.png", maxEdge: 180, format: "png" },
  { file: "purple-star.png", maxEdge: 180, format: "png" },
  { file: "blue-star.png", maxEdge: 180, format: "png" },
  { file: "rainbow-star.png", maxEdge: 180, format: "png" },
  { file: "gashapon-machine-button.png", maxEdge: 255, format: "png" },
  { file: "gashapon-machine-without-button.png", format: "png" },
  { file: "pomodoro-img-streamWhisper.png", maxEdge: 1254, format: "jpeg", out: "pomodoro-img-streamWhisper.jpg" },
  { file: "pomodoro-img-pineFocus.png", maxEdge: 1254, format: "jpeg", out: "pomodoro-img-pineFocus.jpg" },
  { file: "pomodoro-img-nightGlow.png", maxEdge: 1254, format: "jpeg", out: "pomodoro-img-nightGlow.jpg" },
  { file: "pomodoro-img-silentMind.png", maxEdge: 1254, format: "jpeg", out: "pomodoro-img-silentMind.jpg" },
  { file: "pomodoro-img-cafeNook.png", maxEdge: 1254, format: "jpeg", out: "pomodoro-img-cafeNook.jpg" },
  { file: "onboarding-notes.png", maxEdge: 1152, format: "png" },
  { file: "onboarding-voice.png", maxEdge: 1152, format: "png" },
];

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function processJob(job) {
  const srcPath = path.join(PNG_DIR, job.file);
  if (!fs.existsSync(srcPath)) {
    console.warn(`skip missing: ${job.file}`);
    return;
  }

  const outName = job.out ?? job.file;
  const outPath = path.join(PNG_DIR, outName);
  const before = fs.statSync(srcPath).size;

  const meta = await sharp(srcPath, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  let pipeline = sharp(srcPath, { failOn: "none" });

  if (job.maxEdge && (width > job.maxEdge || height > job.maxEdge)) {
    pipeline = pipeline.resize({
      width: job.maxEdge,
      height: job.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (job.format === "jpeg") {
    const tmpPath = `${outPath}.tmp.jpg`;
    await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(tmpPath);
    fs.renameSync(tmpPath, outPath);
    if (outPath !== srcPath && fs.existsSync(srcPath)) {
      fs.unlinkSync(srcPath);
    }
  } else {
    const tmpPath = `${outPath}.tmp.png`;
    await pipeline
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 80,
        effort: 7,
      })
      .toFile(tmpPath);
    fs.renameSync(tmpPath, outPath);
  }

  const after = fs.statSync(outPath).size;
  const outMeta = await sharp(outPath).metadata();
  console.log(
    `${job.file} -> ${outName}: ${width}x${height} ${formatKb(before)} -> ${outMeta.width}x${outMeta.height} ${formatKb(after)}`,
  );
}

async function main() {
  if (!fs.existsSync(PNG_DIR)) {
    throw new Error(`Missing images folder: ${PNG_DIR}`);
  }

  console.log(`Optimising images in ${PNG_DIR}`);
  for (const job of JOBS) {
    await processJob(job);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});