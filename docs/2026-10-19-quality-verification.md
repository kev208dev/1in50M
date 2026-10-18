# Quality pass — 2026-10-19

## Changes

- System feed retains 50 recent records, follows new messages only when already at the latest record, and preserves the reader's record when older entries expire.
- Hidden views defer feed rendering until visible. Loading another life resets the feed position.
- Clicking a feed record pauses playback and opens its full text with the correct historical date in the existing story panel. Only the message surface can scroll; resuming playback restores the live context.
- Investment controls display cash and asset balances and explain unavailable actions before the player attempts a transaction. Property selection still enforces available cash.
- Financial transaction and history IDs remain unique beyond the 100-transaction window. Each newly purchased lottery ticket has a new deterministic draw; save/reload preserves a pending draw.
- Zero, negative, and non-finite transaction amounts are rejected.
- Loading a saved life restores the latest available event detail without opening it automatically or inventing a new family event.

## Automated verification

- `npm test`: **296 passed, 0 failed** (75.0 seconds).
- Includes 100 complete seeded lives; 1950, 1990, 2026 and future era runs; 105 same-year financial actions; 500 lottery draws; invalid-amount rejection; feed scroll anchors; saved-event restoration; historical-message context.
- `git diff --check` and `node --check dist/app.js`: passed.
- Independent code review found two feed-position issues; both were fixed and covered by regression tests. Follow-up review found no remaining consequential issue in that reviewed diff.

## Actual browser verification

Tested the local static build using the in-app browser through UI controls, without injected game state.

- 1440 × 900: title → roulette → life; normal event feed; adult finance menu.
- 390 × 844: past-message reading, pause behavior, historical date, unclamped message text, investment tabs and region selection.
- 844 × 390: message reading and property menu; the finance dialog remained inside the viewport with no internal dialog overflow (client/scroll height 350 px).
- Document dimensions matched the viewport at all three sizes: no page-level horizontal or vertical overflow in the checked states.
- Progressed a generated life from birth through age 30, with automatic decisions and explicit reflection/identity acknowledgements. Historical events did not interrupt with a full-screen dialog.
- Confirmed insufficient-cash/asset labels, pre-2010 crypto restriction, and property region selection retaining the cash requirement.
- Browser warning/error log: empty.

Actual successful purchases and lottery settlement are covered by automated tests, not this browser sample (the sampled life had insufficient cash). This pass does not claim exhaustive testing of every seed, screen size or visual equivalence to Figma.
