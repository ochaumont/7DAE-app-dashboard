---
description: Audit _specification/vibe coding/ notes against the functional architecture specs; propose deleting the ones fully absorbed and ask what to do with the rest
argument-hint: (no arguments)
allowed-tools: Read, Write, Glob, Grep, Bash
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$SPEC_VIBE_DIR`         = `_specification/vibe coding`
- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`

The audit always scans **both** `$SPEC_FUNCTIONAL_DIR/` and `$SPEC_COMPONENTS_DIR/` when checking whether a vibe-coding item has been absorbed. An item captured in a component spec counts as absorbed just like an item captured in a functional-architecture spec.

Whenever the instructions below mention the "permanent spec layer", the "architecture specs", or similar wording in prose, interpret it as "every markdown file under `$SPEC_FUNCTIONAL_DIR/` **and** `$SPEC_COMPONENTS_DIR/`, recursively".

You are responsible for **auditing the vibe-coding notes** against the consolidated spec layer (functional architecture + components), in order to help the user clean up the `$SPEC_VIBE_DIR/` folder once its content has been properly folded into the permanent spec layer.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

1. Walk every file under `$SPEC_VIBE_DIR/` (recursive).
2. For each vibe file, extract its "information items" — the atomic facts, rules, decisions, open questions, snippets, diagrams, or intentions it contains.
3. For each item, check whether the equivalent information is **already captured** in one of the spec files under `$SPEC_FUNCTIONAL_DIR/` **or** `$SPEC_COMPONENTS_DIR/` (both recursive). The match is **semantic**, not a literal text search: the same idea expressed with different wording counts as absorbed.
4. Classify each vibe file as:
   - **Fully absorbed** — every item is present in at least one spec file (functional architecture or component).
   - **Partially absorbed** — some items are present, some are not.
   - **Not absorbed** — no item is present.
5. Present a structured summary with two sections: the files safe to delete (fully absorbed) and the files that still hold unique information (partially / not absorbed).
6. Ask the user for a decision on each category, then execute.

The command is **strictly read-only** on `$SPEC_FUNCTIONAL_DIR/` and `$SPEC_COMPONENTS_DIR/` — the permanent spec layer is never modified by this command. Only files under `$SPEC_VIBE_DIR/` can be mutated (deleted, purged, or left untouched).

## Agent delegation strategy

The audit (Step 2 + Step 3) reads potentially large volumes of Markdown (every vibe file + every spec file in the permanent layer). When the corpus is large, this would bloat the main conversation context with content that is only used to produce a compact classification. Use the `Agent` tool (with `subagent_type: "Explore"`) to delegate the bulk reading into isolated sub-processes and keep only the structured classification in the main context.

### When to delegate (volume heuristic)

Compute the delegation threshold based on `N_vibe` (number of vibe files) and the estimated vibe corpus size. Apply the following rule of thumb **after Step 1** (once `N_vibe`, `N_arch`, `N_comp` are known):

| Condition | Strategy |
|---|---|
| `N_vibe ≤ 3` **or** total vibe size < 500 lines | **No agent** — read inline in the main context. Briefing an agent costs more than the work itself at this scale. |
| `4 ≤ N_vibe ≤ 10` | **1 agent** handles the whole audit in a single delegation. |
| `11 ≤ N_vibe ≤ 50` | **Parallelize across 2–10 agents**, each responsible for a roughly equal slice of the vibe file list. |
| `N_vibe > 50` | Would normally require **more than 10 agents** — see the "Hard cap" rule below. |

### Hard cap: maximum 10 agents in parallel

**The command MUST NOT spawn more than 10 agents in a single run without explicit user confirmation.** Ten is the maximum by default.

If the volume heuristic above would require **more than 10 agents**, stop before launching them and ask the user verbatim:

> *"The vibe-coding corpus is large: `N_vibe = <N>` files would require `<K>` parallel agents to stay under the recommended size per agent. The default cap is **10 agents in parallel**. Do you want to:*
>  - *`10` — launch 10 agents (each will cover a larger slice)*
>  - *`<K>` — launch <K> agents (exceed the cap, ~<K> concurrent Explore processes)*
>  - *`sequential` — run a single agent over the whole corpus (slower but minimal footprint)*
>  - *`abort` — stop the command"*

**Wait for the answer before spawning any agent.** If the user types a number greater than 10, honor it. If they type `sequential` or `abort`, honor that. If the answer is unclear, default to 10 and report the decision in the final summary.

### How to brief each agent

Each delegated agent is an `Explore` subagent with a **self-contained, structured prompt**. Every agent must receive:

