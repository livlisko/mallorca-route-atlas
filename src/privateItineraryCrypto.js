const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export const ITINERARY_CONTEXT = "mallorca-route-atlas/private-itinerary/v2";
export const PBKDF2_ITERATIONS = 600_000;

const WEATHER_MONTH = "2026-10";
const WEATHER_DATES = Array.from(
  { length: 31 },
  (_, index) => `${WEATHER_MONTH}-${String(index + 1).padStart(2, "0")}`,
);
const WEATHER_SOURCE_URLS = new Set([
  "https://open-meteo.com/en/docs",
  "https://open-meteo.com/en/docs/historical-weather-api",
  "https://open-meteo.com/en/terms",
  "https://open-meteo.com/en/licence",
  "https://creativecommons.org/licenses/by/4.0/",
]);

const forbiddenPrivateText = [
  /\/Users\//i,
  /(?:Downloads|Desktop)\//i,
  /\.pdf\b/i,
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
  /(?:visa|mastercard|amex)\s*(?:ending|\()?\s*\d{4}/i,
];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, path) {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} has an unsupported shape.`);
  }
}

function assertString(value, path, { max = 420, allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0) || value.length > max) {
    throw new TypeError(`${path} must be a valid string.`);
  }
  if (forbiddenPrivateText.some((pattern) => pattern.test(value))) {
    throw new TypeError(`${path} contains information that is not allowed in this brief.`);
  }
}

function assertStringArray(value, path, maxItems = 20) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new TypeError(`${path} must be a supported list.`);
  }
  value.forEach((item, index) => assertString(item, `${path}[${index}]`));
}

function assertFiniteNumber(value, path, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a supported number.`);
  }
}

function assertIsoDate(value, path) {
  assertString(value, path, { max: 10 });
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (
    !match ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new TypeError(`${path} must be an ISO date.`);
  }
}

function assertWeatherSourceUrl(value, path) {
  assertString(value, path, { max: 120 });
  if (!WEATHER_SOURCE_URLS.has(value)) throw new TypeError(`${path} is not an approved source URL.`);
}

function assertScheduleItem(value, path) {
  assertExactKeys(value, ["time", "label", "detail"], path);
  assertString(value.time, `${path}.time`, { max: 48 });
  assertString(value.label, `${path}.label`, { max: 90 });
  assertString(value.detail, `${path}.detail`, { max: 180 });
}

function assertFact(value, path) {
  assertExactKeys(value, ["label", "value"], path);
  assertString(value.label, `${path}.label`, { max: 64 });
  assertString(value.value, `${path}.value`, { max: 160 });
}

function assertJourneyItem(value, path) {
  assertExactKeys(
    value,
    ["id", "kind", "date", "eyebrow", "title", "status", "route", "schedule", "facts", "note"],
    path,
  );
  assertString(value.id, `${path}.id`, { max: 40 });
  if (!["flight", "car"].includes(value.kind)) throw new TypeError(`${path}.kind is unsupported.`);
  assertString(value.date, `${path}.date`, { max: 72 });
  assertString(value.eyebrow, `${path}.eyebrow`, { max: 90 });
  assertString(value.title, `${path}.title`, { max: 120 });
  assertString(value.status, `${path}.status`, { max: 64 });
  assertString(value.route, `${path}.route`, { max: 130 });
  if (!Array.isArray(value.schedule) || value.schedule.length < 1 || value.schedule.length > 4) {
    throw new TypeError(`${path}.schedule is unsupported.`);
  }
  value.schedule.forEach((item, index) => assertScheduleItem(item, `${path}.schedule[${index}]`));
  if (!Array.isArray(value.facts) || value.facts.length > 8) {
    throw new TypeError(`${path}.facts is unsupported.`);
  }
  value.facts.forEach((item, index) => assertFact(item, `${path}.facts[${index}]`));
  assertString(value.note, `${path}.note`, { max: 320, allowEmpty: true });
}

function assertAlert(value, path) {
  assertExactKeys(value, ["level", "title", "body", "action"], path);
  if (!["urgent", "attention", "missing"].includes(value.level)) {
    throw new TypeError(`${path}.level is unsupported.`);
  }
  assertString(value.title, `${path}.title`, { max: 100 });
  assertString(value.body, `${path}.body`, { max: 320 });
  assertString(value.action, `${path}.action`, { max: 200 });
}

function assertStay(value, path) {
  assertExactKeys(value, ["date", "title", "status", "place", "details"], path);
  assertString(value.date, `${path}.date`, { max: 72 });
  assertString(value.title, `${path}.title`, { max: 110 });
  if (!["confirmed", "missing", "included"].includes(value.status)) {
    throw new TypeError(`${path}.status is unsupported.`);
  }
  assertString(value.place, `${path}.place`, { max: 130 });
  assertString(value.details, `${path}.details`, { max: 320 });
}

