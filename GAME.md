# Terrain Golf — Prototype Vision Document

**March 2026 · For development agents**

> One-liner: Desert Golfing across a procedurally generated golf universe.

Terrain Golf is a 2D side-view golf game built on the Desert Golfing formula: drag to aim, release to shoot, get the ball in the hole. The game is set across a procedurally generated universe of golf — organized into systems, worlds, and courses — all generated from a shared seed so every player experiences the same holes. Players start on a single course on a single world, and through play, expand outward to new courses, new worlds, and eventually new star systems. Different terrain types (grass, rock, ice, mud, sand) with distinct physics properties create variety and challenge across the universe. The experience is primarily solo and zen, but with some undetermined level of multiplayer presence — whether that looks like Dark Souls bloodstains, Journey's silent companions, or something else entirely is still being explored.

## 1. Core Gameplay

### 1.1 Shot-Making

The fundamental action is Desert Golfing's drag-to-shoot mechanic. The player drags from the ball to set angle and power, then releases. The ball follows physics, bouncing and rolling across terrain until it stops or enters the hole. Stroke count is tracked. The feel should be satisfying and responsive — this is the thing the player does thousands of times, so it must feel great.

### 1.2 Physics Surfaces

Different terrain surfaces have different physical properties. Each surface type is communicated primarily through color. The player builds a visual vocabulary over time: green means grass (normal, predictable), blue means ice (slippery, low friction), brown means mud (sticky, high friction), red means rock (very bouncy), and so on. No labels or tutorials — the player learns what each surface does by hitting balls into it.

### 1.3 Hole Generation

Most holes are procedurally generated using whatever terrain types are available on that world. Some holes end up straightforward, others end up complex — not because they were designed as puzzles, but because the terrain combination naturally creates interesting physics situations. A hole with a rocky cliff and an icy slope plays differently than one with gentle grassy hills, and the player adapts their approach based on what they see. If interesting holes are happening regularly, it's because the generators have been made smart — the creative work is in crafting and tuning the generators, not individual holes.

## 2. Game Structure

### 2.1 Hierarchy

The game is organized into a hierarchy: courses, worlds, and systems. A course is a set of holes you can complete in a sitting. A world contains multiple courses and represents a few sessions of play. A system contains multiple worlds and is a longer-term accomplishment. Completing a course gives the player a score and a sense of completion. Completing a world feels like finishing a chapter. Completing a system is a milestone.

### 2.2 Diversity at Each Level

The universe is generated with decreasing diversity at each level. A system contains worlds that can be quite different from each other — desert, water, grass, mud — but they share a coherent reality, like they belong to the same plane of existence. The starter system will probably feel like the real world, while later systems might get stranger — terrain that's alive, teleporting surfaces, reversed gravity.

A world within a system is more focused. It has a palette of around 4–5 terrain types and 20–30 decorative assets (foliage, clouds, rocks, creatures, etc.) that give it a consistent visual identity.

A course within a world is even narrower — just 1–3 terrain types and a small subset of that world's decorative assets. This means each course has a clear, readable character, while the world it belongs to feels varied across its courses.

### 2.3 Difficulty Progression

Difficulty steps up per course. Each course has its own internal arc — starting gentler and getting harder — but the baseline rises with each successive course. Course 1 might range from 0.0→0.5 difficulty, Course 2 from 0.3→0.7, Course 3 from 0.5→1.0. The player gets the satisfaction of a fresh start each course, but the game is clearly getting harder over time.

### 2.4 Travel

The experience of traveling between courses, worlds, and systems is TBD. There should be some ceremony to mark progression — completing a course, leaving a world, entering a new system should all feel like moments. One early idea was the golf ball dropping into a tiny spaceship that flies to the next destination. The exact treatment hasn't been figured out yet, but the feeling matters: you've finished something, and something new is ahead.

### 2.5 Player Experience Arc

The intended emotional sequence for a new player:

