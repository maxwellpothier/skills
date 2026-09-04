# Claude Code tool belt: every mechanism usable in a repeatable AI layer

Snapshot of code.claude.com/docs taken 2026-09-04. When this file and the live
docs disagree, the docs win; check `code.claude.com/docs` for anything that
sounds new or surprising. Every entry: what it is, the knobs that matter, and
the trigger that says "reach for this". Grouped by the job it does in a layer,
not by doc page. Walk all five groups for every piece you propose; the best
tool is often in a group you weren't looking at.

---

## A. Context: what Claude knows when it starts

| Mechanism | What it is and the knobs | Reach for it when |
|---|---|---|
| `CLAUDE.md` (project) | Loaded every session. `./CLAUDE.md` or `./.claude/CLAUDE.md`. Nested ones load when Claude reads files in that subdir. `@path` imports (4 hops). HTML comments stripped. Target under 200 lines; `/doctor` proposes trims. | Claude gets a convention wrong twice. Build commands, conventions, "never do X". |
| `CLAUDE.local.md` | Same, gitignored, personal to one checkout. | Sandbox URLs, personal test data. |
| `~/.claude/CLAUDE.md` | User-wide instructions across all projects. | Personal habits (how to open VS Code, delegation defaults). |
| Managed `CLAUDE.md` / `claudeMd` setting | Org-wide, deployed via MDM. Cannot be excluded. | Compliance and security policy. |
| `.claude/rules/*.md` | Instruction files, recursive discovery. With `paths:` glob frontmatter they load only when Claude touches a matching file. Symlinkable for cross-repo sharing. `~/.claude/rules/` for user-level. | Layer- or directory-specific guidance that would bloat CLAUDE.md. |
| `claudeMdExcludes` setting | Skip specific CLAUDE.md or rules files by glob. | Monorepo noise from other teams. |
| Auto memory | Claude-written notes at `~/.claude/projects/<repo>/memory/`. `MEMORY.md` index (200 lines / 25KB loaded), topic files read on demand. Types: user, feedback, project, reference. Toggle `autoMemoryEnabled`; relocate with `autoMemoryDirectory`. Machine-local, shared across worktrees. | Corrections and context Claude cannot derive from code. Not for anything the repo records. |
| Subagent `memory:` field | Gives a subagent its own persistent memory dir (`user`, `project`, or `local` scope). | A recurring specialist should learn across runs (a reviewer that remembers past false positives). |
| Config-as-data JSON | Pattern, not a primitive: `.claude/*.config.json` read by the skill at runtime. | Any id, threshold, status, or scope list that would otherwise be hardcoded in prose. |
| Output style (`.claude/output-styles/*.md`) | Modifies the system prompt: role, tone, format. `keep-coding-instructions: true` to stay an engineer. Built-ins: Default, Proactive, Concise, Explanatory, Learning. Plugins can ship one with `force-for-plugin`. | Same voice or format re-prompted every turn; a non-engineering persona. |
| `--append-system-prompt(-file)`, `--system-prompt(-file)` | One-shot system prompt additions or replacement at launch. | Scripts and CI, not interactive use. |
| Code intelligence (LSP plugin) | Language-server definitions, references, diagnostics after edits. Installed as a plugin; custom via `.lsp.json`. | Typed language where grep is slow; fewer whole-file reads. |
| MCP resources (`@server:resource`) | Read data exposed by an MCP server as an @-mention. | Reference docs or records living in an external system. |

## B. Invocable: what Claude or a person can call on demand

