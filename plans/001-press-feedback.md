# 001 — Add press feedback to every pressable control

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`style.css`), ~15 changed lines

## Problem

No button in the app reacts when it is pressed. On a phone (the main way this
converter is used) a tap on the swap button, a quick-pick chip, a currency
button or a compare row gives no physical response — the only feedback is a
hover background, which touch screens don't show reliably. Taps feel dead.

Current transitions (all in `style.css`, none include a press state):

```css
/* style.css:141 — .icon-btn */
  transition: color .15s var(--ease), background-color .15s var(--ease);

/* style.css:218 — .currency-btn */
  transition: border-color .15s var(--ease), background-color .15s var(--ease);

/* style.css:243-246 — .swap */
  transition: transform .3s var(--ease), background-color .15s var(--ease), color .15s var(--ease);
}
.swap:hover { background: var(--raised); color: var(--ink); }
.swap.flip { transform: rotate(180deg); }

/* style.css:314 — .pill-btn */
  transition: background-color .15s var(--ease), color .15s var(--ease);

/* style.css:334 — .chip */
  transition: background-color .15s var(--ease), border-color .15s var(--ease), color .15s var(--ease);

/* style.css:378 — .fav-row */
  transition: background-color .15s var(--ease);

/* style.css:399 — .remove-btn */
  transition: background-color .15s var(--ease), color .15s var(--ease);

/* style.css:518 — .picker-item */
  transition: background-color .12s var(--ease);

/* style.css:350-360 — .link-btn has no transition at all */
```

## Target

Every pressable shrinks slightly while held, using the individual `scale`
property (NOT `transform`) so it composes with the swap button's rotation.

- Small controls: `scale: 0.97`
- Wide rows/buttons (`.currency-btn`, `.fav-row`, `.picker-item`): `scale: 0.98` (0.97 on a full-width row reads as a lurch)
- Press transition: `scale 160ms var(--ease)` (`--ease` is this repo's ease-out token, `cubic-bezier(.22, 1, .36, 1)`, defined at `style.css:14`)
- The swap button's flip moves from `transform: rotate(180deg)` to the individual `rotate: 180deg` property, so `scale` and `rotate` animate independently.

```css
/* target: shared press rule */
:is(.icon-btn, .swap, .pill-btn, .chip, .remove-btn, .link-btn):active:not(:disabled) { scale: 0.97; }
:is(.currency-btn, .fav-row, .picker-item):active { scale: 0.98; }
```

## Repo conventions to follow

- Plain CSS, no libraries. Easing comes from the single token `--ease` at `style.css:14`; durations are written inline (`.15s`, `.12s`). Write the new duration as `160ms`.
- Each component lists its transitioned properties explicitly in a `transition:` shorthand (never `transition: all`). Keep that pattern: append to the existing list.
- Exemplar: `style.css:141` (`.icon-btn`) — explicit properties, `var(--ease)`.

## Steps

1. `style.css:141` (`.icon-btn`): change to
   `transition: color .15s var(--ease), background-color .15s var(--ease), scale 160ms var(--ease);`
2. `style.css:218` (`.currency-btn`): change to
   `transition: border-color .15s var(--ease), background-color .15s var(--ease), scale 160ms var(--ease);`
3. `style.css:243` (`.swap`): change to
   `transition: rotate .3s var(--ease), scale 160ms var(--ease), background-color .15s var(--ease), color .15s var(--ease);`
4. `style.css:246`: change `.swap.flip { transform: rotate(180deg); }` to `.swap.flip { rotate: 180deg; }`
5. `style.css:314` (`.pill-btn`): change to
   `transition: background-color .15s var(--ease), color .15s var(--ease), scale 160ms var(--ease);`
6. `style.css:334` (`.chip`): change to
   `transition: background-color .15s var(--ease), border-color .15s var(--ease), color .15s var(--ease), scale 160ms var(--ease);`
7. `style.css:378` (`.fav-row`): change to
   `transition: background-color .15s var(--ease), scale 160ms var(--ease);`
8. `style.css:399` (`.remove-btn`): change to
   `transition: background-color .15s var(--ease), color .15s var(--ease), scale 160ms var(--ease);`
9. `style.css:518` (`.picker-item`): change to
   `transition: background-color .12s var(--ease), scale 160ms var(--ease);`
10. `.link-btn` block (`style.css:350-360`): add the line `transition: scale 160ms var(--ease);` before the closing `}`.
11. Insert this new section immediately above the line `@media (max-width: 520px) {` (currently `style.css:526`):

```css
/* Press feedback: pressables shrink slightly while held */
:is(.icon-btn, .swap, .pill-btn, .chip, .remove-btn, .link-btn):active:not(:disabled) { scale: 0.97; }
:is(.currency-btn, .fav-row, .picker-item):active { scale: 0.98; }
```

## Boundaries

- Do NOT touch `app.js` or `index.html`.
- Do NOT use `transform` for the press — it would overwrite the swap's rotation. Use `scale` / `rotate` properties only.
- Do NOT change the dialog rules (`style.css:416-465`).
- Do NOT change the reduced-motion block at `style.css:545-548` (plan 003 handles it).
- Do NOT change the swap rotation duration/curve (plan 002 handles it).
- If any quoted line doesn't match what you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: from the repo root run `python -m http.server 5173`, open http://localhost:5173, open DevTools console: no errors. `git diff --stat` shows only `style.css`.
- **Feel check**:
  - Press and hold each of: refresh, theme, swap, From/To buttons, Copy, Add to compare, a chip, a compare row, the × on a compare row, "+ Add". Each visibly shrinks while held and springs back on release.
  - Tap swap repeatedly: the icon still rotates 180° each tap, and the press shrink happens at the same time without cancelling the rotation.
  - Disabled Copy button (when no rate) does NOT shrink.
  - DevTools → Animations panel at 10%: the shrink starts immediately on press (ease-out), no delay.
- **Done when**: all ten control types shrink on press, swap still rotates, no console errors.
