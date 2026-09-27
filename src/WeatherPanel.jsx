import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CalendarBlank,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Drop,
  MapPin,
  Snowflake,
  Sun,
  Wind,
} from "@phosphor-icons/react";
import {
  fetchLocationForecast,
  formatPrecipitation,
  formatTemperature,
  formatWind,
  mergeWeatherDays,
  toFahrenheit,
} from "./privateWeather.js";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const CONDITION_ICONS = {
  sun: Sun,
  "partly-cloudy": Cloud,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
  typical: CalendarBlank,
  unavailable: Cloud,
};

const EVIDENCE_LABELS = {
  forecast: "Forecast",
  extended: "Extended forecast",
  typical: "Typical · 1991–2020",
  unavailable: "Unavailable",
};

function dateIndex(date) {
  return Number(date.slice(-2)) - 1;
}

function linePath(days, field, xScale, yScale) {
  return days.map((day, index) => `${index === 0 ? "M" : "L"}${xScale(dateIndex(day.date)).toFixed(2)},${yScale(day[field]).toFixed(2)}`).join(" ");
}

function areaPath(days, xScale, yScale) {
  const high = days.map((day, index) => `${index === 0 ? "M" : "L"}${xScale(dateIndex(day.date)).toFixed(2)},${yScale(day.highC).toFixed(2)}`).join(" ");
  const low = [...days].reverse().map((day) => `L${xScale(dateIndex(day.date)).toFixed(2)},${yScale(day.lowC).toFixed(2)}`).join(" ");
  return `${high} ${low} Z`;
}

function contiguousEvidenceGroups(days) {
  return days.reduce((groups, day) => {
    const last = groups.at(-1);
    if (!last || last[0].evidence !== day.evidence) groups.push([day]);
    else last.push(day);
    return groups;
  }, []);
}

