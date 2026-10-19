# Vertical message dashboard

## Requested outcome

Replace the horizontal ticker with a vertically growing message window. Make money, messages, school, character information and age easier to locate. Preserve game rules, start-screen design and saved lives.

## Implementation

- Chronological messages now occupy the central workspace, one full-text card per row. New messages append below old messages. The renderer follows the bottom only when the reader was already there; otherwise it preserves the visible record and offset.
- The top bar emphasizes age, year, net worth, cash and monthly income. School, job, housing and relationships sit immediately above the message window.
- Desktop retains side panels for status and character details. Mobile retains panel tabs and uses a compact status grid above messages; landscape puts status beside messages.
- The footer contains playback controls and the life timeline, not a horizontal feed. The home action remains available in the age bar.
- Presentation is scoped to the life screen in `dist/life-dashboard.css`. Intro/roulette styles and simulation rules are unchanged.

## Verification and limits

- Updated vertical scroll regression tests: first render, unchanged DOM, reader position, following new records, hidden-to-visible transition, new-life reset and retention when the 50-record window rolls forward.
- Full test suite: 296 passing tests, zero failures.
- JavaScript syntax and whitespace checks pass.
- Independent read-only review checked the DOM move, scroll algorithm and interaction with existing responsive CSS. Legacy mobile button width/pseudo-label, feed height/max-height and toolbar transform conflicts were corrected.
- **No fresh rendered-browser or screenshot verification for this change.** Browser access returned “Local browser use is disabled in Work settings.” No alternative automation was used to bypass this restriction. Responsive rules were inspected in code; actual viewport fit remains a visual-verification limitation.
