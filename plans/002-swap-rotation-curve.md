# 002 — Retime the swap icon rotation

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: LOW
- **Category**: Easing & duration
- **Depends on**: 001 (which converts the swap to the `rotate` property)
- **Estimated scope**: 1 file (`style.css`), 2 lines

## Problem

The swap button's icon turns 180° in place each time it is tapped. That is
on-screen movement (a morph), which calls for an ease-in-out curve, but it
uses the ease-out token at 300ms — the very top of the UI budget for a
control people tap repeatedly.

After plan 001, the line reads:

```css
/* style.css:243 — .swap (after plan 001) */
  transition: rotate .3s var(--ease), scale 160ms var(--ease), background-color .15s var(--ease), color .15s var(--ease);
```

Before plan 001 it reads `transition: transform .3s var(--ease), ...` — if you
see that, plan 001 has not been executed: STOP and run 001 first.

## Target

- Rotation: `220ms` with a strong ease-in-out curve `cubic-bezier(0.77, 0, 0.175, 1)`, stored as a new token `--ease-in-out`.
- Press scale, background and color timings stay exactly as they are.

```css
/* target */
  transition: rotate 220ms var(--ease-in-out), scale 160ms var(--ease), background-color .15s var(--ease), color .15s var(--ease);
```

## Repo conventions to follow

- Easing tokens live in the `:root` block at the top of `style.css`; the only one today is `--ease: cubic-bezier(.22, 1, .36, 1);` at `style.css:14`. Add the new token on the line directly after it.

## Steps

1. `style.css:14`: after the line `  --ease: cubic-bezier(.22, 1, .36, 1);` insert
   `  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`
   (If plan 006 already added `--ease-drawer` there, insert above or below it — order doesn't matter.)
2. In the `.swap` block, replace `rotate .3s var(--ease)` with `rotate 220ms var(--ease-in-out)`. Leave the rest of that `transition:` line unchanged.

## Boundaries

- Do NOT change `--ease` or any other transition.
- Do NOT touch `app.js` (the `flip` class toggle at `app.js:503` stays).
- If the `.swap` transition doesn't contain `rotate .3s var(--ease)`, STOP and report.

## Verification

- **Mechanical**: serve with `python -m http.server 5173`, open http://localhost:5173, no console errors. `git diff --stat` shows only `style.css`.
- **Feel check**:
  - Tap swap: the icon turns with a gentle start and settle, and finishes noticeably sooner than before.
  - Tap swap rapidly 4–5 times: the rotation retargets smoothly (it's a transition), never restarting from zero or jumping.
  - DevTools Animations panel at 10%: the rotation is symmetric — slow start, fast middle, slow end — over 220ms.
- **Done when**: the swap rotation runs 220ms on `--ease-in-out`, and the token exists in `:root`.
