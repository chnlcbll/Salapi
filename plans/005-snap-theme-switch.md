# 005 — Make the theme switch change everything at once

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files (`app.js`, `style.css`), ~15 lines

## Problem

When the header theme button is tapped, the page background and text swap
instantly, but every control with a `background-color`/`color`/`border-color`
transition (buttons, chips, compare rows) fades over 120–150ms. For a moment
the page shows dark surfaces with light-themed buttons (or the reverse) — a
visible double exposure. The same happens when the theme changes from another
tab via the `storage` event.

```js
// app.js:617-619 — current
  function applyTheme(theme) {
    schemeMeta.content = theme || 'light dark';
  }
```

`applyTheme` is called from the theme button click handler (`app.js:634`) and
the `storage` listener (`app.js:638`).

## Target

During a theme change, all transitions are disabled for one frame so every
element switches in the same frame. Normal hover/press transitions resume
right after.

```css
/* target — new rule in style.css */
.theme-switching *,
.theme-switching *::before,
.theme-switching *::after { transition: none !important; }
```

```js
// target — app.js, replaces applyTheme
  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    schemeMeta.content = theme || 'light dark';
    getComputedStyle(root).color; // flush the new colors while transitions are off
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
  }
```

## Repo conventions to follow

- Theme logic lives in the `// ---------- theme` section of `app.js` (lines ~606-638); keep the change inside `applyTheme` so both callers get it.
- The inline script in `index.html` that applies a saved theme before first paint must NOT change — its exact text is hashed in the Content-Security-Policy. This plan does not touch `index.html` at all.
- `!important` is acceptable here only because this rule must beat every component's `transition` for one frame; it is the only `!important` this plan adds.

## Steps

1. In `app.js`, replace the three-line `applyTheme` function (quoted above, `app.js:617-619`) with the target function above.
2. In `style.css`, add the target CSS rule directly above the comment `/* Theme button: show the action for the opposite of what's rendered` (near the top of the file, after the dark-token blocks).

## Boundaries

- Do NOT touch `index.html` (CSP hash would break).
- Do NOT change the toggle logic (target/system comparison, localStorage) in the click handler.
- Do NOT add a View Transition or crossfade — this plan is about snapping cleanly. (A circular reveal is listed as an optional idea in `plans/README.md`.)
- If `applyTheme` doesn't match the quoted code, STOP and report.

## Verification

- **Mechanical**: serve with `python -m http.server 5173`, open http://localhost:5173, no console errors (in particular no CSP violation). `git diff --stat` shows only `app.js` and `style.css`.
- **Feel check**:
  - Tap the theme button several times: the whole page, including chips, buttons and compare rows, switches in a single frame. No button lags behind in the old color.
  - DevTools Animations panel at 10%, then tap the theme button: no color transitions are recorded for the switch.
  - Right after switching, hover a chip with the mouse: its hover fade still animates (transitions came back).
  - Open the app in two tabs, switch theme in one: the other switches cleanly too.
- **Done when**: the switch shows no mixed-theme frame and hover transitions still work afterwards.
