# Decisions

## 2026-09-14 — Local game-web MVP

- Use Phaser 3 shapes and tile-step movement; avoid asset pipeline and physics complexity for the first playable build.
- Keep blast propagation pure and testable; the scene owns timers, rendering, and outcomes.
- Use one HTML touch D-pad below the canvas, responsive Phaser scaling, and no backend.
- Toolkit game-web v0.2.0 is locally pinned in `codex-project.json`; normal work does not fetch remote instructions.
