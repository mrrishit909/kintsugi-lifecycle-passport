# QA report

Apple M3 Pro, Chrome stable, Playwright 1.63, WebGL through SwiftShader. Last full runs: 23 e2e passed three times in a row after the final fix; 31 unit and API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro first load, skip, refresh mid-sequence | demo walk (asserts HUD opacity 1), refresh test, choices during the last fade kept | pass |
| Input: click, keyboard | demo walk, keyboard test on the component list | pass |
| Input: touch | phone layout only | not tested |
| Responsive | phone 390 px, no sideways overflow | pass at one phone size |
| Motion: reduced | static story, same navigation | pass |
| Graphics: success, failure, context loss | `?gfx=off` journey, lost-context event | pass |
| Lifecycle rules | listing needs a product in use, handing over needs a listing, recycling closes the passport, recycle needs confirmation | pass (unit and e2e) |
| Persistence | events survive reload, reset clears | pass |
| Repair finder | distances sorted, component-aware | pass |
| Visual regression | six views against the poster fallback | pass |
| Performance | budgets in tests/e2e/performance.spec.ts | pass |

The intro was also run unattended to its end and the final state checked (HUD opacity 1, no clip, no stuck CSS variables), after a bug in the previous blueprint where a timeline killed on unmount left the interface invisible.

Defects found during the build: the first intro cut hid the fall behind the intact object; a `toBeVisible` check passed while the HUD had opacity 0, so tests now assert computed opacity; a keyboard test was flaky until it retried focus plus Enter together.
