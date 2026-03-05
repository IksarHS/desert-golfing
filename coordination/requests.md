# Cross-Agent Change Requests

When you need a change in another agent's file, add a request here. The owning agent will review and implement.

## Format

```
### REQ-NNN: [short title]
**From:** [your agent name]
**To:** [owner agent name]
**File:** [file path]
**Priority:** low / medium / high
**Status:** open / accepted / done / declined

**Description:**
What change is needed and why.

**Suggested implementation:**
Optional: specific code or approach suggestion.
```

---

### REQ-001: Apply camera shake offset in draw()
**From:** Core Gameplay
**To:** Art Direction
**File:** `src/art.js`
**Priority:** medium
**Status:** open

**Description:**
Gameplay now exposes `_cameraShakeX` and `_cameraShakeY` globals (small pixel offsets that decay after hard impacts). Art.js should apply these as a translate offset in `draw()` so the screen shakes visually on hard ball impacts.

**Suggested implementation:**
At the top of `draw()`, add `ctx.save(); ctx.translate(_cameraShakeX, _cameraShakeY);` and `ctx.restore();` at the end (or offset `camera.x` temporarily).

### REQ-002: Change cup shape to rectangular for better ball physics
**From:** Core Gameplay
**To:** Level Design
**File:** `src/level-design.js`
**Priority:** high
**Status:** done

**Description:**
The V-shaped cup (wallInset = halfW - 2) creates very steep ~51° walls with only a 4px flat bottom. The ball has difficulty settling in the cup — it bounces off the steep walls instead of rolling in naturally. A nearly rectangular cup (wallInset = 3) with a wide flat bottom works much better for gameplay feel.

**Suggested implementation:**
In `placeCup()`, change `const wallInset = halfW - 2;` to `const wallInset = 3;` and update the comment to reflect the rectangular shape.
