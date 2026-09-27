import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchLocationForecast,
  formatPrecipitation,
  formatTemperature,
  formatWind,
  mergeWeatherDays,
} from "../src/privateWeather.js";

const location = {
  latitude: 10.12345,
  longitude: 20.67891,
  timezone: "Europe/Paris",
  climateDays: [
    {
      date: "2026-10-01",
      highC: 20,
      lowC: 10,
      wetDayFrequencyPct: 25,
      precipMm: 2,
      gustKmh: 30,
      sunshineHours: 6,
    },
  ],
};

test("merges refreshed forecasts over the planning baseline without mutating it", () => {
  const forecast = [{ date: "2026-10-01", evidence: "forecast", highC: 22, lowC: 11 }];
  const merged = mergeWeatherDays(location, forecast);
  assert.equal(merged[0].highC, 22);
  assert.equal(location.climateDays[0].highC, 20);
});

test("formats the supported metric and imperial weather units", () => {
  assert.equal(formatTemperature(0, "imperial"), "32°F");
  assert.equal(formatTemperature(20, "metric"), "20°C");
  assert.equal(formatWind(16.0934, "imperial"), "10 mph");
  assert.equal(formatPrecipitation(25.4, "imperial"), "1.0 in");
  assert.equal(formatPrecipitation(2.5, "metric"), "2.5 mm");
});

test("requests only the approved forecast endpoint and keeps past October days out", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let requestedOptions;
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    requestedOptions = options;
    return {
      ok: true,
      json: async () => ({
        daily: {
          time: ["2026-10-01", "2026-10-02"],
          weather_code: [0, 61],
          temperature_2m_max: [20, 21],
          temperature_2m_min: [10, 11],
          precipitation_probability_max: [10, 70],
          precipitation_sum: [0, 5],
          wind_gusts_10m_max: [20, 30],
          sunshine_duration: [21600, 10800],
        },
      }),
    };
  };
  try {
    const result = await fetchLocationForecast(location, { now: new Date("2026-10-02T10:00:00Z") });
    assert.equal(requestedUrl.origin, "https://api.open-meteo.com");
    assert.equal(requestedUrl.pathname, "/v1/forecast");
    assert.equal(requestedUrl.searchParams.get("latitude"), "10.12");
    assert.equal(requestedUrl.searchParams.get("longitude"), "20.68");
    assert.equal(requestedUrl.searchParams.get("forecast_days"), "16");
    assert.equal(requestedOptions.cache, "no-store");
    assert.equal(requestedOptions.credentials, "omit");
    assert.equal(requestedOptions.referrerPolicy, "no-referrer");
    assert.deepEqual(result.map((day) => day.date), ["2026-10-02"]);
    assert.equal(result[0].conditionLabel, "Rain");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects incomplete third-party forecast arrays", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      daily: {
        time: ["2026-10-01"],
        weather_code: [],
      },
    }),
  });
  try {
    await assert.rejects(() => fetchLocationForecast(location, { now: new Date("2026-09-27T10:00:00Z") }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