1. **The exact list of vibe files it owns** (subset of `$SPEC_VIBE_DIR/*.md`) — no overlap between agents.
2. **The full list of spec-layer files** (`$SPEC_FUNCTIONAL_DIR/**/*.md` + `$SPEC_COMPONENTS_DIR/**/*.md`) it must compare against.
3. **The matching rules** defined in Step 3 of this command (semantic match, omission ≠ contradiction, "less detailed does not absorb more detailed", etc.) — copied verbatim into the prompt so the agent does not need the rest of this command to do its job.
4. **A hard instruction** that the agent is **strictly read-only**: it MUST NOT create, modify, rename or delete any file. No `Write`, no `Edit`, no `Bash rm`. Only `Read`, `Glob`, `Grep`.
5. **A hard instruction** that the agent must NOT prompt the user, MUST NOT make interactive decisions, and MUST NOT decide whether a file should be deleted or purged — its role is purely to produce a classification.
6. **A strict output format** — see the schema below.

### Required agent output schema

Every agent must return its findings in this exact JSON-like structure (wrapped in a text report, not parsed literally — the agent is still a text-mode subagent):

```
For each vibe file owned by this agent, report:

  file: <relative path>
  total_items: <int>
  absorbed_items: <int>
  status: fully_absorbed | partially_absorbed | not_absorbed | empty
  absorbed:
    - item: "<short verbatim text>"
      source: "<spec_file_path>"
    - ...
  still_unique:
    - [line <L>] kind=<bullet|step|table-row|snippet|paragraph|question|decision>
      text: "<short verbatim text>"
      anchor: L<n>-L<m>
    - ...
  notes:
    - <any ambiguity, stale reference, or contradiction worth flagging>
```

Keep quoted text ≤ 200 characters per item. Longer items get a leading excerpt followed by `…`.

### What stays in the main conversation

After the agent(s) return, the main conversation owns:

- **Aggregating** the per-agent reports into the single audit format shown in Step 5.
- **Presenting** the audit to the user (Step 5).
- **Asking** Decision 1 (fully absorbed → delete?) and Decision 2 (partial → keep / purge / delete / skip per file).
- **Executing** Step 6 (rm, purge extraction to summary or to `purge.md` if asked).
- **Producing** the final Step 7 summary.

**Never delegate the decision-asking or the file mutations to an agent.** Agents do the reading; the main conversation does the orchestration and the writes.

### Fallback when agents are unavailable or fail

If the user denies the agent tool, if an agent crashes, or if the workspace cannot spawn agents for any reason, **fall back to inline reading** in the main context and continue the audit with the same rules. Report the fallback in the final summary's `Notes:` section so the user understands what happened.

## Step 1. Validate preconditions

1. Verify that `$SPEC_VIBE_DIR/` exists. If it does not, stop and tell the user: *"The `$SPEC_VIBE_DIR` folder does not exist. Nothing to consolidate."*
2. List every `.md` file under `$SPEC_VIBE_DIR/` (recursive). If the listing is empty, stop and tell the user: *"`$SPEC_VIBE_DIR` is empty. Nothing to consolidate."*
3. Verify that **at least one** of `$SPEC_FUNCTIONAL_DIR/` or `$SPEC_COMPONENTS_DIR/` exists and contains at least one markdown file. If both are empty or missing, stop and warn the user: *"Both `$SPEC_FUNCTIONAL_DIR` and `$SPEC_COMPONENTS_DIR` are empty or missing. Running the audit now would classify every vibe-coding note as 'not absorbed' by default. Run `/sweetforge.overview` and/or `/sweetforge.spec -codeBase -all` first."*
4. Record `N_vibe` (number of vibe files), `N_arch` (number of functional-architecture files), and `N_comp` (number of component spec files) for the final summary.

## Step 2. Extract information items from each vibe file

> **Delegation point**: this is the step where the `Agent delegation strategy` section above applies. Before starting Step 2, apply the volume heuristic to decide whether to read inline or delegate to 1–10 `Explore` agents (with user confirmation beyond the 10-agent cap). When delegating, the agent(s) perform Step 2 **and** Step 3 together (extraction + absorption check) and return the merged per-file classification. The rest of this Step 2 description defines the inline behavior and the rules every agent must apply.

For every file under `$SPEC_VIBE_DIR/`, read its full content and decompose it into a list of **information items**. An information item is an atomic piece of content that can independently be said to be "already captured" or "not yet captured" elsewhere. Look for:

