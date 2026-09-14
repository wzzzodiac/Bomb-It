---
name: project-workflow
description: Use for ordinary project implementation work that needs a lightweight scope-to-validation workflow; skip standalone questions and tasks with a more specific prescribed process.
---

# project-workflow

**Purpose:** Guide a small, coherent implementation from request to completion.

**Activate when:** Implementing or fixing behavior in a software or game project.

**Do not activate when:** Answering a standalone question, doing a trivial formatting-only edit, or following a user-specified workflow that already covers the task.

**Workflow:** Understand the requested scope. Identify only relevant files and reuse existing architecture and patterns. Make the smallest coherent change. Validate in proportion to risk using `verification-lite`. Update durable project docs only when architecture, current state, decisions, or roadmap changed. Stop when acceptance criteria are met.

**Expected output:** State the behavior changed, focused validation, and any material limitation.

**Cost/context:** No automatic repository-wide scan, plan for trivial tasks, reviewer or security-review invocation, unrelated refactor, repeated validation loop, or extra work after completion.