1. Start playing golf. It feels simple, quiet. Just you and the ball.
2. Complete the first course. Surprise — there's a score, a sense of completion. Courses are a thing.
3. Play more courses on this world. Notice the world has character — specific terrain types, a visual palette.
4. Complete all courses on the world. Move to a new world. It feels different — new terrain, new colors, new physics challenges.
5. Eventually complete a system. Move to a new one. The rules start to change — things get weirder.
6. Optionally engage with leaderboards, records, competition.

The game reveals its depth gradually. Nothing is front-loaded — no sign-up screen, no tutorial explaining worlds and courses. You just play golf and the game slowly shows you that it's bigger than you thought.

## 3. Generation

### 3.1 Shared Seeds

The entire universe is generated from a shared seed. This means every player experiences the same holes, courses, worlds, and systems. Player A's hole 5 on course 3 on the first world is identical to Player B's. This is essential for any future multiplayer, leaderboards, or community features to work.

### 3.2 Generator Design

The creative work is in building smart generators, not hand-designing content. Generators exist at each level of the hierarchy — system generators produce worlds, world generators produce courses, course generators produce holes. Each generator pulls from the asset and terrain palette available to it from the level above.

### 3.3 Internal Hole Editor

A hole editor exists as an internal design tool. It's used to hand-design holes, test terrain combinations, and discover what makes a good hole before encoding those patterns into generators. The editor is for R&D — understanding what makes good terrain so those patterns can be built into generators. Custom holes are not shipped content; the generators are the product.

## 4. Art Direction

### 4.1 Current Direction

The art style is still evolving. The current direction leans toward Desert Golfing's simplicity as the baseline — the same camera, framing, minimal UI, and side-view composition — with added color, terrain variety, and personality.

### 4.2 Visual Differentiation

A key challenge is differentiating from Desert Golfing visually. Differentiation comes from several directions: terrain color variety across surface types, illustrated outlines on terrain edges, simple props and decorative assets, and biome-specific palettes. The goal is a game that reads as its own thing in a screenshot — not a Desert Golfing clone.

### 4.3 Visual Principles

- Simplicity is a principle, not a limitation. Keep the visual language clean and readable.
- Color IS the mechanic. Surface type must be instantly readable from color alone.
- The game should look distinct from Desert Golfing even in a screenshot.
- Decorative assets follow the same inheritance model as terrain: systems define a broad asset pool, worlds narrow it, courses narrow further, and holes decorate using what's available to them.
- Props on the playing surface should have collision. Purely decorative assets should be placed where the ball can't go, so there's no ambiguity about what's interactive and what's not.

### 4.4 Prototype Art Scope

The initial prototype will not have decorative assets or backgrounds. Terrain is expressed through plain color and different physics only. The asset pipeline and decoration placement is future work — prove the golf is fun first, dress it up later.

## 5. Multiplayer

TBD. The game will have some level of multiplayer presence, but what that looks like hasn't been determined. For now, the focus is entirely on the single-player experience.

## 6. Current Technical Status

- Built in vanilla JavaScript with HTML5 Canvas 2D.
- Custom 2D physics engine with segment-based terrain collision, 2 substeps per frame.
- Procedural terrain generation with 21 archetypes and seeded PRNG (Mulberry32).
- Five working material types with distinct physics: sand, grass, ice, rock, mud.
- 2-layer parallax background system.
- Functional hole editor for internal design use.
- File-based course saving via custom dev server (JSON files, committable to git).
- Repo: github.com/iksarhs/desert-golfing

## 7. Prototype Goals

What the prototype needs to prove:

1. **The golf is fun across terrain types.** Multiple surface types create interesting, varied gameplay — not just frustration.
2. **Course structure works.** Completing a course feels like an accomplishment. Players want to play the next one.
3. **Generation is good enough.** Holes generated from smart generators are reliably fun without hand-design.
4. **Visual differentiation.** Even with plain color terrain and no decorative assets, the game doesn't look like a Desert Golfing clone.
5. **The hierarchy makes sense.** Course → World → System progression feels natural and motivating.

---

*This document reflects the prototype vision as of March 2026. It will evolve as design decisions are made through building and playtesting.*
