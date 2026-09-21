# Architecture

## Application shell

TypeScript/Vite starts in `src/main.ts`. `BombItApp` owns the screen flow (`profile → home → lobby → playing → results`), local room state, nickname persistence, Phaser lifecycle, and DOM controls. Editable markup lives in `app/index.html`; `src/style.css` owns the responsive shell and mobile controls.

## Domain boundaries

- `src/app/state.ts`: serializable participant and room state, room-code generation, and six-slot lobby mutations.
- `src/game/players.ts`: generic player identity, controller kind, stats, and bomb-capacity accounting.
- `src/game/controllers.ts`: interchangeable local, bot, and remote-placeholder controller contracts. The remote controller intentionally does nothing until a real transport exists.
- `src/game/arena.ts`: configurable dimensions, safe spawn allocation for 1–6 players, map generation, and pure blast propagation.
- `src/game/matchRules.ts`: player-count-independent winner and simultaneous-elimination draw rules.
- `src/game/GameScene.ts`: renders and runs one match by composing those boundaries; it does not own navigation or room setup.

## Deployment

`npm run build` generates `dist/`, then replaces the compiled root `index.html` and `assets/` used by the repository's existing `main`-branch GitHub Pages source. Vite base remains `/Bomb-It/`. There is no backend, network request, authentication, or cloud persistence.
