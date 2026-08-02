import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowSquareOut,
  Bicycle,
  Clock,
  CompassRose,
  DownloadSimple,
  FlagCheckered,
  Info,
  MapTrifold,
  Mountains,
  Play,
  RoadHorizon,
  X,
} from "@phosphor-icons/react";
import { stages, weekTotals } from "./stageData.js";

const heroDesktopUrl = `${import.meta.env.BASE_URL}assets/hero/mallorca-tramuntana-dreamscape.webp`;
const heroMobileUrl = `${import.meta.env.BASE_URL}assets/hero/mallorca-tramuntana-dreamscape-mobile.webp`;

const tabs = [
  { id: "briefing", label: "Briefing" },
  { id: "route", label: "Route + profile" },
  { id: "climbs", label: "Climbs" },
];

const feetFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function getImperialFootnote(stage) {
  const kilometers = Number.parseFloat(stage.distance.replace(/[^\d.]/g, ""));
  const meters = Number.parseFloat(stage.elevation.replace(/[^\d.]/g, ""));
  const miles = (kilometers * 0.621371).toFixed(1);
  const feet = feetFormatter.format(meters * 3.28084);

  return `≈ ${miles} mi · ${feet} ft climbing`;
}

function getStageFromHash() {
  const match = window.location.hash.match(/^#stage-(\d)$/);
  if (!match) return null;
  return stages.find((stage) => stage.id === Number(match[1])) ?? null;
}

function Metric({ icon: Icon, children }) {
  return (
    <span className="metric">
      <Icon aria-hidden="true" size={17} weight="bold" />
      {children}
    </span>
  );
}

function ExternalLink({ href, children, className = "text-link", download = false }) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      download={download || undefined}
    >
      {children}
      {download ? (
        <DownloadSimple aria-hidden="true" size={18} weight="bold" />
      ) : (
        <ArrowSquareOut aria-hidden="true" size={18} weight="bold" />
      )}
    </a>
  );
}

function StageRow({ stage, onOpen }) {
  const imperialFootnote = getImperialFootnote(stage);

  return (
    <article className="stage-row" id={`stage-row-${stage.id}`}>
      <button
        className="stage-row__trigger"
        type="button"
        onClick={(event) => onOpen(stage, event.currentTarget)}
      >
        <span className="stage-row__timeline" aria-hidden="true">
          <span>{stage.stageNumber}</span>
        </span>
        <span className="stage-row__summary">
          <span className="eyebrow">{stage.date}</span>
          <strong>Stage {stage.stageNumber}</strong>
          <span className="stage-row__title">{stage.title}</span>
          <span className="stage-row__key-fact">
            <span className="stage-row__key-fact-label">Ride key</span>
            <strong>{stage.rideKey}</strong>
          </span>
          <span className="stage-row__metrics">
            {stage.distance} <i aria-hidden="true" /> {stage.elevation} <i aria-hidden="true" /> {stage.duration}
          </span>
          <span className="stage-row__imperial">Imperial · {imperialFootnote}</span>
          <span className={`difficulty difficulty--${stage.difficulty.toLowerCase()}`}>
            {stage.difficulty}
          </span>
        </span>
        <span className="stage-row__map-wrap">
          <img
            src={stage.map}
            alt={`Official route map for Stage ${stage.stageNumber}, ${stage.title}`}
            className="stage-row__map"
          />
        </span>
        <span className="stage-row__profile-wrap">
          <img
            src={stage.profile}
            alt={`Official elevation profile for Stage ${stage.stageNumber}, ${stage.title}`}
            className="stage-row__profile"
          />
          <span className="stage-row__action">
            Explore stage
            <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </span>
        </span>
      </button>
    </article>
  );
}

function BriefingPanel({ stage }) {
  return (
    <div className="detail-grid detail-grid--briefing">
      <div className="detail-copy">
        <span className="eyebrow">The day in one sentence</span>
        <p className="detail-quote">“{stage.briefing}”</p>
      </div>
      <div className="fact-panel">
        <span className="fact-panel__icon">
          <RoadHorizon aria-hidden="true" size={25} weight="duotone" />
        </span>
        <div>
          <span className="eyebrow">Route rhythm</span>
          <p>{stage.routeLine}</p>
        </div>
      </div>
      <div className="fact-panel fact-panel--yellow">
        <span className="fact-panel__icon">
          <Bicycle aria-hidden="true" size={25} weight="duotone" />
        </span>
        <div>
          <span className="eyebrow">Ride it well</span>
          <p>{stage.effort}</p>
        </div>
      </div>
      <div className="detail-actions">
        <ExternalLink href={stage.officialUrl} className="button button--ink">
          Official stage page
        </ExternalLink>
        <ExternalLink href={stage.videoUrl} className="button button--paper">
          <Play aria-hidden="true" size={18} weight="fill" />
          Watch stage film
        </ExternalLink>
      </div>
    </div>
  );
}

