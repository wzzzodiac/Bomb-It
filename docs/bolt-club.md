# Bolt Club visual integration

Review branch based on main `d7e14bcfe1dcf1b36e504713faaa722a2ea6804d`. No production deployment or merge. Server and toolkit remain untouched; existing user instruction edits are preserved in the original checkout. The separate preview adds only `bolt-club/` in the already-existing preview repository, preserving its root Scrapyard preview.

[Playable preview](https://wzzzodiac.github.io/Bomb-It-Preview/bolt-club/) · [Visual comparison](https://wzzzodiac.github.io/Bomb-It-Preview/bolt-club/comparison/)

## Original art and implementation

- Selected proposal 3, retaining the italic BOMB / IT! logo, plum/pink/yellow palette, expressive robots and lavender walls. Six heads and faces refined beyond the proposal, including a monocle, visor, ears and teeth. These are robot features, not new map decorations.
- Original source preserved in `scripts/art/bolt-source.mjs` (derived from Bomb-It-proposals-v2) and `scripts/art/blast-source.mjs`. Bake with `node scripts/bake-bolt.mjs` using an already-installed Playwright/Edge (`PLAYWRIGHT_MODULE` if needed). No packages, paid assets or services were added. Blender/Godot/Inventor were not needed: Canvas2D is an offline authoring tool here, not the game renderer.
- Main atlas: 768×768, 63 frames: six players × four directions × two walking steps, six reactions, and the original nine terrain/item frames. Bomb placement and local power-up collection trigger a short face reaction; moving changes direction and cancels the reaction pose naturally. No continuous idle animation.
- Blast atlas: 512×512, 64 frames: sixteen adjacency masks × four phases. Baked radial light, warm cores, comic edges and a persistent pink danger bed. Sprites stay inside their supplied 40×40 logical cell. Neighbour connections are derived ONLY from the cells returned by the unchanged local blast calculation or server event. No changed range, blocking, damage interval or drop rules. No particles, bloom, screen flashes, smoke or residual effect. Sprites disappear when the existing damaging duration ends.
- Existing Phaser engine, maps (17×13 / 21×17 / 25×19), bots, input, music and networking retained. Arena generation, controller, player/rule modules, network modules and server code have no diff.
- New `preload` loads the two baked atlases only on match entry. Failed atlas loads return to a usable menu, rather than leaving missing textures. The online failure path uses the existing leave operation; it does not change the protocol.
- CSS system fonts and a separate 384×128 menu robot strip (25,706 B). The home screen does not load Phaser or the game atlases. Logo hover (mouse), native click/tap, Enter/Space share one 780 ms sequence; busy gating prevents stacking/double triggers. Layout dimensions stay fixed. Reduced motion uses only a 150 ms opacity change; in-game walking, face reaction and blast animation are suppressed while danger stays visible.
- Visible UI is simple English. Player nicknames are never translated or injected as HTML. Result wording, profile, room, loading, errors and buttons were reviewed.

## Names and identity

The owned player is recognized from controller ownership / the existing ACK `selfPlayerId`, never nickname. Stable presentation slots are stored by player ID for the round: YOU has the mint robot; opponents are P2–P6. These are client-relative display labels, not new server identities. The sprite chest number, color, compact label and full-name roster agree on each client.

The own nickname has an opaque cream plate, dark 10 px screen-space text, amber border and width-limited ellipsis. Opponents have compact opaque P labels. Full nicknames and OUT status remain in the roster, with matching color marks. Labels avoid robot bodies, other labels and active hazard cells; if a dense cluster leaves no nearby clear position, a label temporarily hides rather than covering danger. The roster remains available. This intentional tradeoff keeps the map readable; labels are not promised to remain simultaneously visible in every cluster. Tested long names, six players near light walls/dark floor and duplicate online nicknames.

## Download measurements

Fresh immutable archive of main and pre-Scrapyard compared with this build using the same method: unique HTML/JS/CSS/JSON gzip, original PNG and full unchanged MP3 once; no HTTP headers, cache or duplicate streaming requests. This is a conservative complete-resource total, not just bytes received at first paint. Screenshots/docs/art sources are not gameplay downloads.

| Version | Unique compressed/download bytes |
|---|---:|
| Pre-Scrapyard `3f338453` | 1,421,441 B |
| Current main `d7e14bc` | 1,425,744 B |
| Bolt Club | 1,645,321 B |
| Added vs main | **219,577 B** |
| Added cumulatively vs pre-Scrapyard | **223,880 B** |

Budget: 3,000,000 B additional cumulatively. PASS, about 7.5% consumed. Main's fresh archive is 47 B above the previous report's compressed total; this table uses the fresh archives consistently, not mixed measurements. RAW sizes: main 2,378,527 B; Bolt 2,620,835 B. Actual CDN compression/headers may differ.

Measured assets: main atlas PNG 110,530 B; blast PNG 81,980 B; menu PNG 25,706 B; both JSON manifests gzip total 980 B. Complete unchanged music: 1,059,072 B. Engine gzip about 339 KB, still deferred until play. Large-engine build warning is unchanged in nature; no warning suppression.

Cold Edge, 1.6 Mbps down, 150 ms latency, cache disabled, no CPU throttle, same three viewports. At 390×844: main home 518 ms / 27,984 transferred B; Bolt home 806 ms / 54,380 B. Click-to-ready-match: main 2,422 ms; Bolt 4,367 ms. First playable scene is checked via the two-player HUD, not merely canvas creation. The visual jump costs about 1.95 s on this slow cold link; no claim that the first match became faster. Later starts reuse engine/browser caches. Music streaming can issue duplicate/partial requests, so transfer snapshots do not replace the unique complete-resource budget.

## Texture memory and per-frame cost

Calculated RGBA allocations, distinct from compressed downloads: main atlas 2,359,296 B (2.25 MiB), blast atlas 1,048,576 B (1 MiB), menu strip 196,608 B (0.1875 MiB). Game atlases total **3.25 MiB** without mipmaps, versus Scrapyard's 0.25 MiB. A full mip chain would add about a third; CPU decoded copies can also add memory. These are dimensions/format calculations, not measured physical-phone VRAM. No runtime sprite baking or lighting.

One terrain image per cell (221/357/475); one sprite per robot, bomb, power-up and active flame. Explosions no longer require a container plus image per flame. Two game textures suit WebGL batching; exact draw calls were not profiled. Up to six DOM labels are positioned after update, with no per-frame canvas text texture upload. This is an implementation cost description, not a guaranteed GPU timing.

Measured desktop stress: 48 visual flame cells every 500 ms for five seconds, 844×390 Edge touch emulation with reduced motion (static flame frames). Phaser ~112.1 FPS; browser RAF ~120.1 FPS on this high-refresh host; p95 frame 8.5 ms; zero sampled frames over 33.4 ms. This is not an animated worst-case benchmark and cannot establish 60 FPS / no sustained sub-30 FPS on a physical reference phone. No phone was available; thermal/battery/mobile GPU, Safari and Firefox remain unverified.

## Verification

- `npm test`: 31/31 PASS, preserving existing rule/protocol tests and strengthening atlas/connectivity tests.
- `npm run typecheck`: PASS. `npm run build`: PASS; generated root entry/assets included with source for the existing Pages workflow.
- Browser smoke: 1920×1080, 1366×768, 390×844, 844×390, 667×375, 320×568. Three map sizes, complete arena, exact aspect, no active-match scroll or arena/control overlap. Bots move; keyboard and synthetic pointer movement/bombs; death, results and replay.
- Two actual browser clients against unchanged local server: same nickname, distinct ownership, replicated movement/bombs, explosion/death/results and same-room reset. Test instrumentation is outside shipped code.
- UI: hover/tap/Enter replay, rapid click gating, no logo layout movement, no game resource load on home, reduced motion, full-name roster and six-player nearby labels. Live public preview: native Space and tap replay, Quick Play touch bomb/results, duplicate-name two-client online match, bomb/death/results and same-room replay all PASS; comparison and every image load. No runtime errors. The first live keyboard attempt timed out with a background page; activating the page and holding Space for 250 ms passed without changing game code.
- Effects fixture: both power-ups collect, crate becomes floor with the authoritative drop, escape survives, danger lasts until removal, no residual, engine download and atlas download recovery. Runtime errors: none in passing runs.
- Representative before/after home/match, six-player names, desktop and landscape results screenshots opened and visually inspected. Read-only final diff inspection confirms no new map decorations or rule/backend changes.
- A development harness run timed out after art HMR invalidated the instrumented module instance. Restarting Vite with stable generated assets restored the harness; all final flows passed. A Windows watcher lock on archived audio also required restarting the development server. Neither was hidden by weakening assertions.

Evidence in [bolt-club/evidence](bolt-club/evidence/): resource totals, cold main/after measurements, local/online smoke, UI and effect fixtures. No physical thumbs or multitouch claim: local touch actions are synthetic pointer events; logo uses emulated tap. Live preview verification is recorded separately after deployment to the isolated preview repository.

## Reproduce and publication boundary

Use the existing installed runtime, then `npm test`, `npm run typecheck`, `npm run build`. Start local backend unchanged on 8080 with `CLIENT_ORIGIN=http://127.0.0.1:5191`; start Vite on 5191. Run `scripts/visual-smoke.mjs`, `scripts/bolt-ui.mjs`, `scripts/visual-fixtures.mjs`. Restart Vite after regenerating assets before instrumented smoke (avoids HMR module duplication).

`scripts/visual-measure.mjs [built-root] [label]` measures a temporary gzip server on 5188. `scripts/resource-budget.mjs [pre-Scrapyard-built-root]` compares the archived main files in ignored `outputs/visual-qa/main-baseline/` and the current root build. External baseline paths are supplied at runtime, never committed.

Preview build: `npm exec vite -- build --base=/Bomb-It-Preview/bolt-club/ --outDir=outputs/visual-qa/preview-build`. Only append that compiled entry/assets and comparison under `bolt-club/` in the isolated preview repository. Do not modify production Pages settings, server allowlists or main game branch. Merge requires the user's later approval.
