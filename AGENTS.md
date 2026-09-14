# Project guidance

- Read only files relevant to the task; avoid repository-wide scans and unchanged rereads.
- Preserve the existing architecture and conventions. Make the smallest relevant change; avoid unrelated refactors or quality reviews.
- Use targeted tests first. Scale build, lint, type, security, and full-suite checks to change size and risk; skip expensive checks for trivial isolated edits.
- Use relevant skills selectively. Invoke subagents only when they reduce context or materially improve reliability; never chain them automatically.
- Do not create commits, PRs, merges, releases, deployments, or external-system changes unless the user explicitly requests them.
- Ask before major dependencies or architectural changes.
- Keep durable architecture, state, decisions, and roadmap in `docs/`, rather than relying on conversation history.
- Stop when the task's acceptance criteria are satisfied.
