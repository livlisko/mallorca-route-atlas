const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "precipitation_sum",
  "wind_gusts_10m_max",
  "sunshine_duration",
];

const CONDITION_GROUPS = [
  { codes: new Set([0]), label: "Clear", icon: "sun" },
  { codes: new Set([1, 2]), label: "Partly cloudy", icon: "partly-cloudy" },
  { codes: new Set([3]), label: "Overcast", icon: "cloud" },
  { codes: new Set([45, 48]), label: "Fog", icon: "fog" },
  { codes: new Set([51, 53, 55, 56, 57]), label: "Drizzle", icon: "rain" },
  { codes: new Set([61, 63, 65, 66, 67, 80, 81, 82]), label: "Rain", icon: "rain" },
  { codes: new Set([71, 73, 75, 77, 85, 86]), label: "Snow", icon: "snow" },
  { codes: new Set([95, 96, 99]), label: "Thunderstorms", icon: "storm" },
];

function localIsoDate(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function boundedOrNull(value, minimum, maximum, label) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Forecast response contained an invalid ${label}.`);
  }
  return value;
}

export function weatherCondition(code) {
  const match = CONDITION_GROUPS.find((group) => group.codes.has(code));
  return match ?? { label: "Conditions unavailable", icon: "unavailable" };
}

export function mergeWeatherDays(location, forecastDays = []) {
  const forecasts = new Map(forecastDays.map((day) => [day.date, day]));
  return location.climateDays.map((climateDay) => forecasts.get(climateDay.date) ?? {
    ...climateDay,
    evidence: "typical",
    conditionLabel: "Seasonal pattern",
    conditionIcon: "typical",
  });
}

export async function fetchLocationForecast(location, { signal, now = new Date() } = {}) {
  const coarseLatitude = Math.round(location.latitude * 100) / 100;
  const coarseLongitude = Math.round(location.longitude * 100) / 100;
  const search = new URLSearchParams({
    latitude: String(coarseLatitude),
    longitude: String(coarseLongitude),
    daily: DAILY_FIELDS.join(","),
    timezone: location.timezone,
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "16",
  });
  const response = await fetch(`${FORECAST_ENDPOINT}?${search}`, {
    signal,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(`Forecast request failed (${response.status}).`);
  const payload = await response.json();
  const daily = payload?.daily;
  const dates = daily?.time;
  if (!Array.isArray(dates)) throw new Error("Forecast response did not include daily dates.");

  const arrays = Object.fromEntries(
    DAILY_FIELDS.map((field) => {
      const values = daily[field];
      if (!Array.isArray(values) || values.length !== dates.length) {
        throw new Error(`Forecast response did not include ${field}.`);
      }
      return [field, values];
    }),
  );
  const today = localIsoDate(location.timezone, now);
  const seenDates = new Set();
  return dates.flatMap((date, index) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || seenDates.has(date)) {
      throw new Error("Forecast response contained an invalid date sequence.");
    }
    seenDates.add(date);
    if (index > 0 && date <= dates[index - 1]) throw new Error("Forecast response dates were not ordered.");
    if (!date.startsWith("2026-10-") || date < today) return [];
    const highC = boundedOrNull(arrays.temperature_2m_max[index], -60, 60, "daily high");
    const lowC = boundedOrNull(arrays.temperature_2m_min[index], -60, 60, "daily low");
    if (highC === null || lowC === null) return [];
    if (lowC > highC) throw new Error("Forecast response contained an inverted temperature range.");
    const weatherCode = boundedOrNull(arrays.weather_code[index], 0, 99, "weather code");
    const condition = weatherCondition(weatherCode);
    const sunshineSeconds = boundedOrNull(arrays.sunshine_duration[index], 0, 86_400, "sunshine duration");
    const leadDays = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
    return [{
      date,
      evidence: leadDays > 7 ? "extended" : "forecast",
      highC,
      lowC,
      precipProbabilityPct: boundedOrNull(arrays.precipitation_probability_max[index], 0, 100, "precipitation probability"),
      precipMm: boundedOrNull(arrays.precipitation_sum[index], 0, 500, "precipitation amount"),
      gustKmh: boundedOrNull(arrays.wind_gusts_10m_max[index], 0, 300, "wind gust"),
      sunshineHours: sunshineSeconds === null ? null : sunshineSeconds / 3600,
      conditionLabel: condition.label,
      conditionIcon: condition.icon,
    }];
  });
}

export function toFahrenheit(celsius) {
  return celsius * 9 / 5 + 32;
}

export function toInches(millimetres) {
  return millimetres / 25.4;
}

export function toMilesPerHour(kilometresPerHour) {
  return kilometresPerHour * 0.621371;
}

export function formatTemperature(value, unit) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(unit === "imperial" ? toFahrenheit(value) : value)}°${unit === "imperial" ? "F" : "C"}`;
}

export function formatPrecipitation(value, unit) {
  if (!Number.isFinite(value)) return "—";
  if (unit === "imperial") return `${toInches(value).toFixed(value < 2.54 ? 2 : 1)} in`;
  return `${value.toFixed(value < 10 ? 1 : 0)} mm`;
}

export function formatWind(value, unit) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(unit === "imperial" ? toMilesPerHour(value) : value)} ${unit === "imperial" ? "mph" : "km/h"}`;
}
