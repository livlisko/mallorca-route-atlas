#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pdfSignature = String.fromCharCode(37, 80, 68, 70, 45);
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".tif", ".tiff"]);
const approvedImageFiles = new Set([
  "public/assets/hero/mallorca-tramuntana-dreamscape-mobile.webp",
  "public/assets/hero/mallorca-tramuntana-dreamscape.webp",
  "public/assets/mallorca-topographic-map.png",
  "public/assets/routes/stage-1-map.jpg",
  "public/assets/routes/stage-1-profile.png",
  "public/assets/routes/stage-2-map.jpg",
  "public/assets/routes/stage-2-profile.png",
  "public/assets/routes/stage-3-map.jpg",
  "public/assets/routes/stage-3-profile.png",
  "public/assets/routes/stage-4-map.jpg",
  "public/assets/routes/stage-4-profile.png",
  "public/assets/routes/stage-5-map.jpg",
  "public/assets/routes/stage-5-profile.png",
  "public/assets/routes/stage-6-map.jpg",
  "public/assets/routes/stage-6-profile.png",
  "reference/selected-concept-2.png",
]);

const defaultContentChecks = [
  { label: "local personal file path", pattern: /\/Users\/[^\s"']+\/(?:Downloads|Desktop)\//i },
  { label: "email address", pattern: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i },
  { label: "booking reference in plaintext", pattern: /booking\s+reference\s*[:#-]?\s*[A-Z0-9]{6,}/i },
  { label: "numeric confirmation in plaintext", pattern: /confirmation\s*(?:number|#)?\s*[:#-]?\s*\d{8,}/i },
  { label: "ticket number in plaintext", pattern: /e-?ticket\s*[:#-]?\s*\d{10,}/i },
  { label: "embedded document", pattern: new RegExp(pdfSignature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) },
];

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function readDenylist(denylistPath) {
  if (!denylistPath) return [];
  const resolved = path.resolve(denylistPath);
  const relative = path.relative(root, resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("The private denylist must live outside the repository.");
  }
  return readFileSync(resolved, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 4)
    .map((value, index) => ({ label: `private denylist item ${index + 1}`, value }));
}

function normalizeImagePath(entryPath) {
  const historyMatch = entryPath.match(/^history:(.+)@[0-9a-f]{10}$/);
  const worktreePath = historyMatch ? historyMatch[1] : entryPath;
  return worktreePath.startsWith("dist/client/")
    ? `public/${worktreePath.slice("dist/client/".length)}`
    : worktreePath;
}

export function scanEntries(entries, denylist = []) {
  const hits = [];
  for (const entry of entries) {
    const approvalPath = normalizeImagePath(entry.path);
    const lowerPath = approvalPath.toLowerCase();
    if (lowerPath.endsWith(".pdf") || lowerPath.endsWith(".eml")) {
      hits.push({ path: entry.path, label: "private source-document path" });
    }
    if (
      imageExtensions.has(path.extname(approvalPath.toLowerCase())) &&
      !approvedImageFiles.has(approvalPath)
    ) {
      hits.push({ path: entry.path, label: "image outside the approved public-asset list" });
    }
    if (/(?:confirmation|booking|reservation|flight|rental).+\.(?:png|jpe?g|webp|gif|avif|tiff?)$/i.test(approvalPath)) {
      hits.push({ path: entry.path, label: "confirmation-like image path" });
    }

    const buffer = Buffer.isBuffer(entry.contents) ? entry.contents : Buffer.from(entry.contents);
    const text = buffer.toString("utf8");
    for (const check of defaultContentChecks) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(text)) hits.push({ path: entry.path, label: check.label });
    }
    for (const check of denylist) {
      if (
        lowerPath.includes(check.value.toLowerCase()) ||
        buffer.includes(Buffer.from(check.value, "utf8")) ||
        text.toLowerCase().includes(check.value.toLowerCase())
      ) {
        hits.push({ path: entry.path, label: check.label });
      }
    }
  }
  return hits;
}

function trackedEntries() {
  const output = execFileSync("git", ["ls-files", "-c", "-o", "--exclude-standard", "-z"], { cwd: root });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((relativePath) => ({ path: relativePath, contents: readFileSync(path.join(root, relativePath)) }));
}

function historyEntries() {
  const listed = execFileSync("git", ["rev-list", "--objects", "--all"], { cwd: root, encoding: "utf8" });
  const seen = new Set();
  const entries = [];
  for (const line of listed.split("\n")) {
    if (!line) continue;
    const separator = line.indexOf(" ");
    const objectId = separator === -1 ? line : line.slice(0, separator);
    const objectPath = separator === -1 ? `(git object ${objectId.slice(0, 10)})` : line.slice(separator + 1);
    if (seen.has(objectId)) continue;
    seen.add(objectId);
    const type = execFileSync("git", ["cat-file", "-t", objectId], { cwd: root, encoding: "utf8" }).trim();
    if (type !== "blob") continue;
    const size = Number(execFileSync("git", ["cat-file", "-s", objectId], { cwd: root, encoding: "utf8" }).trim());
    if (!Number.isFinite(size) || size > 25 * 1024 * 1024) continue;
    const contents = execFileSync("git", ["cat-file", "-p", objectId], {
      cwd: root,
      encoding: null,
      maxBuffer: 30 * 1024 * 1024,
    });
    entries.push({ path: `history:${objectPath}@${objectId.slice(0, 10)}`, contents });
  }
  return entries;
}

function distEntries() {
  const directory = path.join(root, "dist", "client");
  return walkFiles(directory).map((absolute) => ({
    path: path.relative(root, absolute),
    contents: readFileSync(absolute),
  }));
}

function assertFreshDist() {
  const builtIndex = path.join(root, "dist", "client", "index.html");
  if (!existsSync(builtIndex)) {
    throw new Error("A production build is required before the release scan.");
  }
  const worktreeFiles = execFileSync("git", ["ls-files", "-c", "-o", "--exclude-standard", "-z"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((relativePath) => path.join(root, relativePath))
    .filter((absolutePath) => existsSync(absolutePath));
  const newestWorktreeMtime = Math.max(...worktreeFiles.map((absolutePath) => statSync(absolutePath).mtimeMs));
  if (statSync(builtIndex).mtimeMs < newestWorktreeMtime) {
    throw new Error("The production build is stale. Rebuild before the release scan.");
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--require-denylist") && !process.env.PRIVATE_ITINERARY_DENYLIST) {
    throw new Error("PRIVATE_ITINERARY_DENYLIST is required for a release scan.");
  }
  const denylist = readDenylist(process.env.PRIVATE_ITINERARY_DENYLIST);
  if (args.has("--require-denylist") && denylist.length === 0) {
    throw new Error("The private denylist must contain at least one value.");
  }
  if (args.has("--require-denylist")) assertFreshDist();
  const entries = [];
  if (args.has("--tracked") || args.size === 0) entries.push(...trackedEntries());
  if (args.has("--history")) entries.push(...historyEntries());
  if (args.has("--dist")) entries.push(...distEntries());
  const hits = scanEntries(entries, denylist);

  const sourceMaps = args.has("--dist")
    ? entries.filter((entry) => entry.path.endsWith(".map")).map((entry) => ({ path: entry.path, label: "source map" }))
    : [];
  hits.push(...sourceMaps);

  if (hits.length > 0) {
    process.stderr.write("Private-boundary scan failed:\n");
    for (const hit of hits) process.stderr.write(`- ${hit.path}: ${hit.label}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Private-boundary scan passed (${entries.length} files and blobs checked).\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
