# Decisions

## 2026-09-14 — Local game-web MVP

- Use Phaser 3 shapes and tile-step movement; avoid asset pipeline and physics complexity for the first playable build.
- Keep blast propagation pure and testable; the scene owns timers, rendering, and outcomes.
- Use one HTML touch D-pad below the canvas, responsive Phaser scaling, and no backend.
- Toolkit game-web v0.2.0 is locally pinned in `codex-project.json`; normal work does not fetch remote instructions.

## 2026-09-14 — Built Pages deployment

- Vite uses `/Bomb-It/` as its base. Since the existing Pages source is `main` root and overrides custom artifact deployments, build syncs the compiled entry/assets into that root. Editable HTML is isolated in `app/`; no second deployment workflow or repository settings change is needed.

## 2026-09-21 — Local multiplayer-ready boundaries

- Keep the current release offline-first: one human can play with bots, while Join Room states honestly that networking is not available.
- Represent every participant with the same player model. Local, bot, and future remote behavior enter through controller interfaces instead of special-casing a hero and rival.
- Keep room state outside Phaser and pass a participant snapshot into each match. This separates navigation/lobby work from deterministic arena and match rules.
- Support 1–6 participants now. Document five rooms and 30 connected players as a future server target, not a browser-side promise.
- Prefer a 17×13 arena and dimension-derived spawn candidates, leaving future map profiles possible without restoring fixed two-player coordinates.
