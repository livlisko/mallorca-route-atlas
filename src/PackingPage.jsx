import { useEffect, useState } from "react";
import {
  Airplane,
  ArrowDown,
  ArrowLeft,
  ArrowSquareOut,
  Backpack,
  Bicycle,
  CheckCircle,
  ClipboardText,
  CloudRain,
  CompassRose,
  FirstAid,
  ForkKnife,
  Heartbeat,
  HouseLine,
  IdentificationCard,
  Info,
  Printer,
  Sneaker,
  SuitcaseRolling,
  TShirt,
  Trash,
  WashingMachine,
  Wind,
} from "@phosphor-icons/react";
import {
  cabinEssentials,
  packingGroups,
  prepSteps,
  providedGroups,
  sourceCheckedDate,
  sourceLinks,
} from "./packingData.js";

const storageKey = "mallorca-route-atlas-packing-v1";
const baseUrl = import.meta.env.BASE_URL;
const heroDesktopUrl = `${baseUrl}assets/hero/mallorca-tramuntana-dreamscape.webp`;
const heroMobileUrl = `${baseUrl}assets/hero/mallorca-tramuntana-dreamscape-mobile.webp`;
const itineraryPageUrl = `${baseUrl}itinerary/`;
const packingItemIds = packingGroups.flatMap((group) => group.items.map((item) => item.id));
const prepItemIds = prepSteps.map((step) => step.id);

const icons = {
  bike: Bicycle,
  layers: Wind,
  "off-bike": TShirt,
  travel: SuitcaseRolling,
  pedals: Bicycle,
  shoes: Sneaker,
  saddle: Bicycle,
  personal: IdentificationCard,
  support: FirstAid,
  recovery: Heartbeat,
  villa: HouseLine,
};

function readSavedChecks() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return new Set(value ? JSON.parse(value) : []);
  } catch {
    return new Set();
  }
}

function ChecklistItem({ item, checked, onToggle }) {
  return (
    <label className={`packing-item${checked ? " is-checked" : ""}`} htmlFor={`pack-${item.id}`}>
      <input
        id={`pack-${item.id}`}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
      />
      <span className="packing-item__copy">
        <strong>{item.label}</strong>
        <span>{item.note}</span>
      </span>
      <span className="packing-item__tag">{item.tag}</span>
    </label>
  );
}

function SourceLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowSquareOut aria-hidden="true" size={17} weight="bold" />
    </a>
  );
}

