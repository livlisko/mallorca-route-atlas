import assert from "node:assert/strict";
import test from "node:test";
import {
  ALSACE_CONTEXT,
  decryptPrivateAlsace,
  encryptPrivateAlsace,
  MIN_ALSACE_CODE_LENGTH,
  PBKDF2_ITERATIONS,
  validateAlsaceEnvelope,
  validatePrivateAlsace,
} from "../src/alsaceCrypto.js";

const syntheticCode = ["testing", "only", "guide"].join("-");

function samplePayload() {
  return {
    version: 1,
    reviewedOn: "11 October 2026",
    title: "Synthetic public-attractions guide",
    subtitle: "Test fixtures only; no personal travel details.",
    base: {
      label: "Example base",
      latitude: 47.81,
      longitude: 7.1,
    },
    categories: [
      {
        id: "outdoors",
        label: "Outdoors",
        color: "#087f8c",
      },
    ],
    places: [
      {
        id: "sample-place",
        title: "Sample public place",
        locality: "Example locality",
        summary: "A synthetic attraction used to exercise the private-guide schema.",
        why: "It provides a stable, non-personal test record.",
        categories: ["outdoors"],
        latitude: 47.82,
        longitude: 7.11,
        driveMinutes: 15,
        duration: "1–2 hours",
        effort: "Easy",
        weather: "Check current conditions before visiting.",
        status: "weather",
        hoursNote: "Verify public opening information with the source.",
        sources: [
          {
            label: "Official regional tourism source",
            url: "https://www.visit.alsace/example",
          },
        ],
      },
    ],
    event: {
      date: "Friday, 16 October 2026",
      time: "18:00",
      title: "Sample public event",
      body: "A synthetic event entry for automated testing.",
      placeId: "sample-place",
      price: "Check the organizer",
      status: "check",
      sources: [
        {
          label: "Official event source",
          url: "https://visit.alsace/events/example",
        },
      ],
    },
    dayPlans: [
      {
        id: "sample-day",
        title: "Sample day plan",
        duration: "Half day",
        condition: "Best in settled weather",
        summary: "A synthetic sequence referencing the public place above.",
        stops: ["sample-place"],
      },
    ],
  };
}

test("encrypts and decrypts an authenticated Alsace guide with fresh salt and IV", async () => {
  const payload = samplePayload();
  const first = await encryptPrivateAlsace(payload, syntheticCode);
  const second = await encryptPrivateAlsace(payload, syntheticCode);

  assert.equal(first.context, ALSACE_CONTEXT);
  assert.equal(first.kdf.iterations, PBKDF2_ITERATIONS);
  assert.notEqual(first.kdf.salt, second.kdf.salt);
  assert.notEqual(first.cipher.iv, second.cipher.iv);
  assert.deepEqual(await decryptPrivateAlsace(first, syntheticCode), payload);
});

test("rejects wrong codes, short codes, and ciphertext tampering", async () => {
  const envelope = await encryptPrivateAlsace(samplePayload(), syntheticCode);

  await assert.rejects(() => decryptPrivateAlsace(envelope, "wrong-code"));
  await assert.rejects(() => encryptPrivateAlsace(samplePayload(), "short"));
  await assert.rejects(() => decryptPrivateAlsace(envelope, "short"));
  assert.equal(MIN_ALSACE_CODE_LENGTH, 6);

  const tampered = structuredClone(envelope);
  const bytes = Uint8Array.from(atob(tampered.ciphertext), (character) => character.charCodeAt(0));
  bytes[0] ^= 1;
  tampered.ciphertext = btoa(String.fromCharCode(...bytes));
  await assert.rejects(() => decryptPrivateAlsace(tampered, syntheticCode));
});

test("rejects cross-context and unsupported envelope parameters", async () => {
  const envelope = await encryptPrivateAlsace(samplePayload(), syntheticCode);

  assert.throws(() => validateAlsaceEnvelope({ ...envelope, context: "mallorca-route-atlas/private-itinerary/v2" }));
  assert.throws(() => validateAlsaceEnvelope({ ...envelope, version: 2 }));
  assert.throws(() =>
    validateAlsaceEnvelope({
      ...envelope,
      kdf: { ...envelope.kdf, iterations: PBKDF2_ITERATIONS - 1 },
    }),
  );
  assert.throws(() =>
    validateAlsaceEnvelope({
      ...envelope,
      cipher: { ...envelope.cipher, tagLength: 96 },
    }),
  );
});

test("enforces exact guide shapes, references, statuses, and coordinates", () => {
  assert.doesNotThrow(() => validatePrivateAlsace(samplePayload()));
  assert.throws(() => validatePrivateAlsace({ ...samplePayload(), extra: true }));

  const extraPlaceField = samplePayload();
  extraPlaceField.places[0].privateNote = "unsupported";
  assert.throws(() => validatePrivateAlsace(extraPlaceField));

  const unknownCategory = samplePayload();
  unknownCategory.places[0].categories = ["missing-category"];
  assert.throws(() => validatePrivateAlsace(unknownCategory));

  const unknownEventPlace = samplePayload();
  unknownEventPlace.event.placeId = "missing-place";
  assert.throws(() => validatePrivateAlsace(unknownEventPlace));

  const unknownStop = samplePayload();
  unknownStop.dayPlans[0].stops = ["missing-place"];
  assert.throws(() => validatePrivateAlsace(unknownStop));

  const badStatus = samplePayload();
  badStatus.places[0].status = "confirmed";
  assert.throws(() => validatePrivateAlsace(badStatus));

  const badCoordinate = samplePayload();
  badCoordinate.places[0].latitude = 100;
  assert.throws(() => validatePrivateAlsace(badCoordinate));
});

test("rejects private-document text and non-allowlisted source URLs", () => {
  const localPath = samplePayload();
  localPath.places[0].why = ["/Users/example", "Downloads", "source.txt"].join("/");
  assert.throws(() => validatePrivateAlsace(localPath));

  const email = samplePayload();
  email.places[0].hoursNote = `Contact ${["example", "example.test"].join("@")} `;
  assert.throws(() => validatePrivateAlsace(email));

  const document = samplePayload();
  document.places[0].summary = "See private-confirmation.pdf";
  assert.throws(() => validatePrivateAlsace(document));

  const insecureSource = samplePayload();
  insecureSource.places[0].sources[0].url = "http://www.visit.alsace/example";
  assert.throws(() => validatePrivateAlsace(insecureSource));

  const unapprovedSource = samplePayload();
  unapprovedSource.places[0].sources[0].url = "https://example.com/attraction";
  assert.throws(() => validatePrivateAlsace(unapprovedSource));

  const deceptiveSource = samplePayload();
  deceptiveSource.places[0].sources[0].url = "https://visit.alsace.example.com/attraction";
  assert.throws(() => validatePrivateAlsace(deceptiveSource));
});
