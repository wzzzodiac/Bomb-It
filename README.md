# Bomb-It

A small playable, local, single-player Bomberman-style browser MVP. Clear crates, collect upgrades, and defeat one wandering computer rival. Graphics are simple Phaser shapes, not final art.

Live demo: [Play Bomb-It](https://wzzzodiac.github.io/Bomb-It/)

## Run

Requires Node.js 20.19+ (or 22.12+). Run `npm install`, then `npm run dev` and open the local URL at `/Bomb-It/app/` (the editable Vite entry). `npm run build` creates `dist/`; `npm test` checks arena/blast rules.

GitHub Pages currently publishes `main` from the repository root. `npm run build` also syncs the generated `index.html` and `assets/` there; commit those files with source changes before pushing. Edit `app/index.html`, not the generated root entry.

Stack: TypeScript, Phaser 3, Vite. No server, account, or cloud service.

## Play

- Desktop: WASD or arrow keys to move, Space to place a bomb.
- Phone: hold a directional button below the arena; tap BOMB.
- Bomb fuse is about two seconds. Flames hit in four directions, stop at walls, and destroy the first crate in each ray. Bomb Up increases simultaneous bombs; Fire Up increases range.
- Defeat the rival for VICTORY. Getting hit gives GAME OVER. Restart starts a fresh match.

Current limitations: one random arena and basic wandering AI; no online play, sound, advanced animations, or saved progress. Next: improve AI and map balance, then add art/audio and more arenas before considering multiplayer.