- **Top-level bullets** — each bullet is usually one atomic claim, rule, decision, open question, or intention.
- **Numbered steps** in procedures or user journeys.
- **Tables** — each row (or each cell for field-level specs) can be an item.
- **Code snippets / diagrams** — count the whole block as one item (its meaning is the item, not the syntax).
- **Free-form paragraphs** — split on topic shifts; every distinct claim is one item.
- **Questions / clarifications** — each `[NEEDS CLARIFICATION: ...]` or question mark is its own item.
- **Explicit decisions** — lines like "we decided to X" or "→ X" are high-value items that must not be lost even if implicit elsewhere.

Record each item as:
- `item_id` — a short ordinal like `<vibe_file>#1`, `<vibe_file>#2`, …
- `kind` — one of `bullet | step | table-row | snippet | paragraph | question | decision`
- `text` — the verbatim or lightly-paraphrased content (keep it short: one sentence max).
- `anchor` — an approximate line range `L<n>-L<m>` in the source file (used later for purge mode).

Filter out trivial items that are not worth tracking:
- Section headings alone (they are structural, not informational).
- Empty lines, page breaks, horizontal rules.
- Meta-notes about the file itself ("last updated: ...", "author: ...") unless they carry a real decision.

## Step 3. Check absorption of every item

For each item extracted in Step 2, look for its equivalent inside the files under `$SPEC_FUNCTIONAL_DIR/` **and** `$SPEC_COMPONENTS_DIR/` (both recursive). Both folders are always searched — an item captured in a component spec counts as absorbed exactly like one captured in a functional-architecture spec.

**Matching rules** — the match is semantic, not lexical:
- Same concept expressed with different vocabulary counts as a match (e.g. `livrable` ↔ `deliverable`, `pourcentage` ↔ `percentage`, `HAUTE` ↔ `HIGH`).
- A more detailed version in the architecture spec counts as absorbing a less detailed vibe note (enrichment is fine).
- A less detailed version in the architecture spec does NOT absorb a more detailed vibe note: if the vibe note adds information (e.g. a numeric threshold, a concrete edge case, a rationale), the item is still considered *not absorbed*.
- Decisions / rationale / intent are absorbed only when the architecture spec captures **both** the decision and its rationale. A rule present in the arch spec without its "why" does not absorb the `why` part of the vibe note.
- Open questions / clarifications are absorbed only when the architecture spec has resolved them (answer folded in). Otherwise they remain unabsorbed.

For each item, record:
- `absorbed: yes | no`
- `absorbed_by` — if `yes`, the path(s) of the architecture file(s) that capture the item. If `no`, leave empty.

## Step 4. Classify each vibe file

For every file under `$SPEC_VIBE_DIR/`, compute:
- `total_items` — the number of items extracted in Step 2.
- `absorbed_items` — the number of items marked `absorbed: yes` in Step 3.
- `status`:
  - `fully_absorbed` if `absorbed_items == total_items && total_items > 0`
  - `not_absorbed` if `absorbed_items == 0 && total_items > 0`
  - `partially_absorbed` otherwise
  - `empty` if `total_items == 0` (a file that contained nothing informational — e.g. only a heading). Treat it like `fully_absorbed` for the cleanup proposal.

## Step 5. Present the audit and ask for user decisions

Present the result to the user in this exact structure:

```
Consolidate audit — $SPEC_VIBE_DIR

Vibe-coding files scanned: <N_vibe>
Spec layer checked against: <N_arch> functional arch file(s) + <N_comp> component file(s)

================================================================
Fully absorbed (<N_full> file(s)) — safe to delete
================================================================
  - <path/to/vibe_file_1.md>  (<total_items> items, all captured)
      └ captured across: <spec_file_a>, <spec_file_b>, ...
  - <path/to/vibe_file_2.md>  (<total_items> items, all captured)
      └ captured across: <spec_file_c>
  - ...

================================================================
Partially or not absorbed (<N_partial> file(s)) — needs decision
================================================================
  - <path/to/vibe_file_3.md>  (<absorbed>/<total> items captured)
      Absorbed elsewhere:
        - "<item_text_1>" → <spec_file>
        - ...
      STILL UNIQUE (not yet in any spec):
        - [line <L>] "<item_text_2>"
        - [line <L>] "<item_text_3>"
        - ...
  - <path/to/vibe_file_4.md>  (0/<total> items captured)
      STILL UNIQUE:
        - [line <L>] "<item_text>"
        - ...
  - ...
```

Then ask the user **two separate decisions**:

### Decision 1 — fully absorbed files

If at least one file is fully absorbed, ask:

> *"Delete the <N_full> fully-absorbed vibe-coding file(s)? (yes / no / select)*
>   - *`yes`  → delete all of them*
>   - *`no`   → keep all of them*
>   - *`select` → you pick which ones to delete (by index)"*

