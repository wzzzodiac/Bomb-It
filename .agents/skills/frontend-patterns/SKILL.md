---
name: frontend-patterns
description: Apply focused frontend and game UI patterns for a web/mobile feature or bug; not for unrelated backend work.
---

# frontend-patterns

**Purpose:** Keep UI changes readable, accessible, responsive, and aligned with project patterns.

**Activate when:** A web or mobile interface, rendering layer, interaction, or gameplay presentation is changing.

**Do not activate when:** The task is confined to server logic, tooling, or documentation.

**Workflow:** Inspect the affected component and nearby patterns. Preserve existing state ownership and visual architecture. Handle loading/error/empty states where relevant; check keyboard/touch and viewport behavior when the change affects them. Avoid new libraries for a local component fix.

**Expected output:** Summarize the changed behavior and focused visual or interaction verification.

**Cost/context:** Do not redesign unrelated screens or load the full UI tree by default.
