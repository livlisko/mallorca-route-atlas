# Mallorca Route Atlas

An interactive route atlas for a six-stage Mallorca cycling camp, covering 18–23 October 2026.

[Open the live Mallorca Route Atlas](https://livlisko.github.io/mallorca-route-atlas/)

## What is inside

- Six clickable stage dossiers
- Official route maps and elevation profiles
- Notable climb details with direct Strava segment links
- Official Sa Calobra Cycling Club stage pages and films
- Clearly labeled public route previews from Ride with GPS, Bikemap, Wikiloc, and Cycling UK
- A separate encrypted trip brief whose readable contents and unlock code are never committed
- Responsive layouts for desktop and mobile

Public route links are motivational previews, not the camp's final navigation files. Riders should use the official roadbook when it is released.

## Stage briefing sources

The ride overviews are Codex-authored summaries of SCCC's public stage descriptions, not direct
quotations or excerpts from the rider roadbook. Route lines summarize the corresponding public
stage pages and maps. Effort and pacing blurbs are Atlas suggestions informed by those descriptions,
not official coaching instructions. Each box links to its corresponding SCCC stage page; the
camp coach's instructions take precedence.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The `main` branch deploys automatically through GitHub Pages.

## Private itinerary boundary

The `/itinerary/` entry stores only AES-256-GCM ciphertext in the public build. Its readable source
must stay outside this repository and is encrypted locally with a unique high-entropy code. Run the
privacy scan before every deployment; do not weaken this boundary into a client-side passcode check
over plaintext data.

Before a private-itinerary release, point `PRIVATE_ITINERARY_DENYLIST` to an ignored file outside the
repository and run `npm run privacy:scan:release`. The release scan intentionally fails without it.
