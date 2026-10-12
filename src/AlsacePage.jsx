import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Buildings,
  CalendarDots,
  CarProfile,
  Clock,
  CompassRose,
  Eye,
  EyeSlash,
  Key,
  ListBullets,
  LockKey,
  MapPin,
  MapTrifold,
  Mountains,
  Path,
  ShieldWarning,
  SignOut,
  Sparkle,
  Umbrella,
  Wine,
  X,
} from "@phosphor-icons/react";
import { decryptPrivateAlsace } from "./alsaceCrypto.js";

const AlsaceMap = lazy(() =>
  import("./AlsaceMap.jsx").then((module) => ({ default: module.AlsaceMap })),
);

const baseUrl = import.meta.env.BASE_URL;
const packingPageUrl = `${baseUrl}packing/`;
const itineraryPageUrl = `${baseUrl}itinerary/`;
const alsacePageUrl = `${baseUrl}alsace/`;
const payloadUrl = `${baseUrl}assets/private/alsace.v1.json`;
const heroUrl = `${baseUrl}assets/alsace/thann-autumn-hero.jpg`;
const idleLockMs = 10 * 60 * 1000;
const hiddenLockMs = 60 * 1000;

const viewItems = [
  { id: "explore", label: "Explore", icon: ListBullets },
  { id: "map", label: "Map", icon: MapTrifold },
  { id: "plans", label: "Day plans", icon: CalendarDots },
];

const categoryIcons = {
  thann: Buildings,
  outdoors: Mountains,
  heritage: CompassRose,
  "food-wine": Wine,
  villages: Path,
  rainy: Umbrella,
};

const statusLabels = {
  open: "Open / self-guided",
  weather: "Weather dependent",
  reserve: "Reserve ahead",
  check: "Check before going",
};

function formatDriveEstimate(place) {
  const miles = (place.driveDistanceKm * 0.621371).toFixed(1);
  return `≈ ${place.driveDistanceKm} km / ${miles} mi · ${place.driveMinutes} min`;
}

function PlacePhoto({ place, className = "alsace-place-card__photo" }) {
  const { photo } = place;
  const isRangenTasting = place.id === "maison-rangen";
  return (
    <span className={className}>
      <img src={`${baseUrl}${photo.asset}`} alt={photo.alt} loading="lazy" decoding="async" />
      {isRangenTasting ? <span className="alsace-place-card__photo-note">Rangen vineyard behind the tasting</span> : null}
      <span className="alsace-place-card__photo-credit">Photo: {photo.credit} · {photo.license} · cropped</span>
    </span>
  );
}

