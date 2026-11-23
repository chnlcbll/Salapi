# 006 — Slide the picker up from the bottom on phones

- **Status**: DONE (merged in 8a580d4)
- **Commit**: 96f9f0f
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`style.css`), ~15 lines

## Problem

On screens up to 520px wide the currency picker is a bottom sheet (it's pinned
to the bottom edge with only its top corners rounded), but it enters by fading
in and rising just 12px — the same motion as the centered desktop modal. A
sheet anchored to the bottom edge should travel from that edge, so the motion
explains where it came from.

```css
/* style.css:417-437 — dialog base (excerpt) */
dialog {
  ...
  opacity: 0;
  transition-property: opacity, transform, display, overlay;
  transition-duration: .22s;
  transition-timing-function: var(--ease);
  transition-behavior: allow-discrete;

  @media (prefers-reduced-motion: no-preference) {
    transform: translateY(12px);
  }
}

/* style.css:440-447 — open state (excerpt) */
:is(dialog[open]):where(:not([data-closing])) {
  opacity: 1;
  @starting-style { opacity: 0; }

  @media (prefers-reduced-motion: no-preference) {
    transform: none;
    @starting-style { transform: translateY(12px); }
  }
  ...
}

/* style.css:526-534 — mobile sheet layout (current, no motion overrides) */
@media (max-width: 520px) {
  dialog {
    width: 100%;
    max-width: 100%;
    margin: auto 0 0;
    border-radius: 16px 16px 0 0;
    max-height: 88vh;
  }
  .picker-inner { height: 88vh; }
  ...
}
```

The desktop modal motion is correct (modals are exempt from origin rules) —
leave it as is.

## Target

On ≤520px screens, with no reduced-motion preference:
- The sheet slides from fully off-screen: `translateY(100%)` (its own height — no pixel offsets).
- It stays fully opaque while sliding (`opacity: 1`) — sheets slide, they don't fade.
- Curve: the iOS-style drawer curve `cubic-bezier(0.32, 0.72, 0, 1)`, stored as token `--ease-drawer`.
- Duration: `300ms` for the sheet and its backdrop.
- Closing reverses the same path (exit = transition back to the base state; already wired, including the `data-closing` fallback in `app.js`).

With reduced motion on, phones keep the existing short fade (no slide).

```css
/* target — appended inside the existing @media (max-width: 520px) block */
  @media (prefers-reduced-motion: no-preference) {
    dialog {
      opacity: 1;
      transform: translateY(100%);
      transition-duration: 300ms;
      transition-timing-function: var(--ease-drawer);
    }
    :is(dialog[open]):where(:not([data-closing])) {
      opacity: 1;
      @starting-style { opacity: 1; transform: translateY(100%); }
    }
    dialog::backdrop { transition-duration: 300ms; }
  }
```

## Repo conventions to follow

- Easing tokens live in `:root` at the top of `style.css` (`--ease` at `style.css:14`). Add `--ease-drawer` on the line after it (or after `--ease-in-out` if plan 002 added it).
- Native CSS nesting with `@starting-style` inside the open-state selector is already the pattern — exemplar `style.css:440-453`.
- Specificity: the open-state selector `:is(dialog[open]):where(:not([data-closing]))` (0,1,1) already sets `transform: none`, which beats the mobile `dialog` (0,0,1) closed-state `translateY(100%)`. Do not add `!important`.

## Steps

1. `style.css`, in `:root`, after `  --ease: cubic-bezier(.22, 1, .36, 1);` insert
   `  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);`
2. In the `@media (max-width: 520px) {` block (currently `style.css:526-538`), add the target nested block shown above as the last thing before that media query's closing `}`.

## Boundaries

- Do NOT change the base `dialog` rules or the desktop motion (`style.css:417-465`).
- Do NOT change `app.js` — `closePicker()` and its `data-closing` fallback already work with any transform.
- Do NOT use pixel offsets for the slide; use `translateY(100%)`.
- If the mobile media query doesn't contain the quoted `dialog { width: 100%; ... }` rule, STOP and report.

## Verification

- **Mechanical**: serve with `python -m http.server 5173`, open http://localhost:5173, no console errors. `git diff --stat` shows only `style.css`.
- **Feel check** (DevTools device toolbar, a phone preset ≤ 520px wide, or a real phone):
  - Tap From/To: the sheet slides up from below the screen edge, fully opaque, decelerating into place; the backdrop dims alongside.
  - Close via ×, Esc, tapping the backdrop, and by picking a currency: each slides back down off-screen (in Chrome/Edge; in Firefox/Safari the `data-closing` fallback plays the same slide before closing).
  - Tap From, then immediately tap the backdrop mid-animation: the sheet reverses smoothly from where it is (transition retargets, no jump).
  - DevTools Animations panel at 10%: the slide covers the sheet's full height over 300ms with a fast start and long, soft settle.
  - Desktop width (> 520px): the picker still appears centered with the small rise + fade, unchanged.
  - With prefers-reduced-motion: reduce emulated, on phone width: the sheet fades in place, no slide.
- **Done when**: phone-width open/close slides from the bottom edge with `--ease-drawer` at 300ms, desktop is unchanged, and reduced motion gets a fade.
