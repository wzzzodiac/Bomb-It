# Roadmap

## Current foundation

1. App, home, local profile, and lobby architecture.
2. Generic 1–6 player gameplay and configurable arena/spawns.
3. Mobile-first landscape controls with desktop fallback.
4. Local room simulation and multiple bots.

## Next multiplayer phase

5. Add a real-time transport behind the existing remote-controller boundary.
6. Build a server-authoritative game and room service; clients send inputs while the server owns positions, bombs, deaths, and results.
7. Package and deploy that service to Cloud Run only after it works locally.
8. Enforce an initial maximum of five simultaneous rooms with six players each (30 connected players), then load-test that target.
9. Test remote multiplayer across separate devices and network conditions.
10. Add deterministic disconnect, reconnect, room expiry, and host-handoff behavior.

## Later refinement

11. Improve bot strategy and danger avoidance.
12. Add authored art and audio.
13. Add more balanced maps.
14. Consider additional game modes.
15. Add persistence or accounts only if actual product needs justify them; keep local play available where practical.

## Explicitly out of the current MVP

No fake online state, peer discovery, production backend, Cloud Run deployment, authentication, cloud database, chat, or global matchmaking is included in the browser build.
