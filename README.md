# Desert Golfing

A Desert Golfing clone built as a browser game with procedural terrain generation.

## Quick Start

```bash
git clone https://github.com/IksarHS/desert-golfing.git
cd desert-golfing
npm start
```

Open http://localhost:3002/index.html in your browser.

## Controls

- **Click and drag** to aim (drag away from target, release to shoot)
- **Touch and drag** on mobile
- **Backtick (`)** to toggle debug panels

## Architecture

The game is split into 6 JS files loaded via `<script>` tags. Each file has a designated owner agent. See `CLAUDE.md` for full architecture docs and coordination rules.

| File | Owner |
|------|-------|
| `src/shared.js` | Shared — constants, state, utilities |
| `src/level-design.js` | Level Design agent |
| `src/art.js` | Art Direction agent |
| `src/gameplay.js` | Core Gameplay agent |
| `src/debug.js` | QA/Testing agent |
| `src/main.js` | Shared — game loop |

## Contributing

1. Read `CLAUDE.md` for architecture and rules
2. Check `coordination/status.md` for current agent status
3. Work only on files you own
4. File cross-agent requests in `coordination/requests.md`
