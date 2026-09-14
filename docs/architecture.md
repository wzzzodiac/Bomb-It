# Architecture

TypeScript/Vite loads Phaser from `src/main.ts`. `GameScene.ts` owns a single match: tile movement, actors, bombs, power-ups, and result state. `arena.ts` contains pure map and blast rules; `config.ts` holds grid constants. HTML/CSS owns the HUD, mobile controls, and result overlay. No backend or persistent data.
