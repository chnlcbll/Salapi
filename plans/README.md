# Animation plans

Written by `improve-animations` from an audit at commit `96f9f0f`. Each plan is
self-contained: hand one file to any agent (or run
`improve-animations execute plans/<file>`) and it has everything it needs.

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Add press feedback to every pressable control](001-press-feedback.md) | MEDIUM | Physicality | DONE |
| 002 | [Retime the swap icon rotation](002-swap-rotation-curve.md) | LOW | Easing & duration | DONE |
| 003 | [Make reduced motion drop movement, not all feedback](003-gentler-reduced-motion.md) | MEDIUM | Accessibility | DONE |
| 004 | [Stop hover highlights sticking on touch screens](004-gate-hover-for-touch.md) | LOW | Accessibility | DONE |
| 005 | [Make the theme switch change everything at once](005-snap-theme-switch.md) | MEDIUM | Cohesion | DONE |
| 006 | [Slide the picker up from the bottom on phones](006-mobile-sheet-slide.md) | MEDIUM | Physicality | DONE |

## Recommended order

Run them in number order, one at a time, re-serving the page between plans.

1. **001** first — it converts the swap flip to the `rotate` property and adds the `scale` press that later plans reference.
2. **002** after 001 — it edits the `rotate` transition 001 creates.
3. **003** after 001 and 002 — its reduced-motion rules undo the press `scale` and swap `rotate` they add.
4. **004**, **005**, **006** are independent of each other and of 001–003; any order works. (002 and 006 both add a token next to `--ease` in `:root`; whichever runs second just adds its line alongside.)

## Dependencies

- 002 → needs 001
- 003 → needs 001, 002
- 004, 005, 006 → none

## Optional ideas (not planned)

Additive polish from the audit, not corrections. Plan any of these on request:

- **Theme switch reveal**: a circular View Transition spreading from the theme button. It's a rare action, so it can afford some delight; falls back to the instant switch from plan 005 where View Transitions aren't supported.
- **"Copied" label**: crossfade "Copy" → "Copied" with a subtle `filter: blur(2px)` mask instead of an instant text swap.
- **Compare row removal**: fade and collapse a removed row instead of the list jumping.