function useAutoLock(isUnlocked, onLock) {
  useEffect(() => {
    if (!isUnlocked) return undefined;
    let idleTimer;
    let hiddenTimer;
    const clearTimers = () => {
      window.clearTimeout(idleTimer);
      window.clearTimeout(hiddenTimer);
    };
    const startIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => onLock("idle"), idleLockMs);
    };
    const handleVisibility = () => {
      window.clearTimeout(hiddenTimer);
      if (document.visibilityState === "hidden") {
        hiddenTimer = window.setTimeout(() => onLock("hidden"), hiddenLockMs);
      } else {
        startIdleTimer();
      }
    };
    const handlePageHide = () => flushSync(() => onLock("pagehide"));
    const handlePageShow = (event) => {
      if (event.persisted) flushSync(() => onLock("pagehide"));
    };

    for (const eventName of ["pointerdown", "keydown", "touchstart", "scroll"]) {
      window.addEventListener(eventName, startIdleTimer, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    handleVisibility();

    return () => {
      clearTimers();
      for (const eventName of ["pointerdown", "keydown", "touchstart", "scroll"]) {
        window.removeEventListener(eventName, startIdleTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [isUnlocked, onLock]);
}

function ExternalLink({ href, children, className = "alsace-text-link" }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowSquareOut aria-hidden="true" size={17} weight="bold" />
    </a>
  );
}

function SiteNav({ current }) {
  return (
    <nav className="topbar alsace-topbar" aria-label="Primary navigation">
      <a className="wordmark" href={baseUrl} aria-label="Mallorca Route Atlas home">
        <CompassRose aria-hidden="true" size={24} weight="fill" />
        <span><strong>Mallorca</strong><small>Route atlas</small></span>
      </a>
      <div className="topbar__links">
        <a href={baseUrl}>Routes</a>
        <a href={packingPageUrl}>Packing</a>
        <a href={itineraryPageUrl}>Trip</a>
        <a href={alsacePageUrl} aria-current={current === "alsace" ? "page" : undefined}>Alsace</a>
      </div>
    </nav>
  );
}

function UnlockCard({ notice, onUnlocked }) {
  const inputRef = useRef(null);
  const attemptRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      attemptRef.current += 1;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    let code = inputRef.current?.value ?? "";
    if (inputRef.current) inputRef.current.value = "";
    if (code.trim().length < 6) {
      code = "";
      setError("That code didn’t unlock the guide. Check it and try again.");
      inputRef.current?.focus();
      return;
    }

    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setIsUnlocking(true);
    try {
      const response = await fetch(payloadUrl, {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Encrypted guide unavailable.");
      const envelope = await response.json();
      const guide = await decryptPrivateAlsace(envelope, code);
      code = "";
      if (attempt === attemptRef.current) onUnlocked(guide);
    } catch {
      code = "";
      if (attempt === attemptRef.current) {
        setError("That code didn’t unlock the guide. Check it and try again.");
        setIsUnlocking(false);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  };

  return (
    <section className="alsace-unlock-card" aria-labelledby="alsace-unlock-title">
      <span className="alsace-unlock-card__icon"><LockKey aria-hidden="true" size={26} weight="duotone" /></span>
      <h2 id="alsace-unlock-title">Unlock the guide</h2>
      <p>Sightseeing notes are kept behind a simple private access screen.</p>
      {notice ? <p className="alsace-unlock-card__notice">{notice}</p> : null}
      <form onSubmit={handleSubmit}>
        <label htmlFor="alsace-code">Access code</label>
        <div className="alsace-code-field">
          <Key aria-hidden="true" size={20} weight="duotone" />
          <input
            ref={inputRef}
            id="alsace-code"
            type={isVisible ? "text" : "password"}
            autoComplete="current-password"
            spellCheck="false"
            disabled={isUnlocking}
          />
          <button
            type="button"
            className="alsace-code-field__toggle"
            aria-label={isVisible ? "Hide access code" : "Show access code"}
            onClick={() => setIsVisible((value) => !value)}
          >
            {isVisible ? <EyeSlash aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
          </button>
        </div>
        {error ? <p className="alsace-unlock-card__error" role="alert">{error}</p> : null}
        <button className="alsace-unlock-card__submit" type="submit" disabled={isUnlocking}>
          {isUnlocking ? "Unlocking…" : "Open guide"}
          {!isUnlocking ? <ArrowRight aria-hidden="true" size={19} weight="bold" /> : null}
        </button>
      </form>
      <p className="alsace-unlock-card__fineprint">
        This is a casual privacy curtain for public travel research. Personal bookings remain in the separate encrypted Trip page.
      </p>
    </section>
  );
}

function CategoryFilters({ categories, selected, onChange, count }) {
  return (
    <div className="alsace-filters" aria-label="Filter places by category">
      <button type="button" className={selected === "all" ? "is-active" : ""} onClick={() => onChange("all")}>
        All <span>{count}</span>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={selected === category.id ? "is-active" : ""}
          onClick={() => onChange(category.id)}
          style={{ "--category-color": category.color }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

function PlaceCard({ place, categories, onOpen, compact = false }) {
  const category = categories.find((item) => item.id === place.categories[0]);
  const Icon = categoryIcons[place.categories[0]] ?? MapPin;
  return (
    <article className={`alsace-place-card${compact ? " alsace-place-card--compact" : ""}`}>
      <button type="button" onClick={() => onOpen(place.id)}>
        {compact ? (
          <span className="alsace-place-card__icon" style={{ "--category-color": category?.color }}>
            <Icon aria-hidden="true" size={25} weight="duotone" />
          </span>
        ) : <PlacePhoto place={place} />}
        <span className="alsace-place-card__body">
          <span className="alsace-place-card__locality"><MapPin aria-hidden="true" size={14} weight="fill" />{place.locality}</span>
          <strong>{place.title}</strong>
          {!compact ? <span className="alsace-place-card__summary">{place.summary}</span> : null}
          <span className="alsace-place-card__meta">
            <span><CarProfile aria-hidden="true" size={16} />{formatDriveEstimate(place)}</span>
            <span><Clock aria-hidden="true" size={16} />{place.duration}</span>
          </span>
        </span>
        <ArrowRight className="alsace-place-card__arrow" aria-hidden="true" size={21} weight="bold" />
      </button>
    </article>
  );
}

function EventCallout({ event, places }) {
  const place = places.find((item) => item.id === event.placeId);
  return (
    <section className="alsace-event" aria-labelledby="alsace-event-title">
      <span className="alsace-event__calendar">
        <CalendarDots aria-hidden="true" size={31} weight="duotone" />
        <small>{event.date}</small>
      </span>
      <div>
        <span className="alsace-event__label">Date-specific find · {statusLabels[event.status]}</span>
        <h2 id="alsace-event-title">{event.title}</h2>
        <p>{event.body}</p>
        <span className="alsace-event__meta">{event.time} · {event.price} · {place?.title}</span>
      </div>
      <ExternalLink href={event.sources[0].url} className="alsace-event__action">Event details</ExternalLink>
    </section>
  );
}

function PlaceDialog({ place, categories, onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
  const placeCategories = categories.filter((category) => place.categories.includes(category.id));
  return (
    <div className="alsace-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="alsace-dialog" role="dialog" aria-modal="true" aria-labelledby="alsace-dialog-title">
        <button ref={closeRef} className="alsace-dialog__close" type="button" onClick={onClose} aria-label="Close place details">
          <X aria-hidden="true" size={22} weight="bold" />
        </button>
        <div className="alsace-dialog__header">
          <span>{place.locality}</span>
          <h2 id="alsace-dialog-title">{place.title}</h2>
          <div className="alsace-dialog__categories">
            {placeCategories.map((category) => <span key={category.id} style={{ "--category-color": category.color }}>{category.label}</span>)}
          </div>
        </div>
        <figure className="alsace-dialog__photo">
          <img src={`${baseUrl}${place.photo.asset}`} alt={place.photo.alt} decoding="async" />
          <figcaption>
            <span className="alsace-dialog__photo-copy">
              {place.id === "maison-rangen" ? <strong>Exact Rangen Grand Cru vineyard—the wines behind this tasting stop. No openly licensed photo of the private tasting space was available.</strong> : null}
              <span>Photo: {place.photo.credit} · {place.photo.license} · cropped</span>
            </span>
            <ExternalLink href={place.photo.sourceUrl} className="alsace-dialog__photo-link">Photo source</ExternalLink>
          </figcaption>
        </figure>
        <p className="alsace-dialog__why">{place.why}</p>
        <dl className="alsace-dialog__facts">
          <div><dt>Drive from your base</dt><dd>{formatDriveEstimate(place)} by car</dd></div>
          <div><dt>Time</dt><dd>{place.duration}</dd></div>
          <div><dt>Effort</dt><dd>{place.effort}</dd></div>
          <div><dt>Best weather</dt><dd>{place.weather}</dd></div>
        </dl>
        <div className={`alsace-dialog__status alsace-dialog__status--${place.status}`}>
          <strong>{statusLabels[place.status]}</strong>
          <p>{place.hoursNote}</p>
        </div>
        <div className="alsace-dialog__actions">
          <ExternalLink href={directionUrl} className="alsace-button alsace-button--primary">
            <MapPin aria-hidden="true" size={18} weight="fill" />Directions
          </ExternalLink>
          {place.sources.map((source) => (
            <ExternalLink key={source.url} href={source.url} className="alsace-button alsace-button--secondary">
              {source.label}
            </ExternalLink>
          ))}
        </div>
      </section>
    </div>
  );
}

function DayPlans({ plans, places, onOpen }) {
  const placeMap = new Map(places.map((place) => [place.id, place]));
  return (
    <div className="alsace-day-plans">
      {plans.map((plan, planIndex) => (
        <article className="alsace-day-plan" key={plan.id}>
          <div className="alsace-day-plan__number">{String(planIndex + 1).padStart(2, "0")}</div>
          <div className="alsace-day-plan__intro">
            <span>{plan.duration} · {plan.condition}</span>
            <h2>{plan.title}</h2>
            <p>{plan.summary}</p>
          </div>
          <ol>
            {plan.stops.map((placeId, stopIndex) => {
              const place = placeMap.get(placeId);
              if (!place) return null;
              return (
                <li key={place.id}>
                  <button type="button" onClick={() => onOpen(place.id)}>
                    <span>{stopIndex + 1}</span>
                    <span><small>{place.locality}</small><strong>{place.title}</strong></span>
                    <ArrowRight aria-hidden="true" size={18} weight="bold" />
                  </button>
                </li>
              );
            })}
          </ol>
        </article>
      ))}
    </div>
  );
}

function Guide({ guide, onLock }) {
  const [activeView, setActiveView] = useState("explore");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const dialogOpenerRef = useRef(null);

  const filteredPlaces = useMemo(
    () => selectedCategory === "all"
      ? guide.places
      : guide.places.filter((place) => place.categories.includes(selectedCategory)),
    [guide.places, selectedCategory],
  );
  const selectedPlace = guide.places.find((place) => place.id === selectedPlaceId) ?? null;
  const openPlace = useCallback((id) => {
    dialogOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedPlaceId(id);
  }, []);
  const closePlace = useCallback(() => {
    setSelectedPlaceId(null);
    window.requestAnimationFrame(() => dialogOpenerRef.current?.focus({ preventScroll: true }));
  }, []);

  const showView = (view) => {
    setActiveView(view);
    setSelectedPlaceId(null);
    window.requestAnimationFrame(() => document.getElementById(`alsace-${view}-panel`)?.scrollIntoView({ block: "start" }));
  };

  const handleViewKeyDown = (event, view) => {
    const currentIndex = viewItems.findIndex((item) => item.id === view);
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % viewItems.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + viewItems.length) % viewItems.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = viewItems.length - 1;
    else return;
    event.preventDefault();
    const nextView = viewItems[nextIndex].id;
    showView(nextView);
    window.requestAnimationFrame(() => document.getElementById(`alsace-${nextView}-tab`)?.focus({ preventScroll: true }));
  };

  return (
    <div className="alsace-guide-page">
      <a className="skip-link" href="#alsace-guide">Skip to guide</a>
      <SiteNav current="alsace" />
      <header className="alsace-hero">
        <img className="alsace-hero__visual" src={heroUrl} alt="Decorative illustrated view of an Alsatian wine town in autumn" />
        <span className="alsace-hero__veil" aria-hidden="true" />
        <div className="alsace-hero__title">
          <h1>{guide.title}</h1>
          <p>{guide.subtitle}</p>
          <a href="#alsace-guide" className="alsace-hero__cue">Open the guide <ArrowDown aria-hidden="true" size={19} weight="bold" /></a>
        </div>
        <div className="alsace-hero__facts" aria-label="Guide summary">
          <span><strong>{guide.places.length}</strong> sourced places</span>
          <span><strong>{guide.dayPlans.length}</strong> ready-made days</span>
          <span><strong>{guide.reviewedOn}</strong> reviewed</span>
        </div>
      </header>

      <main className="alsace-content" id="alsace-guide">
        <div className="alsace-content__topline">
          <p><ShieldWarning aria-hidden="true" size={18} weight="duotone" /> Drive estimates start at your trip base and are rounded without live traffic. Recheck hours and mountain-road access before leaving.</p>
          <button type="button" onClick={() => onLock("manual")}><SignOut aria-hidden="true" size={18} />Lock guide</button>
        </div>

        <EventCallout event={guide.event} places={guide.places} />

        <div className="alsace-view-nav" role="tablist" aria-label="Alsace guide views">
          {viewItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`alsace-${id}-tab`}
              type="button"
              role="tab"
              aria-controls={`alsace-${id}-panel`}
              aria-selected={activeView === id}
              tabIndex={activeView === id ? 0 : -1}
              className={activeView === id ? "is-active" : ""}
              onClick={() => showView(id)}
              onKeyDown={(event) => handleViewKeyDown(event, id)}
            >
              <Icon aria-hidden="true" size={20} weight={activeView === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>

        {activeView === "explore" ? (
          <section id="alsace-explore-panel" className="alsace-view" role="tabpanel" aria-labelledby="alsace-explore-tab">
            <div className="alsace-section-heading">
              <div><h2 id="alsace-explore-title">Places</h2><p>Choose a card for current access notes, official sources, and directions.</p></div>
              <span>{filteredPlaces.length} showing</span>
            </div>
            <CategoryFilters categories={guide.categories} selected={selectedCategory} onChange={setSelectedCategory} count={guide.places.length} />
            <div className="alsace-place-list">
              {filteredPlaces.map((place) => <PlaceCard key={place.id} place={place} categories={guide.categories} onOpen={openPlace} />)}
            </div>
          </section>
        ) : null}

        {activeView === "map" ? (
          <section id="alsace-map-panel" className="alsace-view" role="tabpanel" aria-labelledby="alsace-map-tab">
            <div className="alsace-section-heading">
              <div><h2 id="alsace-map-title">Map</h2><p>Filter the pins, then select a place to connect the map and list.</p></div>
            </div>
            <CategoryFilters categories={guide.categories} selected={selectedCategory} onChange={setSelectedCategory} count={guide.places.length} />
            <div className="alsace-map-layout">
              <div className="alsace-map-frame">
                <Suspense fallback={<div className="alsace-map alsace-map--loading" aria-busy="true">Loading map…</div>}>
                  <AlsaceMap
                    base={guide.base}
                    places={filteredPlaces}
                    categories={guide.categories}
                    selectedId={selectedPlaceId}
                    onSelect={openPlace}
                  />
                </Suspense>
                <p className="alsace-map-disclosure">Map view loads OpenStreetMap tiles and shares your IP, this page’s origin, and the viewed area with that provider. No booking data is sent.</p>
              </div>
              <div className="alsace-map-list" aria-label="Places on map">
                {filteredPlaces.map((place) => <PlaceCard key={place.id} place={place} categories={guide.categories} onOpen={openPlace} compact />)}
              </div>
            </div>
          </section>
        ) : null}

        {activeView === "plans" ? (
          <section id="alsace-plans-panel" className="alsace-view" role="tabpanel" aria-labelledby="alsace-plans-tab">
            <div className="alsace-section-heading">
              <div><h2 id="alsace-plans-title">Day plans</h2><p>Four combinations organized by time and weather—not bookings or a fixed itinerary.</p></div>
            </div>
            <DayPlans plans={guide.dayPlans} places={guide.places} onOpen={openPlace} />
          </section>
        ) : null}
      </main>

      <footer className="alsace-footer">
        <span>Source-backed place research · reviewed {guide.reviewedOn}</span>
        <span>Map data © OpenStreetMap contributors</span>
      </footer>

      <nav className="alsace-mobile-nav" aria-label="Alsace guide views">
        {viewItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeView === id} className={activeView === id ? "is-active" : ""} onClick={() => showView(id)}>
            <Icon aria-hidden="true" size={23} weight={activeView === id ? "fill" : "regular"} />
            {label}
          </button>
        ))}
      </nav>

      {selectedPlace ? <PlaceDialog place={selectedPlace} categories={guide.categories} onClose={closePlace} /> : null}
    </div>
  );
}

export function AlsacePage() {
  const [guide, setGuide] = useState(null);
  const [notice, setNotice] = useState("");

  const lock = useCallback((reason) => {
    setGuide(null);
    if (reason === "idle") setNotice("The guide locked after 10 minutes of inactivity.");
    else if (reason === "hidden") setNotice("The guide locked while this tab was in the background.");
    else setNotice("");
  }, []);
  useAutoLock(Boolean(guide), lock);

  if (guide) return <Guide guide={guide} onLock={lock} />;

  return (
    <div className="alsace-lock-page">
      <a className="skip-link" href="#alsace-unlock">Skip to unlock</a>
      <SiteNav current="alsace" />
      <main className="alsace-lock-hero" id="alsace-unlock">
        <img className="alsace-lock-hero__visual" src={heroUrl} alt="Decorative illustrated view of an Alsatian wine town in autumn" />
        <span className="alsace-lock-hero__veil" aria-hidden="true" />
        <div className="alsace-lock-hero__copy">
          <span><Sparkle aria-hidden="true" size={18} weight="fill" />Private field guide</span>
          <h1>Alsace guide</h1>
          <p>A map and source-backed ideas for exploring around the southern Vosges.</p>
          <a href={baseUrl}><ArrowLeft aria-hidden="true" size={18} weight="bold" />Route atlas</a>
        </div>
        <UnlockCard notice={notice} onUnlocked={(value) => { setNotice(""); setGuide(value); }} />
      </main>
    </div>
  );
}