function assertWalletItem(value, path) {
  assertExactKeys(value, ["label", "value", "note"], path);
  assertString(value.label, `${path}.label`, { max: 90 });
  assertString(value.value, `${path}.value`, { max: 80 });
  assertString(value.note, `${path}.note`, { max: 150 });
}

function assertWeatherDay(value, path, expectedDate) {
  assertExactKeys(
    value,
    ["date", "highC", "lowC", "wetDayFrequencyPct", "precipMm", "gustKmh", "sunshineHours"],
    path,
  );
  assertIsoDate(value.date, `${path}.date`);
  if (value.date !== expectedDate) throw new TypeError(`${path}.date is outside the supported month.`);
  assertFiniteNumber(value.highC, `${path}.highC`, -60, 60);
  assertFiniteNumber(value.lowC, `${path}.lowC`, -60, 60);
  if (value.lowC > value.highC) throw new TypeError(`${path} has a low above its high.`);
  assertFiniteNumber(value.wetDayFrequencyPct, `${path}.wetDayFrequencyPct`, 0, 100);
  assertFiniteNumber(value.precipMm, `${path}.precipMm`, 0, 500);
  assertFiniteNumber(value.gustKmh, `${path}.gustKmh`, 0, 300);
  assertFiniteNumber(value.sunshineHours, `${path}.sunshineHours`, 0, 24);
}

function assertWeatherLocation(value, path) {
  assertExactKeys(
    value,
    [
      "id",
      "label",
      "region",
      "latitude",
      "longitude",
      "timezone",
      "tripStart",
      "tripEnd",
      "climateDays",
    ],
    path,
  );
  assertString(value.id, `${path}.id`, { max: 32 });
  if (!/^[a-z0-9-]+$/.test(value.id)) throw new TypeError(`${path}.id is unsupported.`);
  assertString(value.label, `${path}.label`, { max: 72 });
  assertString(value.region, `${path}.region`, { max: 90 });
  assertFiniteNumber(value.latitude, `${path}.latitude`, -90, 90);
  assertFiniteNumber(value.longitude, `${path}.longitude`, -180, 180);
  assertString(value.timezone, `${path}.timezone`, { max: 64 });
  if (!/^[A-Za-z_+-]+\/[A-Za-z0-9_+\-/]+$/.test(value.timezone)) {
    throw new TypeError(`${path}.timezone is unsupported.`);
  }
  assertIsoDate(value.tripStart, `${path}.tripStart`);
  assertIsoDate(value.tripEnd, `${path}.tripEnd`);
  if (!WEATHER_DATES.includes(value.tripStart) || !WEATHER_DATES.includes(value.tripEnd)) {
    throw new TypeError(`${path} has a trip window outside the supported month.`);
  }
  if (value.tripStart > value.tripEnd) throw new TypeError(`${path} has an invalid trip window.`);
  if (!Array.isArray(value.climateDays) || value.climateDays.length !== WEATHER_DATES.length) {
    throw new TypeError(`${path}.climateDays must cover all of October.`);
  }
  value.climateDays.forEach((day, index) => assertWeatherDay(day, `${path}.climateDays[${index}]`, WEATHER_DATES[index]));
}

function assertWeather(value, path) {
  assertExactKeys(value, ["month", "generatedOn", "climate", "forecast", "locations"], path);
  if (value.month !== WEATHER_MONTH) throw new TypeError(`${path}.month is unsupported.`);
  assertString(value.generatedOn, `${path}.generatedOn`, { max: 72 });

  assertExactKeys(value.climate, ["period", "sourceLabel", "sourceUrl", "method"], `${path}.climate`);
  if (value.climate.period !== "1991–2020") throw new TypeError(`${path}.climate.period is unsupported.`);
  assertString(value.climate.sourceLabel, `${path}.climate.sourceLabel`, { max: 100 });
  assertWeatherSourceUrl(value.climate.sourceUrl, `${path}.climate.sourceUrl`);
  assertString(value.climate.method, `${path}.climate.method`, { max: 420 });

  assertExactKeys(
    value.forecast,
    ["sourceLabel", "sourceUrl", "privacyUrl", "licenceLabel", "licenceUrl"],
    `${path}.forecast`,
  );
  assertString(value.forecast.sourceLabel, `${path}.forecast.sourceLabel`, { max: 100 });
  assertWeatherSourceUrl(value.forecast.sourceUrl, `${path}.forecast.sourceUrl`);
  assertWeatherSourceUrl(value.forecast.privacyUrl, `${path}.forecast.privacyUrl`);
  assertString(value.forecast.licenceLabel, `${path}.forecast.licenceLabel`, { max: 40 });
  assertWeatherSourceUrl(value.forecast.licenceUrl, `${path}.forecast.licenceUrl`);

  if (!Array.isArray(value.locations) || value.locations.length < 1 || value.locations.length > 8) {
    throw new TypeError(`${path}.locations is unsupported.`);
  }
  const ids = new Set();
  value.locations.forEach((location, index) => {
    assertWeatherLocation(location, `${path}.locations[${index}]`);
    if (ids.has(location.id)) throw new TypeError(`${path}.locations contains a duplicate id.`);
    ids.add(location.id);
  });
}

