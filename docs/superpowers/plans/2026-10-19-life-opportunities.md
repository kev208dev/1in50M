# Life opportunities implementation

## Goal / spec
Show every decision option together, replace unavoidable early-adult deficits with explicit affordable earning paths, and make circumstances and previous decisions unlock different Korean-life dilemmas and consequences. Retain genuine financial risk. No runtime AI service, payments, or claims to exhaustively simulate every Korean life.

## Architecture
Keep the deterministic life engine. Extend its authored decision registry with contextual stories and follow-ups. Resolve affordable investment amounts before both rendering and application. Share the annual budget calculation with visible previews. Scope responsive choice styling to the decision dialog.

## Global constraints
Never modify sources/. Preserve existing saves and asset accounting. Do not erase existing debts. Costs/incomes are game balance assumptions, not official wage/benefit guarantees. Retain protected choices, historical availability, user control, and message-only scrolling. Existing main/deploy workflow is user-authorized.

## Review focus
Money creation or double spending; custom jobs overwritten by automatic hiring; contextual branches that cannot occur or repeat; low-income/negative-cash escape routes; mobile six-option fit; real salary and cost preview; existing saved lives.

### Task 1: Budget and attainable earnings
- Add failing tests for family-supported students, unsupported adults, working savings, early jobs and preservation of selected careers.
- Implement personal (not whole-household) family living contributions, finite household support for young non-earners, explicit annual settlement history. Employment choices produce actual income. No free unlimited support.
- Verify: node --test tests/career-economy.test.mjs tests/opportunities.test.mjs. Expected: all pass.

### Task 2: Contextual opportunities
- Add failing tests for small investments with preserved reserves, no-cash work alternative, life-specific eligibility and follow-up consequences.
- Add distinct student/work/care/disability/region/business dilemmas and prior-choice follow-ups with meaningful effects and multiple no-upfront-cost paths.
- Verify: node --test tests/opportunities.test.mjs tests/finance-paths.test.mjs. Expected: all pass.

### Task 3: All options at once
- Test renderer economic previews. Remove decision pagination; compact grid with readable cost/income/risk and lock reason. Keep full choice content available.
- Verify through real browser at desktop, narrow mobile and landscape; full npm test. Expected: every option visible, no choice or page scrolling, no clipped controls, green suite.

### Task 4: Final verification and delivery
- Fresh-context review, targeted regression fixes, full suite, compare representative life budgets. Commit and publish through existing GitHub Pages flow. Verify deployed artifacts and report bounded evidence.
