const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export const ALSACE_CONTEXT = "mallorca-route-atlas/private-alsace/v1";
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_ALSACE_CODE_LENGTH = 6;
export const ALSACE_PLACE_PHOTO_ASSETS = Object.freeze(
  Array.from({ length: 15 }, (_, index) => `assets/alsace/places/p${String(index + 1).padStart(2, "0")}.webp`),
);

const ALSACE_PLACE_PHOTO_ASSET_SET = new Set(ALSACE_PLACE_PHOTO_ASSETS);

const SOURCE_HOSTS = new Set([
  "visit.alsace",
  "maisondurangen.fr",
  "eterritoire.fr",
  "memorial-hwk.eu",
  "grand-ballon.net",
  "inforoute.alsace.eu",
  "murbach.fr",
  "chateauneuenbourg.fr",
  "ville-guebwiller.fr",
  "parc-wesserling.fr",
  "lac-kruth-wildenstein.fr",
  "massif-des-vosges.fr",
  "eguisheim.com",
  "tourisme-colmar.com",
  "musee-unterlinden.com",
  "citedutrain.com",
  "musee-automobile.fr",
  "commons.wikimedia.org",
]);

const PLACE_STATUSES = new Set(["open", "weather", "reserve", "check"]);

const forbiddenPublicGuideText = [
  /(?:^|[\s"'(])\/(?:Users|home)\//i,
  /[A-Za-z]:\\Users\\/i,
  /(?:Downloads|Desktop)[/\\]/i,
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
  /\.(?:pdf|docx?|eml)\b/i,
  /(?:booking|reservation|confirmation)\s*(?:reference|number|code|#)/i,
  /e-?ticket\s*(?:number|#|:)/i,
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

function assertString(value, path, { max = 500, allowEmpty = false } = {}) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.trim().length === 0) ||
    value.length > max
  ) {
    throw new TypeError(`${path} must be a valid string.`);
  }
  if (forbiddenPublicGuideText.some((pattern) => pattern.test(value))) {
    throw new TypeError(`${path} contains information that is not allowed in this public-attractions guide.`);
  }
}

function assertId(value, path) {
  assertString(value, path, { max: 48 });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase hyphenated id.`);
  }
}

function assertFiniteNumber(value, path, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a supported number.`);
  }
}

function isAllowedSourceHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  for (const allowed of SOURCE_HOSTS) {
    if (normalized === allowed || normalized.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

function assertSourceUrl(value, path) {
  assertString(value, path, { max: 500 });
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${path} must be an approved HTTPS source URL.`);
  }
  if (
    url.protocol !== "https:" ||
    !isAllowedSourceHost(url.hostname) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new TypeError(`${path} must be an approved HTTPS source URL.`);
  }
}

function assertBase(value, path) {
  assertExactKeys(value, ["label", "latitude", "longitude"], path);
  assertString(value.label, `${path}.label`, { max: 100 });
  if (/(?:\d|\b(?:hotel|hôtel|hostel|inn|lodging|address|domaine|rue|street|avenue|boulevard|route|road|chemin)\b)/i.test(value.label)) {
    throw new TypeError(`${path}.label must identify only a coarse base area.`);
  }
  assertFiniteNumber(value.latitude, `${path}.latitude`, -90, 90);
  assertFiniteNumber(value.longitude, `${path}.longitude`, -180, 180);
  for (const coordinate of [value.latitude, value.longitude]) {
    if (Math.abs(coordinate * 100 - Math.round(coordinate * 100)) > 1e-8) {
      throw new TypeError(`${path} coordinates must be rounded to a coarse base area.`);
    }
  }
}

function assertCategory(value, path) {
  assertExactKeys(value, ["id", "label", "color"], path);
  assertId(value.id, `${path}.id`);
  assertString(value.label, `${path}.label`, { max: 60 });
  assertString(value.color, `${path}.color`, { max: 7 });
  if (!/^#[0-9a-f]{6}$/i.test(value.color)) throw new TypeError(`${path}.color must be a six-digit hex color.`);
}

function assertSource(value, path) {
  assertExactKeys(value, ["label", "url"], path);
  assertString(value.label, `${path}.label`, { max: 100 });
  assertSourceUrl(value.url, `${path}.url`);
}

function assertSources(value, path) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new TypeError(`${path} must be a supported source list.`);
  }
  value.forEach((source, index) => assertSource(source, `${path}[${index}]`));
}

function assertPhoto(value, path) {
  assertExactKeys(value, ["asset", "alt", "credit", "license", "sourceUrl"], path);
  assertString(value.asset, `${path}.asset`, { max: 100 });
  if (!ALSACE_PLACE_PHOTO_ASSET_SET.has(value.asset)) {
    throw new TypeError(`${path}.asset must be an approved local place photo.`);
  }
  assertString(value.alt, `${path}.alt`, { max: 220 });
  assertString(value.credit, `${path}.credit`, { max: 140 });
  assertString(value.license, `${path}.license`, { max: 64 });
  assertSourceUrl(value.sourceUrl, `${path}.sourceUrl`);
}

function assertPlace(value, path) {
  assertExactKeys(
    value,
    [
      "id",
      "title",
      "locality",
      "summary",
      "why",
      "categories",
      "latitude",
      "longitude",
      "photo",
      "driveDistanceKm",
      "driveMinutes",
      "duration",
      "effort",
      "weather",
      "status",
      "hoursNote",
      "sources",
    ],
    path,
  );
  assertId(value.id, `${path}.id`);
  assertString(value.title, `${path}.title`, { max: 120 });
  assertString(value.locality, `${path}.locality`, { max: 100 });
  assertString(value.summary, `${path}.summary`, { max: 260 });
  assertString(value.why, `${path}.why`, { max: 900 });
  if (!Array.isArray(value.categories) || value.categories.length < 1 || value.categories.length > 8) {
    throw new TypeError(`${path}.categories must be a supported list.`);
  }
  value.categories.forEach((categoryId, index) => assertId(categoryId, `${path}.categories[${index}]`));
  if (new Set(value.categories).size !== value.categories.length) {
    throw new TypeError(`${path}.categories contains a duplicate id.`);
  }
  assertFiniteNumber(value.latitude, `${path}.latitude`, -90, 90);
  assertFiniteNumber(value.longitude, `${path}.longitude`, -180, 180);
  assertPhoto(value.photo, `${path}.photo`);
  if (!Number.isInteger(value.driveDistanceKm) || value.driveDistanceKm < 0 || value.driveDistanceKm > 1000) {
    throw new TypeError(`${path}.driveDistanceKm must be a supported integer.`);
  }
  if (!Number.isInteger(value.driveMinutes) || value.driveMinutes < 0 || value.driveMinutes > 600) {
    throw new TypeError(`${path}.driveMinutes must be a supported integer.`);
  }
  assertString(value.duration, `${path}.duration`, { max: 64 });
  assertString(value.effort, `${path}.effort`, { max: 90 });
  assertString(value.weather, `${path}.weather`, { max: 220 });
  if (!PLACE_STATUSES.has(value.status)) throw new TypeError(`${path}.status is unsupported.`);
  assertString(value.hoursNote, `${path}.hoursNote`, { max: 260 });
  assertSources(value.sources, `${path}.sources`);
}

function assertEvent(value, path) {
  assertExactKeys(
    value,
    ["date", "time", "title", "body", "placeId", "price", "status", "sources"],
    path,
  );
  assertString(value.date, `${path}.date`, { max: 72 });
  assertString(value.time, `${path}.time`, { max: 64 });
  assertString(value.title, `${path}.title`, { max: 120 });
  assertString(value.body, `${path}.body`, { max: 600 });
  assertId(value.placeId, `${path}.placeId`);
  assertString(value.price, `${path}.price`, { max: 80 });
  if (!PLACE_STATUSES.has(value.status)) throw new TypeError(`${path}.status is unsupported.`);
  assertSources(value.sources, `${path}.sources`);
}

function assertDayPlan(value, path) {
  assertExactKeys(value, ["id", "title", "duration", "condition", "summary", "stops"], path);
  assertId(value.id, `${path}.id`);
  assertString(value.title, `${path}.title`, { max: 110 });
  assertString(value.duration, `${path}.duration`, { max: 64 });
  assertString(value.condition, `${path}.condition`, { max: 120 });
  assertString(value.summary, `${path}.summary`, { max: 420 });
  if (!Array.isArray(value.stops) || value.stops.length < 1 || value.stops.length > 12) {
    throw new TypeError(`${path}.stops must be a supported list.`);
  }
  value.stops.forEach((placeId, index) => assertId(placeId, `${path}.stops[${index}]`));
  if (new Set(value.stops).size !== value.stops.length) {
    throw new TypeError(`${path}.stops contains a duplicate id.`);
  }
}

export function validatePrivateAlsace(payload) {
  assertExactKeys(
    payload,
    ["version", "reviewedOn", "title", "subtitle", "base", "categories", "places", "event", "dayPlans"],
    "payload",
  );
  if (payload.version !== 1) throw new TypeError("payload.version is unsupported.");
  assertString(payload.reviewedOn, "payload.reviewedOn", { max: 72 });
  assertString(payload.title, "payload.title", { max: 120 });
  assertString(payload.subtitle, "payload.subtitle", { max: 300 });
  assertBase(payload.base, "payload.base");

  if (!Array.isArray(payload.categories) || payload.categories.length < 1 || payload.categories.length > 12) {
    throw new TypeError("payload.categories must be a supported list.");
  }
  const categoryIds = new Set();
  payload.categories.forEach((category, index) => {
    assertCategory(category, `payload.categories[${index}]`);
    if (categoryIds.has(category.id)) throw new TypeError("payload.categories contains a duplicate id.");
    categoryIds.add(category.id);
  });

  if (!Array.isArray(payload.places) || payload.places.length < 1 || payload.places.length > 80) {
    throw new TypeError("payload.places must be a supported list.");
  }
  const placeIds = new Set();
  payload.places.forEach((place, index) => {
    assertPlace(place, `payload.places[${index}]`);
    if (placeIds.has(place.id)) throw new TypeError("payload.places contains a duplicate id.");
    for (const categoryId of place.categories) {
      if (!categoryIds.has(categoryId)) {
        throw new TypeError(`payload.places[${index}].categories references an unknown category.`);
      }
    }
    placeIds.add(place.id);
  });

  assertEvent(payload.event, "payload.event");
  if (!placeIds.has(payload.event.placeId)) {
    throw new TypeError("payload.event.placeId references an unknown place.");
  }

  if (!Array.isArray(payload.dayPlans) || payload.dayPlans.length < 1 || payload.dayPlans.length > 12) {
    throw new TypeError("payload.dayPlans must be a supported list.");
  }
  const dayPlanIds = new Set();
  payload.dayPlans.forEach((dayPlan, index) => {
    assertDayPlan(dayPlan, `payload.dayPlans[${index}]`);
    if (dayPlanIds.has(dayPlan.id)) throw new TypeError("payload.dayPlans contains a duplicate id.");
    for (const placeId of dayPlan.stops) {
      if (!placeIds.has(placeId)) {
        throw new TypeError(`payload.dayPlans[${index}].stops references an unknown place.`);
      }
    }
    dayPlanIds.add(dayPlan.id);
  });

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

function base64ToBytes(value, path, maximumBytes) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(maximumBytes / 3) * 4 + 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new TypeError(`${path} must be base64.`);
  }
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes.byteLength > maximumBytes) throw new TypeError(`${path} is too large.`);
    return bytes;
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError(`${path} must be base64.`);
  }
}

export function validateAlsaceEnvelope(envelope) {
  assertExactKeys(envelope, ["version", "context", "kdf", "cipher", "ciphertext"], "envelope");
  if (envelope.version !== 1 || envelope.context !== ALSACE_CONTEXT) {
    throw new TypeError("This encrypted Alsace guide version is not supported.");
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

  const salt = base64ToBytes(envelope.kdf.salt, "envelope.kdf.salt", 16);
  const iv = base64ToBytes(envelope.cipher.iv, "envelope.cipher.iv", 12);
  const ciphertext = base64ToBytes(envelope.ciphertext, "envelope.ciphertext", 2 * 1024 * 1024);
  if (salt.byteLength !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new TypeError("The encrypted Alsace guide is malformed.");
  }
  return { salt, iv, ciphertext };
}

function normalizeCode(code) {
  if (typeof code !== "string") throw new TypeError("A private guide code is required.");
  const normalized = code.trim();
  if (normalized.length < MIN_ALSACE_CODE_LENGTH || normalized.length > 256) {
    throw new TypeError(`The private guide code must be ${MIN_ALSACE_CODE_LENGTH}–256 characters.`);
  }
  return normalized;
}

async function deriveKey(code, salt, usage) {
  const codeBytes = textEncoder.encode(normalizeCode(code));
  try {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      codeBytes,
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
    codeBytes.fill(0);
  }
}

export async function encryptPrivateAlsace(payload, code) {
  validatePrivateAlsace(payload);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt, "encrypt");
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  try {
    const encrypted = await globalThis.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: textEncoder.encode(ALSACE_CONTEXT),
        tagLength: 128,
      },
      key,
      plaintext,
    );
    return {
      version: 1,
      context: ALSACE_CONTEXT,
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

export async function decryptPrivateAlsace(envelope, code) {
  const { salt, iv, ciphertext } = validateAlsaceEnvelope(envelope);
  const key = await deriveKey(code, salt, "decrypt");
  let plaintext;
  try {
    plaintext = new Uint8Array(
      await globalThis.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: textEncoder.encode(ALSACE_CONTEXT),
          tagLength: 128,
        },
        key,
        ciphertext,
      ),
    );
    return validatePrivateAlsace(JSON.parse(textDecoder.decode(plaintext)));
  } finally {
    plaintext?.fill(0);
    salt.fill(0);
    iv.fill(0);
    ciphertext.fill(0);
  }
}
