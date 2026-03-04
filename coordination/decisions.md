# Decision Log

Append-only record of architectural and design decisions. Never edit or delete past entries.

---

### DEC-001: Split monolith into multi-agent structure
**Date:** 2026-03-04
**By:** Human (project setup)

Split `desert-golfing.html` (1,350 lines) into 6 JS files with clear ownership boundaries:
- `shared.js` — global state, constants, utilities (SHARED)
- `level-design.js` — terrain generation (Level Design agent)
- `art.js` — all rendering (Art Direction agent)
- `gameplay.js` — physics, input, state machine (Core Gameplay agent)
- `debug.js` — debug tools (QA/Testing agent)
- `main.js` — game loop + init (SHARED)

Using `<script>` tags (not ES modules) to maintain global scope sharing.
Debug system uses function patching (`_logBall` override, `draw` wrapper).

### DEC-002: Coordination via markdown files
**Date:** 2026-03-04
**By:** Human (project setup)

Agents coordinate through markdown files in `coordination/`:
- `status.md` — current work status per agent
- `requests.md` — cross-agent change requests
- `decisions.md` — this file (append-only)
- `interfaces.md` — canonical function signatures

This works because Claude Code reads markdown natively and these files are small enough to check quickly.
