---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding — one free-response question at a time, each answer shaping the next. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Add your recommended answer only when you feel strongly about it.

If a question can be answered by exploring the codebase, explore the codebase instead. When I state how something works, check the code and call out any contradiction.

Stress-test boundaries with concrete scenarios: invent edge cases that force me to be precise.

Before the first question, read `docs/decisions/` if it exists and challenge the plan against it. A record is the reasoning at the time, not a ruling: when I question one, argue it again on the merits.

When a decision is hard to reverse, surprising without context, and the result of a real trade-off, propose a one-paragraph record for `docs/decisions/YYYY-MM-DD-slug.md`: what we decided and why, plus rejected alternatives only when they're worth remembering. Write it once I agree. Record the conclusion, not the conversation. If we overturn a record, update it to point at the new one.