function WeatherMonthChart({ days, location, unit }) {
  const width = 720;
  const height = 306;
  const left = 46;
  const right = 696;
  const plotTop = 24;
  const plotBottom = 184;
  const rainTop = 226;
  const rainBottom = 282;
  const temperatures = days.flatMap((day) => [day.lowC, day.highC]).filter(Number.isFinite);
  const convert = unit === "imperial" ? toFahrenheit : (value) => value;
  const converted = temperatures.map(convert);
  const minimum = Math.floor(Math.min(...converted) / 5) * 5 - 5;
  const maximum = Math.ceil(Math.max(...converted) / 5) * 5 + 5;
  const xScale = (index) => left + (index / 30) * (right - left);
  const yScale = (value) => plotBottom - ((convert(value) - minimum) / (maximum - minimum)) * (plotBottom - plotTop);
  const groups = contiguousEvidenceGroups(days);
  const tripStart = dateIndex(location.tripStart);
  const tripEnd = dateIndex(location.tripEnd);
  const tripX = xScale(tripStart) - 5;
  const tripWidth = xScale(tripEnd) - xScale(tripStart) + 10;
  const tickDays = [1, 8, 15, 22, 29, 31];
  const scaleTicks = [minimum, Math.round((minimum + maximum) / 2), maximum];

  return (
    <figure className="weather-chart">
      <figcaption>
        <strong>Daily high & low</strong>
        <span>Rain bars show forecast probability or historical wet-day frequency.</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="weather-chart-title weather-chart-description">
        <title id="weather-chart-title">October temperatures and precipitation pattern for {location.label}</title>
        <desc id="weather-chart-description">
          High and low temperature lines for October 1 through 31, with forecast days separated from 1991 to 2020 typical values. The full values are listed below the chart.
        </desc>
        <rect className="weather-chart__trip" x={tripX} y="12" width={tripWidth} height="277" rx="8" />
        <text className="weather-chart__trip-label" x={tripX + 5} y="20">Trip</text>
        {scaleTicks.map((tick) => {
          const y = plotBottom - ((tick - minimum) / (maximum - minimum)) * (plotBottom - plotTop);
          return (
            <g key={tick}>
              <line className="weather-chart__grid" x1={left} x2={right} y1={y} y2={y} />
              <text className="weather-chart__axis" x={left - 8} y={y + 4} textAnchor="end">{tick}°{unit === "imperial" ? "F" : "C"}</text>
            </g>
          );
        })}
        {groups.map((group) => (
          <g className={`weather-chart__series weather-chart__series--${group[0].evidence}`} key={`${group[0].evidence}-${group[0].date}`}>
            <path className="weather-chart__range" d={areaPath(group, xScale, yScale)} />
            <path className="weather-chart__line weather-chart__line--high" d={linePath(group, "highC", xScale, yScale)} />
            <path className="weather-chart__line weather-chart__line--low" d={linePath(group, "lowC", xScale, yScale)} />
          </g>
        ))}
        <text className="weather-chart__label weather-chart__label--high" x={right} y={plotTop + 4} textAnchor="end">High</text>
        <text className="weather-chart__label weather-chart__label--low" x={right} y={plotBottom - 8} textAnchor="end">Low</text>
        <text className="weather-chart__rain-title" x={left} y={rainTop - 10}>RAIN / WET-DAY %</text>
        {days.map((day) => {
          const value = day.evidence === "typical" ? day.wetDayFrequencyPct : day.precipProbabilityPct;
          const barHeight = Number.isFinite(value) ? Math.max(1.5, value / 100 * (rainBottom - rainTop)) : 0;
          return (
            <rect
              className={`weather-chart__bar weather-chart__bar--${day.evidence}`}
              key={`rain-${day.date}`}
              x={xScale(dateIndex(day.date)) - 4}
              y={rainBottom - barHeight}
              width="8"
              height={barHeight}
              rx="2"
            />
          );
        })}
        {tickDays.map((dayNumber) => (
          <g key={dayNumber}>
            <line className="weather-chart__tick" x1={xScale(dayNumber - 1)} x2={xScale(dayNumber - 1)} y1={rainBottom} y2={rainBottom + 5} />
            <text className="weather-chart__axis" x={xScale(dayNumber - 1)} y={height - 7} textAnchor="middle">{dayNumber}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function WeatherDay({ day, unit, isTripDay }) {
  const Icon = CONDITION_ICONS[day.conditionIcon] ?? Cloud;
  const precipitationLabel = day.evidence === "typical"
    ? `${Math.round(day.wetDayFrequencyPct)}% wet days · ${formatPrecipitation(day.precipMm, unit)} average`
    : `${Number.isFinite(day.precipProbabilityPct) ? `${Math.round(day.precipProbabilityPct)}%` : "—"} · ${formatPrecipitation(day.precipMm, unit)}`;
  return (
    <li className={`weather-day${isTripDay ? " weather-day--trip" : ""}`}>
      <article>
        <div className="weather-day__date">
          <time dateTime={day.date}>{DATE_FORMATTER.format(new Date(`${day.date}T12:00:00Z`))}</time>
          {isTripDay ? <span>On trip</span> : null}
        </div>
        <div className="weather-day__condition">
          <Icon aria-hidden="true" size={24} weight="duotone" />
          <div>
            <strong>{day.conditionLabel}</strong>
            <span className={`weather-evidence weather-evidence--${day.evidence}`}>{EVIDENCE_LABELS[day.evidence]}</span>
          </div>
        </div>
        <dl className="weather-day__metrics">
          <div>
            <dt>High / low</dt>
            <dd>{formatTemperature(day.highC, unit)} / {formatTemperature(day.lowC, unit)}</dd>
          </div>
          <div>
            <dt><Drop aria-hidden="true" size={14} />{day.evidence === "typical" ? "Wet-day pattern" : "Rain"}</dt>
            <dd>{precipitationLabel}</dd>
          </div>
          <div>
            <dt><Wind aria-hidden="true" size={14} />Max gust</dt>
            <dd>{formatWind(day.gustKmh, unit)}</dd>
          </div>
          <div>
            <dt><Sun aria-hidden="true" size={14} />Sunshine</dt>
            <dd>{Number.isFinite(day.sunshineHours) ? `${day.sunshineHours.toFixed(1)} h` : "—"}</dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

export function WeatherPanel({ weather }) {
  const [selectedId, setSelectedId] = useState(weather.locations[0].id);
  const [unit, setUnit] = useState("metric");
  const [forecasts, setForecasts] = useState({});
  const requestRef = useRef(null);
  const selected = weather.locations.find((location) => location.id === selectedId) ?? weather.locations[0];
  const request = forecasts[selected.id];
  const days = useMemo(
    () => mergeWeatherDays(selected, request?.days),
    [request?.days, selected],
  );

  useEffect(() => () => {
    const activeRequest = requestRef.current;
    requestRef.current = null;
    activeRequest?.controller.abort();
  }, []);

  const refresh = async () => {
    requestRef.current?.controller.abort();
    const controller = new AbortController();
    requestRef.current = { controller, locationId: selected.id };
    setForecasts((current) => ({
      ...current,
      [selected.id]: { ...current[selected.id], status: "loading", error: "" },
    }));
    try {
      const nextDays = await fetchLocationForecast(selected, { signal: controller.signal });
      const loadedAt = new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: selected.timezone,
      }).format(new Date());
      setForecasts((current) => ({
        ...current,
        [selected.id]: { status: "ready", days: nextDays, loadedAt, error: "" },
      }));
    } catch (error) {
      if (error.name === "AbortError") return;
      setForecasts((current) => ({
        ...current,
        [selected.id]: {
          ...current[selected.id],
          status: "error",
          error: "Live forecast unavailable. The 1991–2020 planning baseline is still shown.",
        },
      }));
    } finally {
      if (requestRef.current?.controller === controller) requestRef.current = null;
    }
  };

  const selectLocation = (id) => {
    const activeRequest = requestRef.current;
    if (activeRequest) {
      requestRef.current = null;
      activeRequest.controller.abort();
      setForecasts((current) => {
        const previous = current[activeRequest.locationId];
        if (previous?.status !== "loading") return current;
        return {
          ...current,
          [activeRequest.locationId]: {
            ...previous,
            status: previous.days ? "ready" : "idle",
          },
        };
      });
    }
    setSelectedId(id);
  };

  return (
    <section className="weather-panel" aria-labelledby="weather-panel-title">
      <div className="weather-panel__controls">
        <div className="weather-location-control">
          <span className="weather-control-label">Location</span>
          <div className="weather-location-tabs" role="group" aria-label="Trip weather locations">
            {weather.locations.map((location) => (
              <button
                type="button"
                aria-pressed={location.id === selected.id}
                key={location.id}
                onClick={() => selectLocation(location.id)}
              >
                {location.label}
              </button>
            ))}
          </div>
          <select
            className="weather-location-select"
            aria-label="Trip weather location"
            value={selected.id}
            onChange={(event) => selectLocation(event.target.value)}
          >
            {weather.locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </select>
        </div>
        <div className="weather-unit-control">
          <span className="weather-control-label">Units</span>
          <div role="group" aria-label="Weather units">
            <button type="button" aria-pressed={unit === "metric"} onClick={() => setUnit("metric")}>Metric</button>
            <button type="button" aria-pressed={unit === "imperial"} onClick={() => setUnit("imperial")}>Imperial</button>
          </div>
        </div>
      </div>

      <div className="weather-panel__location-heading">
        <div>
          <span className="eyebrow"><MapPin aria-hidden="true" size={15} weight="fill" />{selected.region}</span>
          <h2 id="weather-panel-title">{selected.label}</h2>
          <p>Local dates · {selected.timezone.replace("_", " ")}</p>
        </div>
        <div className="weather-refresh">
          <button type="button" onClick={refresh} disabled={request?.status === "loading"}>
            <ArrowClockwise aria-hidden="true" size={18} weight="bold" />
            {request?.status === "loading" ? "Refreshing…" : "Refresh forecast"}
          </button>
          <span aria-live="polite">{request?.loadedAt ? `Updated ${request.loadedAt}` : "Planning averages shown until you refresh."}</span>
        </div>
      </div>

      <div className="weather-privacy-callout">
        <strong>Private by default.</strong> Refreshing lets Open-Meteo receive city-scale coordinates and your IP address; it does not send booking details. Open-Meteo says technical logs may be retained for up to 90 days. Past days stay on the planning baseline; refresh updates today forward.
      </div>
      {request?.error ? <p className="weather-error" role="alert">{request.error}</p> : null}

      <div className="weather-evidence-key" aria-label="Weather evidence key">
        <span><i aria-hidden="true" className="weather-evidence-dot weather-evidence-dot--forecast" />Forecast · next 7 days</span>
        <span><i aria-hidden="true" className="weather-evidence-dot weather-evidence-dot--extended" />Extended · days 8–16</span>
        <span><i aria-hidden="true" className="weather-evidence-dot weather-evidence-dot--typical" />Typical · 1991–2020, not a forecast</span>
      </div>

      <WeatherMonthChart days={days} location={selected} unit={unit} />

      <section className="weather-days" aria-labelledby="weather-days-title">
        <div className="weather-days__heading">
          <h3 id="weather-days-title">Every day in October</h3>
          <p>Trip dates are highlighted. Forecast values replace the planning baseline only after a refresh.</p>
        </div>
        <ol>
          {days.map((day) => (
            <WeatherDay
              day={day}
              unit={unit}
              isTripDay={day.date >= selected.tripStart && day.date <= selected.tripEnd}
              key={day.date}
            />
          ))}
        </ol>
      </section>

      <footer className="weather-sources">
        <p>
          <strong>What “typical” means:</strong> {weather.climate.method} It is a reanalysis planning baseline, not an official station normal or a 2026 forecast.
        </p>
        <p>
          <a href={weather.forecast.sourceUrl} rel="noreferrer">Forecast methodology</a>
          <span aria-hidden="true"> · </span>
          <a href={weather.climate.sourceUrl} rel="noreferrer">Historical methodology</a>
          <span aria-hidden="true"> · </span>
          <a href={weather.forecast.privacyUrl} rel="noreferrer">Provider terms & privacy</a>
          <span aria-hidden="true"> · </span>
          <a href={weather.forecast.licenceUrl} rel="noreferrer">{weather.forecast.licenceLabel}</a>
        </p>
        <small>Weather data by Open-Meteo · baseline prepared {weather.generatedOn} · transformations and unit conversions by Mallorca Route Atlas.</small>
      </footer>
    </section>
  );
}
