# Make the compare section's heading say "Compare"

Written against: 79adaaf

## Evidence chain

- Surface: `index.html` single page, compare card (`<section class="card compare">`), rendered by `renderFavs()` in `app.js`
- Problem: Every control that leads into this section calls it "compare", but its heading never says so at runtime. The result button reads "Add to compare" / "In compare" (`app.js`, `render()`, the `els.favBtn` label), the picker title in fav mode is "Add to compare" (`openPicker()` title map), and the empty state is "Star a currency to compare it here" (`renderFavs()`). The heading markup is `<h2 id="compareTitle">Compare</h2>` (`index.html`), but `renderFavs()` overwrites it on every render with `${symbolOf(state.from)}${number(amt, 6)} in`, e.g. "₱1,000 in". So users are sent to a "compare" section that is never labeled.
- Design evidence: direct contradiction between user-facing labels in the same task (the static markup and three runtime labels say "Compare"; the runtime heading drops it). No design documentation exists in the repo.
- Owner: `app.js` → `renderFavs(amt)`, first line (`els.compareTitle.textContent = ...`)
- Scope and affected surfaces: the compare card heading only
- Uncertainty: none

## Design decision

Keep the amount in the heading, and put back the word the rest of the interface uses for this section: `Compare ₱1,000 in`. This fixes the contradiction at its single owner (the runtime heading) without renaming the button, picker title or empty state, which already agree with each other.

## Reuse

- Existing helpers `symbolOf(code)` and `number(value, maxDigits)` in `app.js`. Keep the exact amount formatting already used, so the heading still matches the amount field and the "1,000 Philippine Peso =" line.
- Exemplar: `els.resultFrom.textContent` in `render()`, which formats the amount the same way.

No new primitive is needed.

## Changes

1. `app.js`, function `renderFavs(amt)`, first statement
   - Change: replace
     `els.compareTitle.textContent = \`${symbolOf(state.from)}${number(amt, 6)} in\`;`
     with
     `els.compareTitle.textContent = \`Compare ${symbolOf(state.from)}${number(amt, 6)} in\`;`
   - Preserve: the amount formatting, the `h2` styling (`.compare-head h2` in `style.css`), the "+ Add" button beside it, and `aria-labelledby="compareTitle"` on the section.
   - Verify: with amount 1,000 and From = PHP, the heading reads "Compare ₱1,000 in". Change From to JPY and it reads "Compare ¥1,000 in".

## Scope

- Inherit: the compare card heading
- Verify: the heading still fits on one line next to "+ Add" at 360px wide with a long amount (e.g. 1,234,567.89), in light and dark mode
- Exclude: the favBtn labels, picker title, empty-state copy, and the "tap refresh" status text (separate, unresolved candidate)

## Validation

- Product: add a currency with "Add to compare". The section it lands in is headed "Compare …".
- Interface: check the heading at 360px, 390px and desktop widths; amounts 0, 1,000 and 1,234,567.89; From = PHP, JPY and a currency whose symbol is its code (e.g. SAR); light and dark mode
- System: only the existing `symbolOf` / `number` helpers are used, with no new formatting path
- Repository: `node --check app.js` → no output (syntax OK)

## Stop conditions

- Stop if `renderFavs()` no longer owns the heading text, or if the heading has been redesigned since 79adaaf.
- Stop if "Compare" no longer appears in the favBtn / picker labels (the contradiction would then be different).

## Design documentation

- After acceptance and validation: none (the repo has no design documentation)
