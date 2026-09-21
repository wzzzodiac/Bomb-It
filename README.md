# Bomb-It

A mobile-first, local multiplayer-ready Bomberman-style browser MVP. Set a nickname, create a room, fill up to six slots with bots, and play a complete match from lobby through results. Graphics are simple Phaser shapes, not final art.

Live demo: [Play Bomb-It](https://wzzzodiac.github.io/Bomb-It/)

## Run

Requires Node.js 20.19+ (or 22.12+). Run `npm install`, then `npm run dev` and open the local URL at `/Bomb-It/app/` (the editable Vite entry). `npm test` checks arena, player, lobby, and match rules. `npm run typecheck` checks TypeScript and `npm run build` creates the production output.

GitHub Pages currently publishes `main` from the repository root. `npm run build` also syncs the generated `index.html` and `assets/` there; commit those files with source changes before pushing. Edit `app/index.html`, not the generated root entry.

Stack: TypeScript, Phaser 3, Vite. No server, account, or cloud service.

## Play

- Desktop: WASD or arrow keys to move, Space to place a bomb.
- Phone: use the connected D-pad below the arena and tap BOMB. Landscape is recommended; portrait remains usable and shows a rotation hint.
- Bomb fuse is about two seconds. Flames hit in four directions, stop at walls, and destroy the first crate in each ray. Bomb Up increases simultaneous bombs; Fire Up increases range.
- The last surviving player wins. If everyone is eliminated together, the match is a draw.

## Current scope

- Profile, home, local room lobby, match, and results screens.
- One local player plus independently controlled bots, from 1–6 total participants.
- Configurable 17×13 arena with safe spawn zones for every supported count.
- Generic player, controller, bomb ownership, elimination, winner, and draw rules.
- Nickname persistence in the browser.

There is deliberately no network transport, backend, account system, matchmaking, chat, or cloud save yet. Join Room is a visible future-facing entry point and does not simulate an online connection. See `docs/roadmap.md` for the staged multiplayer plan.
