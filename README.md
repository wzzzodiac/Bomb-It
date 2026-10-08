# Bomb-It

A mobile-first Bomberman-style browser game with local Quick Play and server-authoritative online rounds. The Scrapyard visual refresh uses six original robots and a compact, locally generated sprite atlas.

Live demo: [Play Bomb-It](https://wzzzodiac.github.io/Bomb-It/)

## Run

Requires Node.js 20.19+ (or 22.12+). Run `npm install`, then `npm run dev` and open the local URL at `/Bomb-It/app/` (the editable Vite entry). `npm test` checks arena, player, lobby, and match rules. `npm run typecheck` checks TypeScript and `npm run build` creates the production output.

GitHub Pages currently publishes `main` from the repository root. `npm run build` also syncs the generated `index.html` and `assets/` there; commit those files with source changes before pushing. Edit `app/index.html`, not the generated root entry.

For local online play, run `wzzzodiac/Bomb-It-Server` on port 8080, then choose Online in two browser tabs. Development defaults to `http://localhost:8080`; `VITE_SERVER_URL` can override it. Production builds use the public Cloud Run URL in `.env.production`. This URL is public configuration, not a credential.

Stack: TypeScript, Phaser 3, Vite, Socket.IO client, and the existing Cloud Run server. No account system.

## Play

- Desktop: WASD or arrow keys to move, Space to place a bomb.
- Phone: use the connected D-pad below the arena and tap BOMB. Landscape is recommended; portrait remains usable and shows a rotation hint.
- Bomb fuse is about two seconds. Flames hit in four directions, stop at walls, and destroy the first crate in each ray. Bomb Up increases simultaneous bombs; Fire Up increases range.
- The last surviving player wins. If everyone is eliminated together, the match is a draw.

## Current scope

- Profile, home, local room lobby, match, and results screens.
- One local player plus independently controlled bots, from 1–6 total participants.
- Local arena presets: 17×13 for 1–2, 21×17 for 3–4, and 25×19 for 5–6 participants.
- Generic player, controller, bomb ownership, elimination, winner, and draw rules.
- Nickname persistence in the browser.
- Online create/join, ready/start, and complete server-authoritative arena, movement, bombs, explosions, crates, power-ups, deaths, and results for two or more human players. Online input sends direction or an empty bomb intent; the server owns all gameplay outcomes.

Online rooms support server bots and same-room replay via Back to Room. Online reconnect, matchmaking, chat, accounts, and persistence are not implemented. Rooms are process-local on the server.

## Scrapyard review preview

[Play the isolated visual preview](https://wzzzodiac.github.io/Bomb-It-Preview/) — not production. It reuses the existing compatible backend; no server or game-rule changes are needed. The production link above remains unchanged until this branch is approved and merged.

[Visual comparison, download measurements and verification](docs/visual-refresh.md).

The renderer is downloaded on first Quick Play/local start, or before joining an online room. Home/profile use only system fonts and inline original artwork. Bombs, flames and tiles share a 512×128 atlas generated once per game texture manager. There are no additional downloaded game textures or new dependencies. Flames stay visible for their full damaging lifetime; decorative bomb pulses respect reduced-motion.

`scripts/visual-smoke.mjs` runs a focused Edge/Playwright development smoke test. Use an already installed Playwright package via `PLAYWRIGHT_MODULE` (or normal module resolution); do not install browsers automatically. Set `EDGE_EXECUTABLE` only if the Edge channel is unavailable. Start an unchanged local server with `PORT=8081` and `CLIENT_ORIGIN=http://127.0.0.1:5191`, then Vite with `VITE_SERVER_URL=http://127.0.0.1:8081` on port 5191. Run `node scripts/visual-smoke.mjs`; screenshots/results go to ignored `outputs/visual-qa/`. `BOMB_IT_TEST_URL` and `BOMB_IT_QA_OUT` can override the development URL/output directory. Test-only scene instrumentation pauses bots after checking movement for deterministic bomb/death assertions; it is not shipped in the game.
