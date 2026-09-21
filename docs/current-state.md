# Current state

Updated: 2026-09-21

The playable flow now covers nickname setup, home, local lobby, 1–6 participant matches, and results. A room always has one local host and may add or remove bots up to six slots. Match code is player-count-independent: each player owns bomb capacity and fire range, controllers are interchangeable, safe spawns are allocated from arena dimensions, and the last survivor or a simultaneous-elimination draw ends the round. Play Again and Back to Lobby complete the loop.

The arena defaults to 17×13. Desktop keyboard and mobile landscape controls share the same scene input contract. Nickname is stored locally; room and match state are intentionally session-only. The root production bundle remains compatible with the current `/Bomb-It/` GitHub Pages branch source.

Not implemented: networking, server authority, accounts, matchmaking, chat, Cloud Run or any other cloud deployment, cloud persistence, final art/audio, accessibility audit, or multi-device synchronization. The Remote controller is only an explicit interface placeholder and never pretends another player is connected.
