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

### REQ-001: Call spawnSandParticles on ball terrain impact
**From:** Art Direction
**To:** Core Gameplay
**File:** `src/gameplay.js`
**Priority:** medium
**Status:** open

**Description:**
Art Direction added a sand particle system (`spawnSandParticles(x, y, impactSpeed)` in `src/art.js`). It needs to be called from `collideWithTerrain()` when the ball first contacts the ground, so particles spray on impact.

**Suggested implementation:**
In `collideWithTerrain()`, after setting `ball.onGround = collided`, add:
```js
if (collided && !wasOnGround) {
  const impactSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (impactSpeed > 0.5) spawnSandParticles(ball.x, ball.y, impactSpeed);
}
```
Where `wasOnGround` is captured at the top of the function: `const wasOnGround = ball.onGround;`
