---
name: coding-standards
description: Apply lightweight coding-quality principles while implementing or reviewing code; skip documentation-only or non-code tasks.
---

# coding-standards

**Purpose:** Preserve clear, reliable code without imposing a new architecture or process.

**Activate when:** Changing code or evaluating the quality of a focused code change.

**Do not activate when:** No code is involved, or the task only requires a mechanical documentation or data update.

**Workflow:** Follow existing project conventions and preserve public behavior unless a change is requested. Use clear names, understandable responsibilities, and shared logic where duplication is practical to remove. Handle meaningful errors without silently swallowing failures. Validate untrusted input at boundaries and keep secrets out of source. Keep changes scoped; add a dependency or abstraction only for a concrete benefit.

**Expected output:** Readable, focused code with meaningful failure handling and a concise account of changed behavior.

**Cost/context:** No arbitrary size limits, mandatory immutability or patterns, TDD or coverage targets, or broad refactors.
