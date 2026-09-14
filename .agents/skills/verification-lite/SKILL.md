---
name: verification-lite
description: Choose proportionate checks for a code change; not a mandatory full build, test, lint, or security loop for every edit.
---

# verification-lite

**Purpose:** Verify the change with effort proportional to impact and risk.

**Activate when:** A code change is ready to check, or the user requests validation.

**Do not activate when:** No code changed and a static/documentation task has its own simple checks.

**Workflow:** SMALL: run a targeted test and relevant type/lint check only if useful; skip full repository validation and broad security scans unless security-sensitive. FEATURE/MEDIUM: targeted tests, relevant build/type/lint, and affected diff inspection; skip unrelated review. MAJOR/RELEASE: full build, relevant full test suite, lint/typecheck, diff review, and security checks where relevant. Fix failures, then rerun only affected checks.

**Expected output:** Report checks run, results, and any material checks intentionally omitted.

**Cost/context:** No periodic timers, arbitrary coverage threshold, or repeated full verification loop.
