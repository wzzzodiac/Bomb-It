# Game-web testing profile

Choose the smallest check that covers the changed behavior; use the locally installed `verification-lite` skill for overall validation scope.

- **Small gameplay/logic change:** Run an affected unit or logic test if available.
- **UI change:** Check the affected viewport and basic interaction. Capture a screenshot only when it helps judge the result.
- **Mobile-sensitive change:** Check one representative mobile viewport and touch interaction where relevant. Check portrait and landscape only when orientation affects the feature.
- **Critical user flow:** Use the optional `e2e-testing` skill and Playwright when a flow such as starting a game, creating/joining a lobby, restarting, pause/settings, multiplayer connection, or the result screen needs browser-level verification.

Normal development does not require a full browser matrix, every device size, screenshots for every test, or video/trace without debugging or failure evidence.
