# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Product Direction

- The selected source of visual truth is `reference/selected-concept-2.png`, the Mallorca Terrain Atlas concept.
- Preserve its warm paper, cartographic editorial feel, central island overview, route-card composition, red route accents, and yellow elevation profiles.
- The app's main job is to let the rider open a stage, inspect its route and profile, understand every notable climb, and follow verified official or clearly labeled public-preview links.
- Keep stages in ride-date order while retaining official stage numbers: 1, 2, 3, 4, 6, 5.
- Present each route map, stage summary, and elevation profile as one clickable stage row; do not split them into parallel map and week sections.
- Keep the official metric totals primary and show miles and feet as a subtle imperial footnote for every stage.
- Use the supplied Portal screenshots as the current visual direction: immersive scenic hero, elegant editorial serif headlines, soft cream framed windows, and generous rounded surfaces.
- Keep the palette grounded in the supplied Mallorca photos: dominant Mediterranean cobalt/azure, lagoon turquoise and glassy aqua, cypress/pine/olive greens, limestone cream, restrained terracotta, and citrus yellow. Avoid purple, lilac, magenta, pink sunsets, and bougainvillea pink as dominant tones.