| Mechanism | What it is and the knobs | Reach for it when |
|---|---|---|
| Skill (`.claude/skills/<name>/SKILL.md`) | Markdown playbook plus supporting files. `/name` or model-invoked by description. Frontmatter: `description`, `when_to_use`, `argument-hint`, `arguments` (named `$foo`), `disable-model-invocation` (side effects; hides from Claude), `user-invocable: false` (background knowledge only), `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork` + `agent` + `background`, `hooks` (registered on invoke, live for the session), `paths` (auto-load only near matching files), `shell`. Substitutions: `$ARGUMENTS`, `$0..$N`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`. Inline `` !`cmd` `` runs shell at load time. `skillOverrides` setting hides skills you don't own. Skills decide; they do not enforce. | Same prompt or playbook pasted a third time. A CLAUDE.md section that became a procedure. |
| `.claude/commands/*.md` | Legacy flat-file skills. Same `/name`. | Don't create new ones; use skills. |
| Bundled skills | `/code-review` (and `ultra` cloud variant), `/security-review`, `/simplify`, `/verify`, `/batch`, `/deep-research`, `/loop`, `/doctor`, `/design`, `/dataviz`, `/claude-api`, `/fewer-permission-prompts`, `/workflow-authoring`, `/init`, `/schedule`. | Before writing your own version of one of these. |
| Subagent (`.claude/agents/<name>.md`) | Separate Claude, own context, own system prompt (not Claude Code's). Frontmatter: `description` (when to delegate), `tools` / `disallowedTools`, `model` (`sonnet` `opus` `haiku` `fable` `inherit`), `permissionMode`, `skills` (fully preloaded), `memory`, `isolation: worktree`, `mcpServers`, `hooks`, `background`, `maxTurns`, `effort`, `initialPrompt` (when run as main via `--agent`). Loads CLAUDE.md and git status but not conversation, auto memory, or output style. Named subagents can `SendMessage` each other. | A side task would flood main context. A reviewer must not see the worker's reasoning. Parallel workers. |
| Built-in subagents | `Explore` (read-only, skips CLAUDE.md), `Plan`, `general-purpose`, `claude`, `claude-code-guide`, `statusline-setup`. | Quick research or a Claude Code question without a custom agent. |
| Fork (`/subtask`, fork mode) | Subagent inheriting the full conversation, system prompt, and tools. `/fork` copies the whole session into a background session instead. | Delegate a piece of the current task without re-explaining it. |
| `--agent <name>` / `agent` setting | Run a whole session *as* a subagent definition: its prompt, tools, model. Plugins can ship this as a default. | A purpose-built persona for a team (a "release engineer" session). |
| MCP server (local) | `.mcp.json` (project, committed) or `~/.claude.json` (local/user). Transports: http, stdio, sse, ws. `claude mcp add/login/list`. `headersHelper` for dynamic creds. Tool search defers schemas until used. MCP prompts appear as `/mcp__server__prompt`. `requiresUserInteraction` forces a prompt per call. | Copying data from a browser tab Claude can't see. External actions. |
| claude.ai connectors | Org-managed MCP with auth handled by claude.ai. Org can mark tools `ask` or `blocked`. Only connectors work inside routines and artifacts. | The same integration must work in cloud sessions, routines, and artifacts. |
| `claude mcp serve` | Claude Code itself as an MCP server for another client. | Another agent or app needs Claude Code's tools. |
| Artifact | Live private web page on claude.ai published from a session. Versions, share to org or public, editors, comments (Claude can auto-reply while session watches), shared DB, per-viewer private data, asset store, MCP-connector live data at view time. `/artifacts` to find. CSP: only cdnjs/jsDelivr/Tailwind/jQuery scripts, Google Fonts. | Output that should be looked at or interacted with, or handed to a team. Status boards, review walkthroughs, triage boards with "copy as prompt". |
| `/design`, `/dataviz` | Design canvas artboards; chart design guidance. | Mockups; any chart. |
| Chrome (`--chrome`, `/chrome`) | Claude drives a real logged-in browser: console, DOM, screenshots, forms, uploads, GIF recording. Read-only calls free in plan mode. | Verify UI in the running app; automate a web UI with no API. |
| Computer use (macOS) | Claude controls native apps. | When neither CLI nor browser can reach it. |
| `/plan`, plan mode | Read-only exploration, then a plan for approval. `Ctrl+G` edits the plan. `opusplan` model setting: strong model plans, cheaper executes. | Unfamiliar code, multi-file change, uncertain approach. |
| `AskUserQuestion` tool | Structured multiple-choice questions to the user. | Interview-driven spec writing. Absent in `-p` with `--permission-prompts none`. |
| Advisor (`/advisor`, `advisorModel`) | Claude consults a stronger model at decision points with the full transcript. Experimental, Anthropic API only. Subagents inherit it. | Long tasks where plan quality matters more than per-turn strength. |
| `/btw` | Side question that never enters history. | Check a detail without polluting context. |

## C. Orchestration: how work is parallelized and isolated

| Mechanism | What it is and the knobs | Reach for it when |
|---|---|---|
| Dynamic workflow (`.claude/workflows/*.js`, `~/.claude/workflows/`, plugin `workflows/`) | JS the runtime executes, not Claude: `agent(prompt, {label, phase, schema, model})`, `parallel()`, `pipeline()`, `phase()`, `log()`, `args`. `export const meta = {name, description, phases}` literal. 16 concurrent, 1000 agents/run, 4096 items per call, resumable in-session with prefix cache, no mid-run user input, no fs/shell in the script itself. Triggers: `ultracode` keyword, "use a workflow", `/effort ultracode`, saved `/name`. `workflowSizeGuideline` small/medium/large. Save a run with `s` in `/workflows`. | Stage order, isolation, typed results, and teardown must not be improvised. Cross-checked findings. Job outgrows a handful of subagents. |
| Subagent fan-out in one turn | Several `Agent` calls in one message run concurrently. | A few independent lookups; Claude stays the orchestrator. |
| `/batch <instruction>` | Bundled: split one change into 5–30 worktree-isolated subagents, each opening a PR (GitHub). | Large mechanical change on a GitHub repo. |
| Agent view (`claude agents`, `/background`, `/fork`, `claude --bg`) | One screen to dispatch and watch background sessions. Each auto-moves into a worktree under `.claude/worktrees/`. In-flight work carries over. | Several independent tasks you hand off and check on. |
| Agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | Lead plus teammates with shared task list and mailboxes; teammates debate. Hooks `TeammateIdle`, `TaskCreated`, `TaskCompleted` gate quality. tmux or iTerm2 split panes optional. Experimental; no resume of in-process teammates. | Competing hypotheses; work that needs discussion, not just results. |
| Cross-session messaging (`ListAgents`, `SendMessage`, `/list-agents`, `@session`) | Your sessions message each other, local socket or via Remote Control across machines and cloud. `notify_when_idle` for a one-shot "done" ping. `crossSessionInbound` accept/hold/refuse. | One session learns something another needs mid-task; a watcher session waits on a long run. |
| Worktrees (`--worktree <name>`, `EnterWorktree`, subagent `isolation: worktree`) | Isolated checkout under `.claude/worktrees/`, branch `worktree-<name>`. `.worktreeinclude` copies gitignored files (`.env`). `worktree.baseRef` fresh/head. `WorktreeCreate`/`WorktreeRemove` hooks replace git logic. Enforcement blocks edits and git aimed at the main checkout. Auto-cleanup sweep. | Parallel work touching the same repo.. |
| Background Bash, `Monitor` tool | Detached commands; Monitor streams output lines back and supports WebSocket. | Builds, dev servers, log tails, polling without re-prompting. |
| Sessions (`--name`, `/rename`, `--resume`, `--continue`, `/branch`, `--fork-session`, `/export`, `--from-pr`) | Named, resumable, branchable conversations. Transcripts at `~/.claude/projects/`. | Long-running workstreams; writer/reviewer in two sessions. |
| `/compact`, `/rewind` summarize, checkpoints | Context compression and file/conversation restore (edit-tool changes only, 100 checkpoints). | Long sessions; risky experiments. |
| Remote Control, `--cloud`, `--teleport`, `/desktop`, mobile | Drive a local session from phone or browser; move sessions between surfaces. | Steering while away from the desk. |

## D. Automation and enforcement: what happens without asking

| Mechanism | What it is and the knobs | Reach for it when |
|---|---|---|
| Hooks (settings.json at user/project/local/managed; skill and agent frontmatter; plugin `hooks.json`) | Handlers on lifecycle events. Types: `command`, `http`, `mcp_tool`, `prompt` (model judges), `agent` (subagent judges). Matchers by tool name; `if` field filters on arguments. Exit 2 or JSON `decision: block/deny` to stop; JSON can inject context. Async hooks. `allowedHttpHookUrls`. Events: `SessionStart`, `SessionEnd`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop` (block turn end, 8-block cap), `StopFailure`, `PreToolUse` (deny), `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `PermissionRequest` (auto-approve), `PermissionDenied`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `FileChanged`, `ConfigChange`, `InstructionsLoaded`, `CwdChanged`, `DirectoryAdded`, `WorktreeCreate`, `WorktreeRemove`, `PreModelSwitch`, `PostModelSwitch`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `Notification`, `MessageDisplay`. Documented patterns: format on edit, block protected files, re-inject context after compaction, audit config changes, reload env on cwd change, auto-approve known prompts, desktop notify on input needed. | A rule must hold every time. "Please don't" in a prompt is a request; a hook is enforcement. Zero context cost unless it returns output. |
| `/goal <condition>` | Session-scoped prompt-based Stop hook. A fast model judges the condition after each turn; keeps working until met, impossible, or cleared. Works in `-p`. Pair with auto mode for unattended. Include "or stop after N turns". | Verifiable end state: tests pass, queue empty, every call site compiles. |
| `/loop [interval] [prompt]`, `CronCreate/List/Delete`, `ScheduleWakeup` | In-session recurring or one-shot prompts. Fixed cron or Claude-chosen delay (60s–1h). `.claude/loop.md` sets the bare-`/loop` default. 50 tasks, 7-day expiry, restored on resume. | Babysit a PR, poll a deploy, remind later in the session. |
| Routines (cloud; `/schedule`, claude.ai/code/routines, `RemoteTrigger` tool) | Saved prompt + repos + connectors + cloud environment. Triggers: schedule (min 1h), API POST `/fire` with bearer token and `text` payload, GitHub PR/release events with filters. Fully autonomous, no permission prompts, laptop closed. Uses connectors, not local MCP. Branches `claude/*`. Per-account. | Work that must run unattended on a cadence or in reaction to an event. Sprint checks, backlog grooming, alert triage, docs drift. |
| Desktop scheduled tasks | Local cron in the Desktop app, min 1 minute, file access, per-task permission mode, worktree toggle, catch-up runs. Prompt stored as `~/.claude/scheduled-tasks/<name>/SKILL.md`. Task can reschedule itself. | Recurring local work needing local tools or credentials. |
| Channels (`--channels plugin:...`, research preview) | An MCP server pushes events into a running session: Telegram, Discord, iMessage, or a custom webhook receiver. Two-way. Sender allowlist. Org must enable `channelsEnabled`. | React to CI, alerts, or chat instead of polling; Claude keeps your open files and debugging context. |
| Plugin monitors (`monitors/monitors.json`) | Background command whose stdout lines arrive as notifications every session the plugin is active. `when` trigger. | Watch a log or external status without being asked. |
| Permissions (`permissions.allow/deny/ask`, `additionalDirectories`, `defaultMode`, `/permissions`, `/fewer-permission-prompts`) | Rule syntax `Tool(pattern *)`. Deny is enforced client-side regardless of the model. | Fewer prompts without losing control; hard blocks on secrets. |
| Permission modes (`default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`) | `auto`: a classifier reviews actions and blocks scope escalation. `dontAsk`: deny anything not allowlisted (CI). Some actions no mode auto-approves. | Match oversight to trust; `dontAsk` for locked-down unattended runs. |
| Sandbox (`sandbox.*`, `/sandbox`) | OS-level filesystem and network isolation for Bash. Credential masking. | Let sandboxed commands run freely. |
| `claude -p` / Agent SDK | Headless: `--output-format json|stream-json`, `--json-schema`, `--allowedTools`, `--permission-mode`, `--permission-prompts none`, `--bare` (no hooks/skills/MCP discovery), `--mcp-config`, `--agents <json>`, `--plugin-dir`, `--max-turns`, `--resume`, `--no-session-persistence`. Exit codes for scripts. Python and TypeScript SDKs with `canUseTool`, structured outputs, hooks, subagents. |
| GitHub Actions, GitLab CI, GitHub Code Review, Slack `@Claude`, Claude Tag | Claude in CI on repo events; automatic PR review; Slack-spawned sessions. | GitHub or GitLab hosted repos. For Bitbucket or other hosts, a routine's API trigger is the equivalent path. |
| Deep links | URL that opens a Claude Code session with a prompt. | Kick off a session from a wiki or ticket. |
| `PushNotification`, `SendUserFile` tools | Notify or send a file to the user's device (phone via Remote Control). | Unattended run needs to reach a human. |

## E. Packaging and rollout: how a layer travels to another repo or team

| Mechanism | What it is and the knobs | Reach for it when |
|---|---|---|
| Plugin | Directory with `.claude-plugin/plugin.json` plus `skills/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `workflows/`, `output-styles/`, `monitors/`, `bin/` (on PATH), `settings.json` (`agent` default). Namespaced `/plugin:skill`. `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`. Test with `--plugin-dir`, `/reload-plugins`, `claude plugin validate`. `userConfig`, `dependencies`. | A second repository needs the same setup; you want versioned releases. |
| Skills-directory plugin (`claude plugin init`) | Plugin living at `~/.claude/skills/<name>/` or `.claude/skills/<name>/`, auto-loaded, no marketplace. | Lightweight sharing before a marketplace exists. |
| Marketplace (`marketplace.json`, private repo ok) | Catalog of plugins. `extraKnownMarketplaces`, `enabledPlugins`, `strictPluginOnlyCustomization`, relevance hints, version pinning. | Distributing to several teams; org-blessed set. |
| Settings scopes | managed → CLI `--settings` → local → project → user. `settings-example.md` has developer/team/org templates. `companyAnnouncements`, `requiredMinimumVersion`, `availableModels`, `disableBundledSkills`. | Deciding what is team-committed vs personal vs org-enforced. |
| `/init` (with `CLAUDE_CODE_NEW_INIT=1`), `/import` | Interactive setup proposing CLAUDE.md, skills, hooks; import from AGENTS.md, Cursor, Copilot. | Onboarding a repo with no layer yet. |
| `ShareOnboardingGuide` tool, Champion kit, Communications kit | Upload an ONBOARDING.md for teammates; adoption playbooks. | Rolling a layer out to people who haven't used Claude Code. |
| Monitoring (OpenTelemetry), `/usage`, analytics | Token and cost tracking per session, team dashboards. | Knowing what a layer costs. |

---

## Decision heuristics the docs state (verbatim spirit)

- Skills decide; hooks and workflows enforce. If a rule must hold every time, make it a hook.
- Add by trigger: wrong twice → CLAUDE.md. Same prompt again → user-invocable skill. Playbook pasted a third time → skill. Copying from a browser → MCP. Side task floods context → subagent. Must happen every time → hook. Second repo → plugin.
- Give Claude a check it can run, then escalate the gate: same prompt → `/goal` → Stop hook → adversarial subagent or workflow.
- The grader must not be the worker. Fresh context for review.
- Who holds the plan decides the primitive: Claude turn-by-turn → subagents or skills; a lead agent → teams; a script → workflow.
- Interview first for large features (AskUserQuestion), write a spec, execute in a clean session.
- `disable-model-invocation: true` for anything with side effects.
- Keep CLAUDE.md under 200 lines; move procedures to skills and path-scoped rules.
