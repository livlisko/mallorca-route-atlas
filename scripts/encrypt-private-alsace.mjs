#!/usr/bin/env node
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  encryptPrivateAlsace,
  MIN_ALSACE_CODE_LENGTH,
  validatePrivateAlsace,
} from "../src/alsaceCrypto.js";

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const defaultOutput = path.join(root, "public", "assets", "private", "alsace.v1.json");

function isInsideRoot(candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run this command in an interactive terminal so the private guide code can stay hidden.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;
    const previousRawMode = input.isRaw;

    const finish = (error) => {
      input.off("data", onData);
      input.setRawMode(Boolean(previousRawMode));
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

function writeAtomically(outputPath, contents) {
  const directory = path.dirname(outputPath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(outputPath)}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, outputPath);
    chmodSync(outputPath, 0o644);
  } finally {
    try {
      unlinkSync(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function main() {
  const inputArgument = process.argv[2];
  const outputArgument = process.argv[3];
  if (!inputArgument) {
    throw new Error("Usage: npm run encrypt:alsace -- /absolute/path/to/alsace.private.json");
  }

  const inputPath = realpathSync(path.resolve(inputArgument));
  if (isInsideRoot(inputPath)) {
    throw new Error("The readable input must live outside this public repository.");
  }

  const outputPath = outputArgument ? path.resolve(outputArgument) : defaultOutput;
  if (inputPath === outputPath) throw new Error("The encrypted output must not overwrite the readable input.");

  const sourceBuffer = readFileSync(inputPath);
  let payload;
  try {
    payload = JSON.parse(sourceBuffer.toString("utf8"));
    validatePrivateAlsace(payload);
  } finally {
    sourceBuffer.fill(0);
  }

  let privateCode = "";
  let confirmation = "";
  try {
    privateCode = await readHidden(`Private guide code (${MIN_ALSACE_CODE_LENGTH}+ characters): `);
    confirmation = await readHidden("Repeat private guide code: ");
    if (privateCode !== confirmation) throw new Error("The private guide codes did not match.");
    if (privateCode.trim().length < MIN_ALSACE_CODE_LENGTH) {
      throw new Error(`Use a private guide code with at least ${MIN_ALSACE_CODE_LENGTH} characters.`);
    }

    const envelope = await encryptPrivateAlsace(payload, privateCode);
    writeAtomically(outputPath, `${JSON.stringify(envelope, null, 2)}\n`);
    process.stdout.write(`Encrypted private Alsace guide written to ${path.relative(root, outputPath)}.\n`);
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
