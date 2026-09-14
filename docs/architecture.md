# Architecture

TypeScript/Vite loads Phaser from `src/main.ts`. Editable HTML lives in `app/index.html`; `npm run build` generates `dist/` and syncs its entry/assets to the repository root for the existing branch-based GitHub Pages source. `GameScene.ts` owns a single match: tile movement, actors, bombs, power-ups, and result state. `arena.ts` contains pure map and blast rules; `config.ts` holds grid constants. HTML/CSS owns the HUD, mobile controls, and result overlay. No backend or persistent data.