export function PackingPage() {
  const [checkedItems, setCheckedItems] = useState(readSavedChecks);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
  }, [checkedItems]);

  const toggleItem = (id) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetChecklist = () => {
    if (checkedItems.size === 0) return;
    if (window.confirm("Clear every packing and preparation check?")) {
      setCheckedItems(new Set());
    }
  };

  const checkedPackingCount = packingItemIds.filter((id) => checkedItems.has(id)).length;
  const checkedPrepCount = prepItemIds.filter((id) => checkedItems.has(id)).length;
  const progressValue = Math.round((checkedPackingCount / packingItemIds.length) * 100);

  return (
    <div className="packing-page">
      <a className="skip-link" href="#packing-checklist">
        Skip to packing checklist
      </a>

      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href={baseUrl} aria-label="Mallorca Route Atlas home">
          <CompassRose aria-hidden="true" size={24} weight="fill" />
          <span>
            <strong>Mallorca</strong>
            <small>Route atlas</small>
          </span>
        </a>
        <div className="topbar__links">
          <a href={baseUrl}>Routes</a>
          <a href="#packing-checklist" aria-current="page">
            Packing
          </a>
          <a href={itineraryPageUrl}>Trip</a>
          <a href={`${baseUrl}#sources`}>Sources</a>
        </div>
      </nav>

      <main id="packing-top">
        <header className="packing-hero">
          <picture className="packing-hero__visual" aria-hidden="true">
            <source media="(max-width: 720px)" srcSet={heroMobileUrl} />
            <img src={heroDesktopUrl} alt="" />
          </picture>
          <span className="packing-hero__veil" aria-hidden="true" />

          <div className="packing-hero__title">
            <span className="kicker">Sa Calobra Cycling Club · Mallorca 2026</span>
            <h1>
              Pack light.
              <span>Ride ready.</span>
            </h1>
            <p>
              SCCC handles most of the pro-team details. This list protects the few things that can
              stop your ride—and keeps you comfortable from cool starts to sunny summits.
            </p>
            <div className="packing-hero__actions">
              <a className="scroll-cue" href="#packing-checklist">
                Start the checklist
                <ArrowDown aria-hidden="true" size={19} weight="bold" />
              </a>
              <a className="packing-hero__back" href={baseUrl}>
                <ArrowLeft aria-hidden="true" size={18} weight="bold" />
                Route atlas
              </a>
            </div>
          </div>

          <div className="masthead__meta packing-hero__meta" aria-label="Packing essentials">
            <dl>
              <div>
                <dt>Cabin bag</dt>
                <dd>Pedals + shoes</dd>
              </div>
              <div>
                <dt>SCCC planning range</dt>
                <dd>10–22°C · 50–71°F</dd>
              </div>
              <div>
                <dt>Laundry</dt>
                <dd>Kit washed daily</dd>
              </div>
            </dl>
          </div>

          <div className="masthead__note packing-hero__note">
            <SuitcaseRolling aria-hidden="true" size={18} weight="fill" />
            <span>Camp: 17–24 October 2026 · Pollença area, Mallorca</span>
          </div>
        </header>

        <section className="packing-manifest" aria-labelledby="packing-manifest-title">
          <div className="packing-section-heading">
            <div>
              <span className="eyebrow">Your rider manifest</span>
              <h2 id="packing-manifest-title">Bring the irreplaceable. Borrow the rest.</h2>
            </div>
            <p>
              Built from the exact camp page, SCCC's current packing guide, printable list, and FAQ.
              Conditional items are marked so you can make the final call from the forecast.
            </p>
          </div>

          <section className="packing-cabin" aria-labelledby="cabin-title">
            <div className="packing-cabin__intro">
              <Backpack aria-hidden="true" size={34} weight="duotone" />
              <div>
                <span className="eyebrow">Cabin-bag rule</span>
                <h3 id="cabin-title">If the suitcase disappears, these still arrive.</h3>
              </div>
            </div>
            <div className="packing-cabin__items">
              {cabinEssentials.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <article key={item.id}>
                    <Icon aria-hidden="true" size={24} weight="duotone" />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.note}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className="packing-checklist"
            id="packing-checklist"
            aria-labelledby="checklist-title"
            tabIndex={-1}
          >
            <h2 className="packing-sr-only" id="checklist-title">
              Packing checklist
            </h2>
            <div className="packing-checklist__toolbar">
              <div className="packing-progress" aria-live="polite">
                <div>
                  <span className="eyebrow">Packing progress</span>
                  <strong>
                    {checkedPackingCount} of {packingItemIds.length} checked
                  </strong>
                </div>
                <progress value={progressValue} max="100" aria-label={`${progressValue}% of packing list checked`}>
                  {progressValue}%
                </progress>
                <small>Saved on this device.</small>
              </div>
              <div className="packing-checklist__actions">
                <button type="button" onClick={() => window.print()}>
                  <Printer aria-hidden="true" size={18} weight="bold" />
                  Print packing list
                </button>
                <button type="button" onClick={resetChecklist} disabled={checkedItems.size === 0}>
                  <Trash aria-hidden="true" size={18} weight="bold" />
                  Reset
                </button>
              </div>
            </div>

            <div className="packing-manifest__chapters">
              {packingGroups.map((group) => {
                const Icon = icons[group.icon];
                return (
                  <section
                    className="packing-chapter"
                    key={group.id}
                    aria-labelledby={`packing-group-${group.id}`}
                  >
                    <header className="packing-chapter__heading">
                      <span className="packing-chapter__number">{group.number}</span>
                      <Icon aria-hidden="true" size={28} weight="duotone" />
                      <span className="eyebrow">{group.eyebrow}</span>
                      <h3 id={`packing-group-${group.id}`}>{group.title}</h3>
                      <p>{group.description}</p>
                    </header>
                    <div className="packing-chapter__items">
                      {group.items.map((item) => (
                        <ChecklistItem
                          key={item.id}
                          item={item}
                          checked={checkedItems.has(item.id)}
                          onToggle={toggleItem}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </section>

        <section className="packing-provided" aria-labelledby="provided-title">
          <div className="packing-provided__heading">
            <div>
              <span className="eyebrow">Already waiting in Mallorca</span>
              <h2 id="provided-title">Leave it off the list.</h2>
            </div>
            <p>
              SCCC supplies the bike, riding infrastructure, daily fuel, recovery, and the villa
              basics. Bike model, kit brand, and small equipment details may change.
            </p>
          </div>
          <div className="packing-provided__columns">
            {providedGroups.map((group) => {
              const Icon = icons[group.icon];
              return (
                <section key={group.title}>
                  <Icon aria-hidden="true" size={28} weight="duotone" />
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>
                        <CheckCircle aria-hidden="true" size={17} weight="fill" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <div className="packing-provided__source">
            <Info aria-hidden="true" size={19} weight="fill" />
            <span>Pedals are the important exception: bring your own pedals and matching shoes.</span>
            <SourceLink href="https://www.sacalobra.cc/cycling-camp/138/">Check camp inclusions</SourceLink>
          </div>
        </section>

        <section className="packing-prep" aria-labelledby="prep-title">
          <div className="packing-prep__main">
            <div className="packing-section-heading packing-section-heading--prep">
              <div>
                <span className="eyebrow">Before the wheels roll</span>
                <h2 id="prep-title">Arrive ready, not wrecked.</h2>
              </div>
              <p>
                Five small jobs protect the bike fit, the airport handoff, and Sunday's FTP test.
              </p>
            </div>

            <div className="packing-prep__progress" aria-live="polite">
              <ClipboardText aria-hidden="true" size={21} weight="duotone" />
              <strong>{checkedPrepCount} of {prepSteps.length} preparation steps handled</strong>
            </div>

            <ol className="packing-timeline">
              {prepSteps.map((step) => {
                const checked = checkedItems.has(step.id);
                return (
                  <li key={step.id} className={checked ? "is-checked" : undefined}>
                    <span className="packing-timeline__when">{step.when}</span>
                    <label htmlFor={`pack-${step.id}`}>
                      <input
                        id={`pack-${step.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(step.id)}
                      />
                      <span>
                        <strong>{step.title}</strong>
                        <span>{step.detail}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="packing-travel-brief" aria-labelledby="travel-brief-title">
            <Airplane aria-hidden="true" size={33} weight="duotone" />
            <span className="eyebrow">PMI flight brief</span>
            <h2 id="travel-brief-title">Meet the team without the airport drama.</h2>

            <dl>
              <div>
                <dt>Camp transfer · Sat 17 Oct</dt>
                <dd>SCCC prefers landing 11:00–15:00</dd>
              </div>
              <div>
                <dt>Departure transfer · Sat 24 Oct</dt>
                <dd>SCCC prefers takeoff 09:00–14:00</dd>
              </div>
            </dl>

            <p>
              SCCC schedules two shuttles each way. Current guidance notes a €50 extra transfer
              charge for arrivals after 19:00 or departures before 09:00—confirm your exact shuttle.
            </p>
            <div className="packing-travel-brief__note">
              <CloudRain aria-hidden="true" size={21} weight="duotone" />
              <span>
                <strong>Forecast, not folklore.</strong>
                Use 10–22°C / 50–71°F for planning, then check the real forecast a few days out.
              </span>
            </div>
            <div className="packing-travel-brief__note">
              <WashingMachine aria-hidden="true" size={21} weight="duotone" />
              <span>
                <strong>Long-haul rider?</strong>
                With a time difference of more than four hours, SCCC suggests a night in Palma
                before camp; the villa is not available early.
              </span>
            </div>
          </aside>
        </section>

        <section className="packing-sources" aria-labelledby="packing-sources-title">
          <div>
            <span className="eyebrow">Source notes</span>
            <h2 id="packing-sources-title">Official guidance, made usable.</h2>
            <p>
              Checked {sourceCheckedDate}. The live forecast, shuttle times, villa, bike model, and
              kit brand can change—reconfirm those details with SCCC before travel.
            </p>
          </div>
          <div className="packing-sources__links">
            {sourceLinks.map((source) => (
              <SourceLink href={source.href} key={source.href}>
                {source.label}
              </SourceLink>
            ))}
          </div>
          <div className="packing-sources__icons" aria-hidden="true">
            <ForkKnife size={27} weight="duotone" />
            <WashingMachine size={27} weight="duotone" />
            <FirstAid size={27} weight="duotone" />
          </div>
        </section>
      </main>

      <footer className="site-footer packing-footer">
        <span>Mallorca Route Atlas · Packing guide · 2026</span>
        <a href={baseUrl}>
          Back to the routes
          <ArrowLeft aria-hidden="true" size={15} weight="bold" />
        </a>
      </footer>
    </div>
  );
}