function RoutePanel({ stage }) {
  return (
    <div className="route-panel">
      <div className="route-panel__media">
        <figure className="route-figure route-figure--map">
          <img src={stage.map} alt={`Official route map for Stage ${stage.stageNumber}, ${stage.title}`} />
          <figcaption>Official SCCC route map</figcaption>
        </figure>
        <figure className="route-figure route-figure--profile">
          <img src={stage.profile} alt={`Official elevation profile for Stage ${stage.stageNumber}, ${stage.title}`} />
          <figcaption>Official SCCC elevation profile</figcaption>
        </figure>
      </div>

      <div className="source-callout">
        <Info aria-hidden="true" size={22} weight="fill" />
        <div>
          <strong>Use the rider roadbook for navigation</strong>
          <p>
            No exact public SCCC GPX was found. The links below are verified public previews and are
            labeled by how closely they match—not final turn-by-turn files.
          </p>
        </div>
      </div>

      <div className="public-route-list">
        <div className="section-heading section-heading--compact">
          <div>
            <span className="eyebrow">Route files</span>
            <h3>Closest public previews</h3>
          </div>
        </div>
        {stage.publicRoutes.map((route) => (
          <a
            key={route.url}
            className="public-route"
            href={route.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="public-route__provider">{route.provider}</span>
            <span className="public-route__main">
              <strong>{route.label}</strong>
              <span>{route.stats}</span>
            </span>
            <span className="public-route__match">{route.match}</span>
            {route.provider === "Direct GPX" ? (
              <DownloadSimple aria-hidden="true" size={21} weight="bold" />
            ) : (
              <ArrowSquareOut aria-hidden="true" size={21} weight="bold" />
            )}
          </a>
        ))}
      </div>

      <div className="data-note">
        <span className="eyebrow">Published-data note</span>
        <p>{stage.sourceNote}</p>
      </div>
    </div>
  );
}

function ClimbsPanel({ stage }) {
  if (stage.climbs.length === 0) {
    return (
      <div className="recovery-panel">
        <span className="recovery-panel__icon">
          <Bicycle aria-hidden="true" size={42} weight="duotone" />
        </span>
        <span className="eyebrow">Active recovery</span>
        <h3>No major categorized climbs</h3>
        <p>
          The current official stage page keeps this one deliberately light: social group miles,
          coffee and cake at Cycling Planet in Alaró, then a rolling tempo home.
        </p>
      </div>
    );
  }

  return (
    <div className="climbs-panel">
      <div className="climbs-panel__intro">
        <div>
          <span className="eyebrow">Notable climbs</span>
          <h3>{stage.climbs.length} segments to know</h3>
        </div>
        <p>Every Strava button links to the exact segment published on the official SCCC stage page.</p>
      </div>
      <div className="climb-list">
        {stage.climbs.map((climb, index) => (
          <article className="climb-card" key={climb.name}>
            <span className="climb-card__index">{String(index + 1).padStart(2, "0")}</span>
            <div className="climb-card__name">
              <span className="category">{climb.category}</span>
              <h4>{climb.name}</h4>
            </div>
            <div className="climb-card__stat">
              <span>Length</span>
              <strong>{climb.distance}</strong>
            </div>
            <div className="climb-card__stat">
              <span>Average</span>
              <strong>{climb.gradient}</strong>
            </div>
            <ExternalLink href={climb.strava} className="strava-link">
              View on Strava
            </ExternalLink>
          </article>
        ))}
      </div>
    </div>
  );
}

function StageDialog({ stage, onClose }) {
  const [activeTab, setActiveTab] = useState("briefing");
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const imperialFootnote = getImperialFootnote(stage);

  useEffect(() => {
    setActiveTab("briefing");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [stage.id, onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className="stage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-dialog-title"
        ref={dialogRef}
      >
        <header className="stage-dialog__header">
          <div className="stage-dialog__identity">
            <span className="stage-dialog__number">{stage.stageNumber}</span>
            <div>
              <span className="eyebrow">{stage.date} · Stage {stage.stageNumber}</span>
              <h2 id="stage-dialog-title">{stage.title}</h2>
              <span className={`difficulty difficulty--${stage.difficulty.toLowerCase()}`}>
                {stage.difficulty}
              </span>
            </div>
          </div>
          <div className="stage-dialog__metrics" aria-label="Stage metrics">
            <Metric icon={RoadHorizon}>{stage.distance}</Metric>
            <Metric icon={Mountains}>{stage.elevation}</Metric>
            <Metric icon={Clock}>{stage.duration}</Metric>
            <span className="stage-dialog__imperial">Imperial · {imperialFootnote}</span>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close stage details"
            ref={closeRef}
          >
            <X aria-hidden="true" size={25} weight="bold" />
          </button>
        </header>

        <div className="stage-tabs" role="tablist" aria-label="Stage details">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === "climbs" && <span>{stage.climbs.length}</span>}
            </button>
          ))}
        </div>

        <div className="stage-dialog__body">
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === "briefing" && <BriefingPanel stage={stage} />}
            {activeTab === "route" && <RoutePanel stage={stage} />}
            {activeTab === "climbs" && <ClimbsPanel stage={stage} />}
          </div>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [selectedStage, setSelectedStage] = useState(() => getStageFromHash());
  const lastStageTriggerRef = useRef(null);

  useEffect(() => {
    const handleHash = () => setSelectedStage(getStageFromHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const closeDialog = useMemo(
    () => () => {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
      setSelectedStage(null);
      window.requestAnimationFrame(() => lastStageTriggerRef.current?.focus());
    },
    [],
  );

  const openStage = (stage, trigger) => {
    lastStageTriggerRef.current = trigger;
    window.location.hash = `stage-${stage.id}`;
    setSelectedStage(stage);
  };

  return (
    <>
      <div className="app-shell" aria-hidden={selectedStage ? "true" : undefined}>
        <a className="skip-link" href="#stages">
          Skip to stages
        </a>

        <nav className="topbar" aria-label="Primary navigation">
          <a className="wordmark" href="#top" aria-label="Mallorca Route Atlas home">
            <CompassRose aria-hidden="true" size={24} weight="fill" />
            <span>
              <strong>Mallorca</strong>
              <small>Route atlas</small>
            </span>
          </a>
          <div className="topbar__links">
            <a href="#stages">Stages</a>
            <a href="#sources">Sources</a>
          </div>
        </nav>

        <main id="top">
          <header className="masthead">
            <picture className="masthead__visual" aria-hidden="true">
              <source media="(max-width: 720px)" srcSet={heroMobileUrl} />
              <img src={heroDesktopUrl} alt="" />
            </picture>
            <span className="masthead__veil" aria-hidden="true" />

            <div className="masthead__title">
              <span className="kicker">Sa Calobra Cycling Club · Mallorca 2026</span>
              <h1>
                Six rides.
                <span>One unforgettable island.</span>
              </h1>
              <p>
                Maps, profiles, climbs, and every road worth dreaming about—gathered into one
                motivation atlas for the week ahead.
              </p>
              <a className="scroll-cue" href="#stages">
                Explore the stages
                <ArrowDown aria-hidden="true" size={19} weight="bold" />
              </a>
            </div>

            <div className="masthead__meta" aria-label="Camp totals">
              <dl>
                <div>
                  <dt>Distance</dt>
                  <dd>{weekTotals.distance}</dd>
                </div>
                <div>
                  <dt>Climbing</dt>
                  <dd>{weekTotals.elevation}</dd>
                </div>
                <div>
                  <dt>The week</dt>
                  <dd>{weekTotals.rideDays}</dd>
                </div>
              </dl>
            </div>

            <div className="masthead__note">
              <FlagCheckered aria-hidden="true" size={18} weight="fill" />
              <span>17–24 October 2026 · Pollença, Mallorca</span>
            </div>
          </header>

        <section className="stage-atlas-section" id="stages" aria-labelledby="stage-atlas-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Six stages · 18–23 October 2026</span>
              <h2 id="stage-atlas-title">Your week in Mallorca.</h2>
            </div>
            <p>
              Every route map, elevation profile, climb, and verified link travels together. Choose
              a stage to open the full road briefing.
            </p>
          </div>
          <div className="stage-list">
            {stages.map((stage) => (
              <StageRow key={stage.id} stage={stage} onOpen={openStage} />
            ))}
          </div>
        </section>

        <section className="sources-section" id="sources" aria-labelledby="sources-title">
          <div className="sources-section__intro">
            <span className="eyebrow">Source notes</span>
            <h2 id="sources-title">Know the road. Keep the mystery.</h2>
          </div>
          <div className="source-columns">
            <div>
              <MapTrifold aria-hidden="true" size={27} weight="duotone" />
              <h3>Official visual truth</h3>
              <p>Maps, elevation profiles, climb stats, and segment links come from Sa Calobra Cycling Club.</p>
              <ExternalLink href="https://www.sacalobra.cc/favorite-routes/">
                Favorite routes overview
              </ExternalLink>
            </div>
            <div>
              <RoadHorizon aria-hidden="true" size={27} weight="duotone" />
              <h3>Public previews</h3>
              <p>Ride with GPS, Wikiloc, Bikemap, and Cycling UK links are labeled by match quality.</p>
              <a className="text-link" href="#stages">
                Review each stage
                <ArrowRight aria-hidden="true" size={18} weight="bold" />
              </a>
            </div>
            <div>
              <Info aria-hidden="true" size={27} weight="duotone" />
              <h3>Final roadbook</h3>
              <p>SCCC says its rider roadbook is released shortly before camp and is exclusive to riders.</p>
              <ExternalLink href="https://www.sacalobra.cc/news/new-roadbook-40/">
                Read the roadbook note
              </ExternalLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Mallorca Route Atlas · 2026</span>
        <span>Made for the miles ahead.</span>
      </footer>

      </div>
      {selectedStage && <StageDialog stage={selectedStage} onClose={closeDialog} />}
    </>
  );
}
