# 004 — Stop hover highlights sticking on touch screens

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: LOW
- **Category**: Accessibility
- **Estimated scope**: 1 file (`style.css`), 8 rules

## Problem

Touch browsers fire a fake `:hover` on tap and keep it until you tap
elsewhere. On a phone, tapping a quick-pick chip or a compare row leaves its
hover background stuck on, so it looks selected when it isn't.

Current ungated hover rules in `style.css`:

```css
/* style.css:143 */ .icon-btn:hover { color: var(--ink); background: var(--raised); }
/* style.css:220 */ .currency-btn:hover { background: var(--raised); }
/* style.css:245 */ .swap:hover { background: var(--raised); color: var(--ink); }
/* style.css:316 */ .pill-btn:hover { background: var(--bg); }
/* style.css:336 */ .chip:hover { background: var(--raised); }
/* style.css:380 */ .fav-row:hover { background: var(--raised); }
/* style.css:401 */ .remove-btn:hover { background: var(--raised); color: var(--ink); }
/* style.css:520 */ .picker-item:hover, .picker-item:focus-visible { background: var(--raised); outline: none; }
```

## Target

Hover styles apply only on devices with a real hovering pointer:
`@media (hover: hover) and (pointer: fine)`. Keyboard focus styling for
`.picker-item:focus-visible` stays ungated (it is not a hover).

```css
/* target, e.g. for the chip */
@media (hover: hover) and (pointer: fine) {
  .chip:hover { background: var(--raised); }
}
```

## Repo conventions to follow

- Keep each hover rule in its current position, directly under its component block, just wrapped — don't collect them into one block elsewhere.
- Native CSS nesting is already used in this file (`style.css:440-453`), but use a plain wrapping `@media` here for readability.

## Steps

Replace each line exactly as follows (same position in the file):

1. `style.css:143` → `@media (hover: hover) and (pointer: fine) { .icon-btn:hover { color: var(--ink); background: var(--raised); } }`
2. `style.css:220` → `@media (hover: hover) and (pointer: fine) { .currency-btn:hover { background: var(--raised); } }`
3. `style.css:245` → `@media (hover: hover) and (pointer: fine) { .swap:hover { background: var(--raised); color: var(--ink); } }`
4. `style.css:316` → `@media (hover: hover) and (pointer: fine) { .pill-btn:hover { background: var(--bg); } }`
5. `style.css:336` → `@media (hover: hover) and (pointer: fine) { .chip:hover { background: var(--raised); } }`
6. `style.css:380` → `@media (hover: hover) and (pointer: fine) { .fav-row:hover { background: var(--raised); } }`
7. `style.css:401` → `@media (hover: hover) and (pointer: fine) { .remove-btn:hover { background: var(--raised); color: var(--ink); } }`
8. `style.css:520` → two lines:
   ```css
   .picker-item:focus-visible { background: var(--raised); outline: none; }
   @media (hover: hover) and (pointer: fine) { .picker-item:hover { background: var(--raised); } }
   ```

(Line numbers may have shifted by a few lines if plans 001–003 ran first — match on the rule text, not the number.)

## Boundaries

- Do NOT gate `.amount-row:focus-within`, `#pickerSearch:focus`, `:focus-visible`, or `.chip.active` — those are not hover.
- Do NOT change any colors or transitions.
- Do NOT touch `app.js` or `index.html`.
- If a quoted rule isn't found, STOP and report.

## Verification

- **Mechanical**: serve with `python -m http.server 5173`, open http://localhost:5173, no console errors. `git diff --stat` shows only `style.css`. `grep -n ":hover" style.css` shows every `:hover` inside a `(hover: hover) and (pointer: fine)` media query.
- **Feel check**:
  - Desktop with a mouse: every hover highlight still appears as before.
  - DevTools device toolbar (a phone preset, touch on), or a real phone: tap a chip, then a compare row — no grey highlight stays behind after the tap.
  - Keyboard: open the picker, press ↓ — the focused item is still highlighted.
- **Done when**: no ungated `:hover` remains and keyboard focus in the picker is still visible.