Wait for the answer. If `select`, loop: show the numbered list again and accept a comma-separated list of indices (e.g. `1,3,4`) or a range (`1-3`). Only delete what the user confirmed.

Skip this decision entirely if `N_full == 0`.

### Decision 2 — partially / not absorbed files

If at least one file is partially or not absorbed, ask **per file** (loop over them in order):

> *"File: `<path>` (<absorbed>/<total> items captured)*
>
> *What do you want to do with this file?*
>   - *`keep`   → leave it untouched on disk*
>   - *`purge`  → extract the still-unique items into the final summary for manual relocation, then **delete** the file*
>   - *`delete` → remove the file entirely, discarding even the still-unique items*
>   - *`skip`   → defer the decision to a later run*"

Wait for the answer for each file before moving to the next. If the user passes a bulk answer like `all keep`, `all purge`, or `all delete`, apply it to every remaining file in the loop.

Skip this decision entirely if `N_partial == 0`.

**Important — the difference between `purge` and `delete`:**
- `purge` **preserves the information** by echoing every still-unique item into the final Step 7 summary under a dedicated section, then deletes the source file. The information is safe (it lives in the user's terminal output), the vibe folder is cleaned up.
- `delete` is a **hard drop**: the file is removed, the still-unique items are lost. Use this only when the unique items are judged uninteresting.

In both cases the file ends up deleted from `$SPEC_VIBE_DIR/`. The only difference is whether the still-unique items survive in the summary output.

## Step 6. Execute the user's decisions

For every file the user has marked `delete` (in Decision 1 or Decision 2):
- Use `rm` (via Bash) on the file path. Verify the file no longer exists. Report success or failure in the final summary.

For every file the user has marked `purge`:
- Collect every item that was marked `absorbed: no` in Step 3 into a per-file list, preserving the original wording and the line anchors.
- Attach this list to the file's entry in the "Purged — unique items extracted for manual relocation" section of the Step 7 summary (see below). Do NOT write the items into any other file — the user will relocate them by hand into the relevant spec.
- Use `rm` (via Bash) on the file path, exactly like `delete`. Verify the file no longer exists.
- Report in the final summary: how many items were extracted, and confirmation that the source file was removed.

For every file the user has marked `keep` or `skip`:
- Do nothing. Report "kept" (or "skipped") in the final summary.

**Never** modify any file under `$SPEC_FUNCTIONAL_DIR/` or `$SPEC_COMPONENTS_DIR/` during Step 6. The permanent spec layer is strictly read-only in this command.

## Step 7. Final output to the user

After all decisions have been executed, respond with a structured summary in this exact format:

```
Consolidate run complete — $SPEC_VIBE_DIR

Files scanned: <N_vibe>
Absorption breakdown:
  - Fully absorbed: <N_full>
  - Partially absorbed: <N_partial_absorbed>
  - Not absorbed: <N_none>
  - Empty / skipped: <N_empty>

Actions applied:
  - Deleted (fully absorbed): <N_deleted_full> file(s)
      - <path_1>
      - <path_2>
      - ...
  - Purged (deleted after extracting unique items): <N_purged> file(s)
      - <path_a>  (<items_extracted> unique items extracted, see below)
      - ...
  - Deleted (unique items discarded): <N_deleted_hard> file(s)
      - <path_b>
      - ...
  - Kept: <N_kept> file(s)
      - <path_x>
      - ...
  - Skipped (decision deferred): <N_skipped> file(s)
      - <path_y>
      - ...

================================================================
Purged — unique items extracted for manual relocation
================================================================
(This section lists every item that was flagged as NOT yet absorbed in the
permanent spec layer and came from a file the user marked `purge`. The source
files have been deleted; relocate each item by hand into the relevant spec
under $SPEC_FUNCTIONAL_DIR/ or $SPEC_COMPONENTS_DIR/.)

  <path/to/purged_file_1.md>   (originally at line <L>)
    - "<item_text_1>"
    - "<item_text_2>"
    - ...
  <path/to/purged_file_2.md>
    - "<item_text>"
    - ...
  ...

(If no file was purged, write "_No items extracted — no file was purged in this run._".)

Notes:
  - <any warnings about items that were ambiguous, spec files that looked shallow, files that failed to delete, etc.>
```

Do not repeat the full item lists for files that were kept, skipped, or fully absorbed — only the items from purged files must appear verbatim in the summary (they are the "saved copy" of the user's unique information). The main goal is to report which vibe-coding files were cleaned up, which still need attention, and which unique items the user must now relocate by hand.
