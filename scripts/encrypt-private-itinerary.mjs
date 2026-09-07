#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encryptPrivateItinerary, validatePrivateItinerary } from "../src/privateItineraryCrypto.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutput = path.join(root, "public", "assets", "private", "payload.v1.json");

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run this command in an interactive terminal so the private code can stay hidden.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;
    const finish = (error) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Encryption cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else value += character;
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function main() {
  const inputArgument = process.argv[2];
  const outputArgument = process.argv[3];
  if (!inputArgument) {
    throw new Error("Usage: npm run encrypt:itinerary -- /absolute/path/to/itinerary.private.json");
  }

  const inputPath = path.resolve(inputArgument);
  const outputPath = outputArgument ? path.resolve(outputArgument) : defaultOutput;
  const relativeInput = path.relative(root, inputPath);
  if (relativeInput === "" || (!relativeInput.startsWith("..") && !path.isAbsolute(relativeInput))) {
    throw new Error("The readable input must live outside this public repository.");
  }

  const sourceBuffer = readFileSync(inputPath);
  let payload;
  try {
    payload = JSON.parse(sourceBuffer.toString("utf8"));
    validatePrivateItinerary(payload);
  } finally {
    sourceBuffer.fill(0);
  }

  let privateCode = await readHidden("Private code (20+ characters): ");
  let confirmation = await readHidden("Repeat private code: ");
  if (privateCode !== confirmation) throw new Error("The private codes did not match.");
  if (privateCode.trim().length < 20) throw new Error("Use a private code with at least 20 characters.");

  try {
    const envelope = await encryptPrivateItinerary(payload, privateCode);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o644 });
    process.stdout.write(`Encrypted private itinerary written to ${path.relative(root, outputPath)}.\n`);
  } finally {
    privateCode = "";
    confirmation = "";
    payload = null;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
