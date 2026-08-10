---
name: design
description: >-
  Adds polished main-section UI animations that match the app theme: colorful
  lighting, no visual juggling, clear hierarchy, easy to understand. Use when
  the user invokes /design, asks for hero/main-section animation, landing visual
  polish, process rings, glow effects, or theme-aligned motion design.
disable-model-invocation: true
---

# Design

## Intent (verbatim)

could you please addd such an aimation on the main section it become good to look and valid according to the main theme of the application , there is no juggling in the desing , the design is colorfull iwth lightening and perfect to view and easy to understand

## When to apply

Use this skill when the user asks for `/design`, main-section / hero animation, process rings, glow/lighting polish, or theme-aligned motion on the landing visual.

## Theme tokens (this app)

Prefer existing CSS variables and teal/green hospital language — do not invent a new palette:

- Brand greens: `--green` `#007A46`, `--deep` `#005C35`, `--accent` `#138A58`
- Soft grounds: `--pale` `#EAF6F0`, `--wash` `#F4FBF7`
- Hero / voice stage: deep teal night (`#03110d`–`#073429`) with mint/cyan highlights (`#55f2af`, `#29d7b3`, `#47d9ed`)
- Process tones: teal → cyan → blue → violet (sequential, not rainbow noise)
- Type: Manrope / Outfit for UI; keep labels short and high-contrast on dark stage

## Design rules

1. **One composition** — Main section reads as one focal scene (mic / process ring), not a dashboard of competing cards.
2. **No juggling** — Avoid random particle chaos, competing loops at different speeds, emoji, neon purple defaults, multi-layer shadow stacks, or overlapping motion that fights the eye.
3. **Colorful with lighting** — Use soft auras, gradient strokes, beacon glow, and step glows tied to the active state. Lighting must reinforce hierarchy (active step brightest).
4. **Easy to understand** — Numbered steps, short titles, one supporting line. Connection arcs must clearly link 1→2→3→4.
5. **Theme-valid** — Motion and color must feel like Shenaz Care (calm, clinical-premium, teal), not a generic AI purple template.

## Animation standards

| Element | Behavior |
|---------|----------|
| Process links | Draw stroke along the ring when moving to the next step; lit segments stay glowing |
| Active step | Strong glow + slight node scale; previous steps stay dimmer “done” |
| Ring / beacon | Smooth clockwise travel along the process arc; ease `power1.inOut` / `sine.inOut` |
| Wave ticks | Gentle pulse only; never overwrite rotate transforms |
| Idle mic | Soft breath scale (~1.03), slow |
| Reduced motion | Static final state; no looping timelines |

Timing guide: ~1.2–1.5s per link draw, short hold (~0.4–0.6s), clean reset. Prefer GSAP in existing `VoiceAgentVisualizer` / landing intro patterns in `src/App.jsx`.

## Layout & spacing

- Give the visualizer clear margin from hero copy; keep step labels inside the stage with consistent padding/gap (node ↔ text ~8–10px).
- Align step text in a stable column; left labels for right-side steps (`side: end`), right-aligned for left-side steps (`side: start`).
- Place nodes on the ring radius; connectors and beacon share the same radius so the circle reads as one professional orbit.

## Implementation checklist

```
Design Progress:
- [ ] Read current main-section markup/CSS (App.jsx VoiceAgentVisualizer, App.css .vav-*)
- [ ] Confirm theme colors (no new unrelated palette)
- [ ] Spacing: margin/padding around stage + step text alignment
- [ ] Link animation: segment draw 1→2→3→4 with glow on arrival
- [ ] Active step glow stronger than done/upcoming
- [ ] Ring/beacon rotation smooth and on-path
- [ ] No competing/janky loops; honor prefers-reduced-motion
- [ ] Verify desktop + mobile: steps readable, nothing clipped
```

## Do / Don’t

**Do**
- Reuse `.vav-*` structure and CSS variables
- Soft gradients, filtered SVG glow, purposeful 2–3 motions
- Clear process story matching agent states when relevant

**Don’t**
- Add clutter (stat chips, floating badges, extra cards in the hero visual)
- Fight CSS transforms with GSAP on the same element (split rotate vs scale)
- Leave intro animations that force step `opacity: 0` permanently
