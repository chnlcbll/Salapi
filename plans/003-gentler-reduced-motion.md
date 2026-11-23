# 003 — Make reduced motion drop movement, not all feedback

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Depends on**: 001 and 002 (this plan references the `scale`/`rotate` press and swap rules they add)
- **Estimated scope**: 2 files (`style.css`, `app.js`), ~15 lines

## Problem

Two issues for people who turn on "reduce motion" in their OS:

1. The reduced-motion rule kills **every** transition and animation, including harmless color and background fades and the loading spinner. Reduced motion means fewer, gentler animations — not zero feedback.

```css
/* style.css:545-548 — current */
/* Reduced motion: no movement anywhere; the picker keeps a short fade (set above) */
@media (prefers-reduced-motion: reduce) {
  *:not(dialog), *::before, *::after { transition: none !important; animation: none !important; }
}
```

2. Tapping a compare row smooth-scrolls to the top regardless of the setting (JS smooth scroll ignores CSS media queries):

```js
// app.js:531 — current
      window.scrollTo({ top: 0, behavior: 'smooth' });
```

## Target

Under `prefers-reduced-motion: reduce`:
- Color, background, border and opacity transitions keep working.
- Movement is removed: no press shrink (`scale`), no swap icon rotation, and the spinner becomes an opacity pulse instead of a spin.
- The picker dialog keeps its existing short fade (already handled at `style.css:463-465`; leave it).
- The compare-row scroll jumps instantly.

```css
/* target — replaces style.css:545-548 */
/* Reduced motion: drop movement (press shrink, rotation, spin), keep color/opacity feedback */
@media (prefers-reduced-motion: reduce) {
  :is(.icon-btn, .swap, .pill-btn, .chip, .remove-btn, .link-btn, .currency-btn, .fav-row, .picker-item):active { scale: none; }
  .swap { transition-property: background-color, color; }
  .swap.flip { rotate: none; }
  .icon-btn.spinning svg { animation: pulse 1s ease-in-out infinite; }
}
@keyframes pulse { 50% { opacity: .4; } }
```

```js
// target — app.js:531
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
```

## Repo conventions to follow

- Reduced-motion handling sits in `@media (prefers-reduced-motion: reduce)` blocks; the dialog's own one is the exemplar to imitate: `style.css:463-465` (`dialog { transition-duration: .1s; }` — shorten/soften rather than delete).
- The `:active` selector list must match plan 001's two press rules exactly (same nine classes).

## Steps

1. In `style.css`, replace the whole block at lines 545-548 (comment + media query quoted above) with the target CSS block above.
2. In `app.js:531`, replace `window.scrollTo({ top: 0, behavior: 'smooth' });` with the target line above.

## Boundaries

- Do NOT edit the dialog rules at `style.css:416-465`, including its reduced-motion block at 463-465.
- Do NOT add `!important` anywhere.
- Do NOT touch the theme code in `app.js` (lines ~606-638).
- If `style.css:545-548` or `app.js:531` don't match the quoted code, STOP and report.

## Verification

- **Mechanical**: serve with `python -m http.server 5173`, open http://localhost:5173, no console errors. `git diff --stat` shows only `style.css` and `app.js`.
- **Feel check** (DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce"):
  - Hover a chip / compare row with a mouse: the background still fades in (not instant).
  - Press and hold a button: it does NOT shrink.
  - Tap swap: currencies swap, the icon does NOT rotate.
  - Tap refresh: the icon pulses in opacity while loading instead of spinning.
  - Tap a compare row while scrolled down: the page jumps to the top instantly.
  - Open the currency picker: it still does a short fade (from the existing dialog rule).
  - Switch emulation back to "no-preference": press shrink, rotation, spin and smooth scroll all return.
- **Done when**: every item above behaves as described in both modes.
