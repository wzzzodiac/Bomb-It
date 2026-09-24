# Bomb-It

A mobile-first Bomberman-style browser MVP with local Quick Play and a first local-server online mode. Graphics are simple Phaser shapes, not final art.

Live demo: [Play Bomb-It](https://wzzzodiac.github.io/Bomb-It/)

## Run

Requires Node.js 20.19+ (or 22.12+). Run `npm install`, then `npm run dev` and open the local URL at `/Bomb-It/app/` (the editable Vite entry). `npm test` checks arena, player, lobby, and match rules. `npm run typecheck` checks TypeScript and `npm run build` creates the production output.

GitHub Pages currently publishes `main` from the repository root. `npm run build` also syncs the generated `index.html` and `assets/` there; commit those files with source changes before pushing. Edit `app/index.html`, not the generated root entry.

For online play, run `wzzzodiac/Bomb-It-Server` locally on port 8080, then choose Online in two browser tabs. The frontend uses `VITE_SERVER_URL` when set and otherwise defaults to `http://localhost:8080` only on localhost. See `.env.example`; no `.env` file is committed. The public Pages build retains Quick Play, but Online needs a separately configured reachable server.

Stack: TypeScript, Phaser 3, Vite, Socket.IO client. No account or cloud service.

## Play

- Desktop: WASD or arrow keys to move, Space to place a bomb in local play.
- Phone: use the connected D-pad below the arena and tap BOMB. Landscape is recommended; portrait remains usable and shows a rotation hint.
- Bomb fuse is about two seconds. Flames hit in four directions, stop at walls, and destroy the first crate in each ray. Bomb Up increases simultaneous bombs; Fire Up increases range.
- The last surviving player wins. If everyone is eliminated together, the match is a draw.

## Current scope

- Profile, home, local room lobby, match, and results screens.
- One local player plus independently controlled bots, from 1–6 total participants.
- Local arena presets: 17×13 for 1–2, 21×17 for 3–4, and 25×19 for 5–6 participants.
- Generic player, controller, bomb ownership, elimination, winner, and draw rules.
- Nickname persistence in the browser.
- Online create/join, ready/start, and server-authoritative arena/player movement for two or more human players. Online input sends direction only; bombs and results remain local-only.

There is no online bomb/explosion/result authority, reconnect, matchmaking, chat, account system, or cloud save yet. See `docs/roadmap.md` for the staged multiplayer plan.