export function validatePrivateItinerary(payload) {
  assertExactKeys(
    payload,
    ["version", "reviewedOn", "headline", "timeNote", "journey", "alerts", "stays", "wallet", "missing", "weather"],
    "payload",
  );
  if (payload.version !== 2) throw new TypeError("payload.version is unsupported.");
  assertString(payload.reviewedOn, "payload.reviewedOn", { max: 72 });
  assertString(payload.headline, "payload.headline", { max: 150 });
  assertString(payload.timeNote, "payload.timeNote", { max: 180 });

  if (!Array.isArray(payload.journey) || payload.journey.length < 1 || payload.journey.length > 12) {
    throw new TypeError("payload.journey is unsupported.");
  }
  payload.journey.forEach((item, index) => assertJourneyItem(item, `payload.journey[${index}]`));

  if (!Array.isArray(payload.alerts) || payload.alerts.length > 12) {
    throw new TypeError("payload.alerts is unsupported.");
  }
  payload.alerts.forEach((item, index) => assertAlert(item, `payload.alerts[${index}]`));

  if (!Array.isArray(payload.stays) || payload.stays.length > 8) {
    throw new TypeError("payload.stays is unsupported.");
  }
  payload.stays.forEach((item, index) => assertStay(item, `payload.stays[${index}]`));

  if (!Array.isArray(payload.wallet) || payload.wallet.length > 12) {
    throw new TypeError("payload.wallet is unsupported.");
  }
  payload.wallet.forEach((item, index) => assertWalletItem(item, `payload.wallet[${index}]`));
  assertStringArray(payload.missing, "payload.missing", 20);
  assertWeather(payload.weather, "payload.weather");
  return payload;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value, path) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new TypeError(`${path} must be base64.`);
  }
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new TypeError(`${path} must be base64.`);
  }
}

export function validateEnvelope(envelope) {
  assertExactKeys(envelope, ["version", "context", "kdf", "cipher", "ciphertext"], "envelope");
  if (envelope.version !== 2 || envelope.context !== ITINERARY_CONTEXT) {
    throw new TypeError("This encrypted brief version is not supported.");
  }

  assertExactKeys(envelope.kdf, ["name", "hash", "iterations", "salt"], "envelope.kdf");
  if (
    envelope.kdf.name !== "PBKDF2" ||
    envelope.kdf.hash !== "SHA-256" ||
    envelope.kdf.iterations !== PBKDF2_ITERATIONS
  ) {
    throw new TypeError("This key-derivation setup is not supported.");
  }

  assertExactKeys(envelope.cipher, ["name", "iv", "tagLength"], "envelope.cipher");
  if (envelope.cipher.name !== "AES-GCM" || envelope.cipher.tagLength !== 128) {
    throw new TypeError("This encryption setup is not supported.");
  }

  const salt = base64ToBytes(envelope.kdf.salt, "envelope.kdf.salt");
  const iv = base64ToBytes(envelope.cipher.iv, "envelope.cipher.iv");
  const ciphertext = base64ToBytes(envelope.ciphertext, "envelope.ciphertext");
  if (salt.byteLength !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new TypeError("The encrypted brief is malformed.");
  }
  return { salt, iv, ciphertext };
}

async function deriveKey(passphrase, salt, usage) {
  if (typeof passphrase !== "string" || passphrase.trim().length < 20) {
    throw new TypeError("A longer private code is required.");
  }
  const passphraseBytes = textEncoder.encode(passphrase.trim());
  try {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      passphraseBytes,
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return await globalThis.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: PBKDF2_ITERATIONS,
        salt,
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      [usage],
    );
  } finally {
    passphraseBytes.fill(0);
  }
}

export async function encryptPrivateItinerary(payload, passphrase) {
  validatePrivateItinerary(payload);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, "encrypt");
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  try {
    const encrypted = await globalThis.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: textEncoder.encode(ITINERARY_CONTEXT),
        tagLength: 128,
      },
      key,
      plaintext,
    );
    return {
      version: 2,
      context: ITINERARY_CONTEXT,
      kdf: {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
      },
      cipher: {
        name: "AES-GCM",
        iv: bytesToBase64(iv),
        tagLength: 128,
      },
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptPrivateItinerary(envelope, passphrase) {
  const { salt, iv, ciphertext } = validateEnvelope(envelope);
  const key = await deriveKey(passphrase, salt, "decrypt");
  let plaintext;
  try {
    plaintext = new Uint8Array(
      await globalThis.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: textEncoder.encode(ITINERARY_CONTEXT),
          tagLength: 128,
        },
        key,
        ciphertext,
      ),
    );
    const decoded = textDecoder.decode(plaintext);
    return validatePrivateItinerary(JSON.parse(decoded));
  } finally {
    plaintext?.fill(0);
    salt.fill(0);
    iv.fill(0);
    ciphertext.fill(0);
  }
}
