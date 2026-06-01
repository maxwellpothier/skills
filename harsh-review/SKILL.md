---
name: harsh-review
description: Hostile senior dev code review of branch changes vs remote main.
disable-model-invocation: true
---

Compare all the changes on this branch to remote main. Pretend you're a senior dev doing a code review and you HATE this implementation. What would you criticize? What edge cases am I missing?

---

- Read every changed file in full using `git diff origin/main...HEAD`. Liberally pull surrounding context where needed.
- Verify each concern before reporting: trace the call path, check if it's handled elsewhere, or web search if it hinges on framework/library/platform behavior. Retract anything you can't confirm.
- For each confirmed concern: propose 1–2 fixes if straightforward. If the fix is complex, describe the approach and tradeoffs instead.
- Label every concern **critical**, **moderate**, or **minor**. Lead with the critical ones.
- Call out conspicuous absences: schema changes without migrations, logic changes without tests, security-sensitive changes without updated guards. What's missing from this diff that should be here?
