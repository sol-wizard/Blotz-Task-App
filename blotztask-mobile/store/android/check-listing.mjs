// Checks the Play Store listing text in ./metadata against Play's limits and
// metadata policy, before it is published.
//
// Run by the update-play-listing skill on its draft, and by
// .github/workflows/publish-play-listing.yml on every PR and merge that
// touches the listing.
//
//   node check-listing.mjs [metadata dir]
//
// Errors break a hard rule and exit 1. Warnings need a person to judge them
// (a word can be fine in context), so they are printed but do not fail.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const metadataDir = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "metadata");

// The listing is kept in US English, Australian English and Chinese, and each
// needs all three text files.
const REQUIRED_LOCALES = ["en-US", "en-AU", "zh-CN"];

// Play's limits, in characters. A Chinese character counts as one.
const LIMITS = {
  "title.txt": 30,
  "short_description.txt": 80,
  "full_description.txt": 4000,
};

// Ranking, price and promotion words. Play bans them in the title. In the
// descriptions they can be innocent ("free up your head"), so there a warning.
// "第一" alone is left out on purpose: it also means "the first (step)".
const PROMO_WORDS = [
  /\bbest\b/i,
  /#\s*1\b/,
  /\bno\.?\s*1\b/i,
  /\bnumber one\b/i,
  /(?<![\w-])free(?![\w-])/i, // not "clutter-free" or "stress-free"
  /最好/,
  /最佳/,
  /第一名/,
  /排名第一/,
  /免费/,
];

// Words that can read as a medical claim about ADHD. Often fine in context
// ("track your treatment" never is, "healing design" might be), so a warning.
const MEDICAL_WORDS = [
  /\btreat(s|ed|ing|ments?)?\b/i,
  /\bcur(e|es|ed|ing)\b/i,
  /\bdiagnos(e|es|ed|is|ing|tic)\b/i,
  /\btherap(y|ies|ists?|eutic)\b/i,
  /\bclinical(ly)?\b/i,
  /\bsymptoms?\b/i,
  /\bmedicat(ion|ions|ed)\b/i,
  /\bmedicines?\b/i,
  /治疗/,
  /治愈/,
  /诊断/,
  /疗法/,
  /症状/,
  /药物/,
  /临床/,
];

// All-caps words that are acronyms, not shouting.
const ACRONYMS = new Set(["ADHD", "AI"]);

const errors = [];
const warnings = [];

// A plain YouTube video link, which is all Play takes: youtube.com/watch?v=…
// or youtu.be/…, with or without www. or m.
function isYouTubeVideo(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return /^\/[\w-]+$/.test(url.pathname);
  return host === "youtube.com" && url.pathname === "/watch" && url.searchParams.has("v");
}

function read(locale, file) {
  const path = join(metadataDir, locale, file);
  return existsSync(path) ? readFileSync(path, "utf8").trimEnd() : null;
}

function checkLocale(locale) {
  for (const [file, limit] of Object.entries(LIMITS)) {
    const text = read(locale, file);
    const where = `${locale}/${file}`;
    if (text === null || text.trim() === "") {
      errors.push(`${where}: missing or empty`);
      continue;
    }

    const length = Array.from(text).length;
    if (length > limit) errors.push(`${where}: ${length}/${limit} characters`);

    for (const word of PROMO_WORDS) {
      const match = text.match(word);
      if (!match) continue;
      const problem = `${where}: "${match[0]}" is a ranking, price or promotion word`;
      if (file === "title.txt") errors.push(problem);
      else warnings.push(problem);
    }
    for (const word of MEDICAL_WORDS) {
      const match = text.match(word);
      if (match) warnings.push(`${where}: "${match[0]}" may read as a medical claim`);
    }

    // House style from the skill's tone guide, not a Play rule.
    if (file !== "title.txt") {
      if (/\p{Extended_Pictographic}/u.test(text)) warnings.push(`${where}: has emoji, the tone guide says none`);
      if (/<\/?[a-z][^>]*>/i.test(text)) warnings.push(`${where}: has HTML, the tone guide says plain text`);
    }
  }

  const title = read(locale, "title.txt") ?? "";
  if (/\p{Extended_Pictographic}/u.test(title)) {
    errors.push(`${locale}/title.txt: no emoji in the title`);
  }
  for (const word of title.match(/\b[A-Z]{2,}\b/g) ?? []) {
    if (!ACRONYMS.has(word)) errors.push(`${locale}/title.txt: "${word}" is in ALL CAPS`);
  }

  const video = read(locale, "video.txt");
  if (video && !isYouTubeVideo(video)) {
    errors.push(`${locale}/video.txt: must be a YouTube link or empty`);
  }
}

if (!existsSync(metadataDir)) {
  console.error(`No metadata folder at ${metadataDir}`);
  process.exit(1);
}

const locales = readdirSync(metadataDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const locale of REQUIRED_LOCALES) {
  if (!locales.includes(locale)) errors.push(`${locale}: locale folder is missing`);
}
for (const locale of locales) checkLocale(locale);

for (const line of warnings) console.log(`⚠️  ${line}`);
for (const line of errors) console.log(`❌ ${line}`);

if (errors.length > 0) {
  console.log(`\n${errors.length} error(s). Fix them before this can be published.`);
  process.exit(1);
}
console.log(`✅ ${locales.length} locale(s) pass${warnings.length ? `, ${warnings.length} warning(s) to judge` : ""}.`);
