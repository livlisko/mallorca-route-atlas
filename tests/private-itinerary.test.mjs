import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptPrivateItinerary,
  encryptPrivateItinerary,
  ITINERARY_CONTEXT,
  PBKDF2_ITERATIONS,
  validateEnvelope,
  validatePrivateItinerary,
} from "../src/privateItineraryCrypto.js";
import { scanEntries } from "../scripts/assert-private-boundary.mjs";

const privateCode = "sample-private-code-7H4Q-9Z2M";

function samplePayload() {
  return {
    version: 1,
    reviewedOn: "1 January 2030",
    headline: "A synthetic trip used only for testing",
    timeNote: "All sample times are local.",
    journey: [
      {
        id: "sample-flight",
        kind: "flight",
        date: "Monday",
        eyebrow: "Sample carrier 123",
        title: "An example flight",
        status: "Confirmed",
        route: "AAA to BBB",
        schedule: [{ time: "10:00", label: "Depart", detail: "Sample terminal" }],
        facts: [{ label: "Seat", value: "1A" }],
        note: "Synthetic data only.",
      },
    ],
    alerts: [{ level: "attention", title: "Sample check", body: "This is synthetic.", action: "Do nothing." }],
    stays: [{ date: "Monday", title: "Sample stay", status: "confirmed", place: "Example", details: "Synthetic." }],
    wallet: [{ label: "Sample code", value: "SAMPLE123", note: "Not a real booking." }],
    missing: ["Nothing real is represented here."],
  };
}

test("encrypts and decrypts an authenticated private itinerary", async () => {
  const payload = samplePayload();
  const envelope = await encryptPrivateItinerary(payload, privateCode);
  assert.equal(envelope.context, ITINERARY_CONTEXT);
  assert.equal(envelope.kdf.iterations, PBKDF2_ITERATIONS);
  assert.deepEqual(await decryptPrivateItinerary(envelope, privateCode), payload);
});

test("rejects the wrong private code and ciphertext tampering", async () => {
  const envelope = await encryptPrivateItinerary(samplePayload(), privateCode);
  await assert.rejects(() => decryptPrivateItinerary(envelope, "different-private-code-1X8Q"));

  const tampered = structuredClone(envelope);
  const bytes = Uint8Array.from(atob(tampered.ciphertext), (character) => character.charCodeAt(0));
  bytes[0] ^= 1;
  tampered.ciphertext = btoa(String.fromCharCode(...bytes));
  await assert.rejects(() => decryptPrivateItinerary(tampered, privateCode));
});

test("rejects unsupported envelopes before decryption", () => {
  const base = {
    version: 1,
    context: ITINERARY_CONTEXT,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: PBKDF2_ITERATIONS, salt: btoa("1234567890abcdef") },
    cipher: { name: "AES-GCM", iv: btoa("123456789012"), tagLength: 128 },
    ciphertext: btoa("12345678901234567"),
  };
  assert.throws(() => validateEnvelope({ ...base, version: 2 }));
  assert.throws(() => validateEnvelope({ ...base, context: `${ITINERARY_CONTEXT}-changed` }));
  assert.throws(() => validateEnvelope({ ...base, kdf: { ...base.kdf, iterations: 1 } }));
});

test("rejects unexpected or source-document fields in decrypted data", () => {
  assert.throws(() => validatePrivateItinerary({ ...samplePayload(), sourceFilename: "source-document" }));
  const payload = samplePayload();
  payload.journey[0].note = ["source", ".p", "df"].join("");
  assert.throws(() => validatePrivateItinerary(payload));
});

test("privacy scanner catches a synthetic booking canary and document signature", () => {
  const canary = ["book", "ing reference", ": ", "AB12", "CD"].join("");
  const signature = String.fromCharCode(37, 80, 68, 70, 45);
  const hits = scanEntries([
    { path: "sample.txt", contents: Buffer.from(canary) },
    { path: "sample.bin", contents: Buffer.from(`${signature} sample`) },
  ]);
  assert.equal(hits.length, 2);
  assert.deepEqual(new Set(hits.map((hit) => hit.label)), new Set(["booking reference in plaintext", "embedded document"]));
});

test("privacy scanner checks filenames, case variants, and unexpected images", () => {
  const denylist = [{ label: "synthetic private value", value: "private-token-42" }];
  const hits = scanEntries(
    [{ path: "notes/PRIVATE-TOKEN-42.png", contents: Buffer.from("harmless pixels") }],
    denylist,
  );
  assert.deepEqual(
    new Set(hits.map((hit) => hit.label)),
    new Set(["image outside the approved public-asset list", "synthetic private value"]),
  );
});

test("privacy scanner rejects unlisted images in current and historical asset folders", () => {
  const hits = scanEntries([
    { path: "public/assets/hero/unlisted.png", contents: Buffer.from("harmless pixels") },
    { path: "history:public/assets/routes/unlisted.jpg@abcdef0123", contents: Buffer.from("harmless pixels") },
  ]);
  assert.equal(hits.filter((hit) => hit.label === "image outside the approved public-asset list").length, 2);
});
