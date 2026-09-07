import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AirplaneTakeoff,
  ArrowLeft,
  Bed,
  CalendarBlank,
  CarProfile,
  CheckCircle,
  CompassRose,
  Eye,
  EyeSlash,
  Info,
  Key,
  LockKey,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { decryptPrivateItinerary } from "./privateItineraryCrypto.js";

const baseUrl = import.meta.env.BASE_URL;
const packingPageUrl = `${baseUrl}packing/`;
const itineraryPageUrl = `${baseUrl}itinerary/`;
const payloadUrl = `${baseUrl}assets/private/payload.v1.json`;
const heroDesktopUrl = `${baseUrl}assets/hero/mallorca-tramuntana-dreamscape.webp`;
const heroMobileUrl = `${baseUrl}assets/hero/mallorca-tramuntana-dreamscape-mobile.webp`;
const idleLockMs = 5 * 60 * 1000;
const hiddenLockMs = 60 * 1000;

const kindIcons = {
  flight: AirplaneTakeoff,
  car: CarProfile,
};

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

function UnlockCard({ onUnlocked, notice }) {
  const inputRef = useRef(null);
  const unlockAttemptRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const cancelPendingUnlock = () => {
      if (document.visibilityState === "hidden") {
        unlockAttemptRef.current += 1;
        if (inputRef.current) inputRef.current.value = "";
        setIsVisible(false);
        setIsUnlocking(false);
      }
    };
    const cancelOnPageHide = () => {
      unlockAttemptRef.current += 1;
      if (inputRef.current) inputRef.current.value = "";
      flushSync(() => {
        setIsVisible(false);
        setIsUnlocking(false);
      });
    };
    const resetOnPageShow = () => {
      if (inputRef.current) inputRef.current.value = "";
      setIsVisible(false);
      setIsUnlocking(false);
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };
    document.addEventListener("visibilitychange", cancelPendingUnlock);
    window.addEventListener("pagehide", cancelOnPageHide);
    window.addEventListener("pageshow", resetOnPageShow);
    return () => {
      unlockAttemptRef.current += 1;
      document.removeEventListener("visibilitychange", cancelPendingUnlock);
      window.removeEventListener("pagehide", cancelOnPageHide);
      window.removeEventListener("pageshow", resetOnPageShow);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    let privateCode = inputRef.current?.value ?? "";
    if (inputRef.current) inputRef.current.value = "";
    if (privateCode.trim().length < 20) {
      privateCode = "";
      setError("That code didn’t unlock this brief. Check it and try again.");
      inputRef.current?.focus();
      return;
    }

    const attempt = unlockAttemptRef.current + 1;
    unlockAttemptRef.current = attempt;
    setIsUnlocking(true);
    try {
      let envelope;
      try {
        const response = await fetch(payloadUrl, {
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) throw new Error("Encrypted brief unavailable.");
        envelope = await response.json();
      } catch {
        privateCode = "";
        if (attempt === unlockAttemptRef.current) {
          setError("The encrypted brief is unavailable. Check your connection and try again.");
          window.requestAnimationFrame(() => inputRef.current?.focus());
        }
        return;
      }
      const itinerary = await decryptPrivateItinerary(envelope, privateCode);
      privateCode = "";
      if (attempt !== unlockAttemptRef.current || document.visibilityState === "hidden") return;
      onUnlocked(itinerary);
    } catch {
      privateCode = "";
      if (attempt === unlockAttemptRef.current) {
        setError("That code didn’t unlock this brief. Check it and try again.");
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    } finally {
      if (attempt === unlockAttemptRef.current) setIsUnlocking(false);
    }
  };

  return (
    <section className="itinerary-unlock" aria-labelledby="unlock-title">
      <div className="itinerary-unlock__seal" aria-hidden="true">
        <LockKey size={33} weight="duotone" />
      </div>
      <span className="eyebrow">Encrypted travel brief</span>
      <h2 id="unlock-title">Your plans stay under wraps.</h2>
      <p>
        Enter the private code to decrypt the itinerary on this device. The readable details and
        your code are never stored by this site.
      </p>

      <form className="itinerary-unlock__form" onSubmit={handleSubmit}>
        <label htmlFor="private-itinerary-code">Private code</label>
        <div className="itinerary-unlock__field">
          <Key aria-hidden="true" size={20} weight="duotone" />
          <input
            id="private-itinerary-code"
            ref={inputRef}
            type={isVisible ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            inputMode="text"
            aria-describedby="private-code-help private-code-error"
          />
          <button
            type="button"
            className="itinerary-unlock__reveal"
            onClick={() => setIsVisible((current) => !current)}
            aria-label={isVisible ? "Hide private code" : "Show private code"}
          >
            {isVisible ? <EyeSlash aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
          </button>
        </div>
        <small id="private-code-help">Use the exact code, including its dashes.</small>
        <div className="itinerary-unlock__feedback" id="private-code-error" aria-live="polite">
          {error || notice}
        </div>
        <button className="itinerary-unlock__button" type="submit" disabled={isUnlocking}>
          <LockKey aria-hidden="true" size={19} weight="fill" />
          {isUnlocking ? "Decrypting…" : "Open private brief"}
        </button>
      </form>

      <details className="itinerary-privacy-note">
        <summary>How this protects the page</summary>
        <p>
          GitHub Pages is public, so the deployed file is encrypted with AES-GCM rather than hidden
          behind a pretend login. Anyone can download the ciphertext, which is why the strong,
          one-of-a-kind code matters. For identity-only access and account recovery, this page would
          need to move behind authenticated hosting.
        </p>
      </details>
    </section>
  );
}

function AlertCard({ alert }) {
  return (
    <article className={`itinerary-alert itinerary-alert--${alert.level}`}>
      <WarningCircle aria-hidden="true" size={25} weight="fill" />
      <div>
        <span className="itinerary-alert__level">
          {alert.level === "urgent" ? "Timing conflict" : alert.level === "missing" ? "Missing" : "Check this"}
        </span>
        <h3>{alert.title}</h3>
        <p>{alert.body}</p>
        <strong>{alert.action}</strong>
      </div>
    </article>
  );
}

function JourneyCard({ item, index }) {
  const Icon = kindIcons[item.kind] ?? CalendarBlank;
  return (
    <article className="itinerary-leg">
      <div className="itinerary-leg__rail" aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="itinerary-leg__body">
        <header className="itinerary-leg__header">
          <span className="itinerary-leg__icon"><Icon aria-hidden="true" size={25} weight="duotone" /></span>
          <div>
            <span className="eyebrow">{item.date} · {item.eyebrow}</span>
            <h3>{item.title}</h3>
          </div>
          <span className="itinerary-status"><CheckCircle aria-hidden="true" size={16} weight="fill" />{item.status}</span>
        </header>
        <div className="itinerary-leg__route">{item.route}</div>
        <div className="itinerary-schedule">
          {item.schedule.map((stop) => (
            <div key={`${item.id}-${stop.time}-${stop.label}`}>
              <time>{stop.time}</time>
              <strong>{stop.label}</strong>
              <span>{stop.detail}</span>
            </div>
          ))}
        </div>
        {item.facts.length > 0 && (
          <dl className="itinerary-facts">
            {item.facts.map((fact) => (
              <div key={`${item.id}-${fact.label}`}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {item.note && <p className="itinerary-leg__note"><Info aria-hidden="true" size={17} weight="fill" />{item.note}</p>}
      </div>
    </article>
  );
}

function StayCard({ stay }) {
  return (
    <article className={`itinerary-stay itinerary-stay--${stay.status}`}>
      <Bed aria-hidden="true" size={27} weight="duotone" />
      <div>
        <span className="eyebrow">{stay.date}</span>
        <h3>{stay.title}</h3>
        <strong>{stay.place}</strong>
        <p>{stay.details}</p>
      </div>
      <span className="itinerary-stay__status">{stay.status}</span>
    </article>
  );
}

function BookingWallet({ items }) {
  const [revealed, setRevealed] = useState(() => new Set());
  const toggle = (index) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="itinerary-wallet__grid">
      {items.map((item, index) => {
        const isRevealed = revealed.has(index);
        return (
          <article key={item.label} className="itinerary-wallet__card">
            <span className="eyebrow">{item.label}</span>
            <strong id={`booking-wallet-value-${index}`} aria-live="polite">
              {isRevealed ? item.value : "••••••••••"}
            </strong>
            <p>{item.note}</p>
            <button
              type="button"
              aria-controls={`booking-wallet-value-${index}`}
              aria-label={`${isRevealed ? "Conceal" : "Reveal"} ${item.label}`}
              onClick={() => toggle(index)}
            >
              {isRevealed ? <EyeSlash aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
              {isRevealed ? "Conceal" : "Reveal"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function ItineraryBrief({ itinerary, onLock }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <article className="itinerary-brief" aria-labelledby="itinerary-title">
      <header className="itinerary-brief__header">
        <div>
          <span className="eyebrow">Private travel brief · checked {itinerary.reviewedOn}</span>
          <h2 id="itinerary-title" ref={headingRef} tabIndex="-1">{itinerary.headline}</h2>
          <p>{itinerary.timeNote}</p>
        </div>
        <button type="button" className="itinerary-lock-button" onClick={() => onLock("manual")}>
          <LockKey aria-hidden="true" size={19} weight="fill" />
          Lock now
        </button>
      </header>

      <section className="itinerary-section itinerary-section--alerts" aria-labelledby="alerts-title">
        <div className="itinerary-section__heading">
          <div>
            <span className="eyebrow">Read this first</span>
            <h2 id="alerts-title">
              {itinerary.alerts.length === 0
                ? "No details need your attention."
                : `${itinerary.alerts.length} detail${itinerary.alerts.length === 1 ? "" : "s"} need${itinerary.alerts.length === 1 ? "s" : ""} your attention.`}
            </h2>
          </div>
          <p>These are evidence conflicts or missing confirmations—not guesses about what might happen.</p>
        </div>
        <div className="itinerary-alerts">
          {itinerary.alerts.map((alert) => <AlertCard key={alert.title} alert={alert} />)}
        </div>
      </section>

      <section className="itinerary-section" aria-labelledby="journey-title">
        <div className="itinerary-section__heading">
          <div>
            <span className="eyebrow">The journey</span>
            <h2 id="journey-title">Door to island, in order.</h2>
          </div>
          <p>Confirmed times and allowances come from the supplied booking PDFs.</p>
        </div>
        <div className="itinerary-journey">
          {itinerary.journey.map((item, index) => <JourneyCard key={item.id} item={item} index={index} />)}
        </div>
      </section>

      <section className="itinerary-section" aria-labelledby="stays-title">
        <div className="itinerary-section__heading">
          <div>
            <span className="eyebrow">Where you sleep</span>
            <h2 id="stays-title">Stays, without the wishful thinking.</h2>
          </div>
          <p>Only confirmed or explicitly included lodging belongs here.</p>
        </div>
        <div className="itinerary-stays">
          {itinerary.stays.map((stay) => <StayCard key={`${stay.date}-${stay.title}`} stay={stay} />)}
        </div>
      </section>

      <section className="itinerary-section itinerary-wallet" aria-labelledby="wallet-title">
        <div className="itinerary-section__heading">
          <div>
            <span className="eyebrow">Booking wallet</span>
            <h2 id="wallet-title">References, one tap away.</h2>
          </div>
          <p>Values stay concealed until you choose to reveal them. No copy or download shortcut is provided.</p>
        </div>
        <BookingWallet items={itinerary.wallet} />
      </section>

      <section className="itinerary-section itinerary-missing" aria-labelledby="missing-title">
        <div className="itinerary-missing__icon"><CalendarBlank aria-hidden="true" size={30} weight="duotone" /></div>
        <div>
          <span className="eyebrow">Still to collect</span>
          <h2 id="missing-title">Your travel folder is not complete yet.</h2>
          <ul>
            {itinerary.missing.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
    </article>
  );
}

export function PrivateItineraryPage() {
  const [itinerary, setItinerary] = useState(null);
  const [notice, setNotice] = useState("");

  const lock = useCallback((reason) => {
    setItinerary(null);
    if (reason === "idle" || reason === "hidden") setNotice("Locked automatically to protect your details.");
    else setNotice("");
  }, []);

  useAutoLock(Boolean(itinerary), lock);

  const unlock = (value) => {
    setNotice("");
    setItinerary(value);
  };

  return (
    <div className="itinerary-page">
      <a className="skip-link" href="#private-brief">Skip to private brief</a>

      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href={baseUrl} aria-label="Mallorca Route Atlas home">
          <CompassRose aria-hidden="true" size={24} weight="fill" />
          <span><strong>Mallorca</strong><small>Route atlas</small></span>
        </a>
        <div className="topbar__links">
          <a href={baseUrl}>Routes</a>
          <a href={packingPageUrl}>Packing</a>
          <a href={itineraryPageUrl} aria-current="page">Trip</a>
          <a href={`${baseUrl}#sources`}>Sources</a>
        </div>
      </nav>

      <header className="itinerary-hero">
        <picture className="itinerary-hero__visual" aria-hidden="true">
          <source media="(max-width: 720px)" srcSet={heroMobileUrl} />
          <img src={heroDesktopUrl} alt="" />
        </picture>
        <span className="itinerary-hero__veil" aria-hidden="true" />
        <div className="itinerary-hero__title">
          <span className="kicker">Private trip space</span>
          <h1>A little privacy, <span>please.</span></h1>
          <p>Your personal bookings are encrypted before they reach this public website.</p>
          <a className="itinerary-hero__back" href={baseUrl}>
            <ArrowLeft aria-hidden="true" size={18} weight="bold" />
            Route atlas
          </a>
        </div>
        <div className="itinerary-hero__assurances" aria-label="Privacy behavior">
          <div><ShieldCheck aria-hidden="true" size={20} weight="duotone" /><span><small>Protection</small>AES-256-GCM</span></div>
          <div><LockKey aria-hidden="true" size={20} weight="duotone" /><span><small>Storage</small>Memory only</span></div>
          <div><CalendarBlank aria-hidden="true" size={20} weight="duotone" /><span><small>Auto-lock</small>5 minutes</span></div>
        </div>
      </header>

      <main className="itinerary-main" id="private-brief">
        {itinerary ? <ItineraryBrief itinerary={itinerary} onLock={lock} /> : <UnlockCard onUnlocked={unlock} notice={notice} />}
      </main>

      <footer className="itinerary-footer">
        <span>Mallorca Route Atlas · private trip space</span>
        <span>Nothing readable is stored in the public build.</span>
      </footer>
    </div>
  );
}
