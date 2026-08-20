---
description: Create feature spec files — greenfield (-new), single-feature reverse-engineering (-codebase), or mass reverse-engineering of every requirement listed in the overview (-codebase -all)
argument-hint: [-codebase [-all] | -new] <short feature description>
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$TEMPLATES_DIR`         = `.sweetforge/templates/Functional Architecture`
- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`
- `$SPEC_VIBE_DIR`         = `_specification/vibe coding`
- `$OVERVIEW_FILE`         = `$SPEC_FUNCTIONAL_DIR/functional-overview.md`
- `$TEMPLATE_FEATURE`      = `$TEMPLATES_DIR/Functional Feature.md`
- `$TEMPLATE_COMPONENT`    = `$TEMPLATES_DIR/Functional Component.md`

All execution modes (`-codebase`, `-codebase -all`, `-new`/default) use the **same** feature-level template (`$TEMPLATE_FEATURE`). Only the methodology and the number of specs produced differ: `-codebase` reverse-engineers one existing feature, `-codebase -all` reverse-engineers **every** requirement listed in the overview in one run, and `-new` starts from a fresh idea.

In every `-codebase*` mode, after gathering material from the different sources (`$OVERVIEW_FILE`, the source code, `$SPEC_VIBE_DIR/`, and any existing spec file to enrich) the command MUST run a **consistency check** and surface any contradiction to the user before — or alongside — writing any file. The consistency check never silently picks a winner: the user always sees what disagrees with what.

Whenever the instructions below mention a template path or a spec directory in prose, interpret them as these variables.

You are helping to spin up or refine feature specifications for this application. This command supports **three modes** (plus a default alias) and you must detect which one to run based on the user's arguments.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

The command has four execution modes:

1. **`-codebase` mode** — single-feature reverse-engineering: the feature already exists in the code. You must locate it in the existing specs and source code, summarize your findings, wait for user confirmation, then produce **one** `Functional Feature.md` spec (and optionally one `Functional Component.md` spec if a specific/complex component is involved).
2. **`-codebase -all` mode** — mass reverse-engineering: iterate over **every** requirement listed in `$OVERVIEW_FILE`, present the full list to the user for confirmation, then for each confirmed requirement produce a `Functional Feature.md` spec (and optionally a `Functional Component.md` spec). This replaces the retired `sweetforge.specFromCodeBase` command.
3. **`-new` mode** — greenfield: the feature does not exist yet. You produce a `Functional Feature.md` spec (and optionally a `Functional Component.md` spec if a specific/complex component is involved), directly, without searching the codebase.
4. **Default mode** (no flag) — equivalent to `-new`.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `codebase_all`, `codebase`, `new`, or `default`.
   - Flag matching is **case-insensitive**: `-codebase` is the canonical form but `-codeBase`, `-CodeBase`, `-CODEBASE` are all accepted. The same tolerance applies to `-all`, `-new`.
   - If `$ARGUMENTS` starts with `-codebase -all` (in any order: `-all -codebase` is also accepted), set `mode = codebase_all`. Strip both flags from the arguments before further parsing.
   - Else, if `$ARGUMENTS` starts with `-codebase` alone, set `mode = codebase`. Strip the flag.
   - Else, if `$ARGUMENTS` starts with `-new`, set `mode = new`. Strip the flag.
   - Otherwise, set `mode = default` (treat it exactly as `-new`).
   - `-all` is only valid when combined with `-codebase`. If the user passes `-all` alone or with `-new`, stop and ask the user to clarify.
   - If the user passes any other unknown flag (e.g. `-foo`), stop and ask the user to clarify instead of guessing.

2. **`short_description`** — the remaining text after the mode flags. Its handling depends on the mode:
   - **Modes `codebase`, `new`, `default` — required.** It is the free-form description of the feature the user wants to specify. If the remaining text is empty (or whitespace-only), stop and ask the user to provide a description.
   - **Mode `codebase_all` — must be absent.** `-all` and a focus description are **mutually exclusive**. Valid invocations are:
     - `/sweetforge.feature -codebase -all` — process every requirement in the overview.
     - `/sweetforge.feature -codebase <focus>` — single-requirement mode.
     - `/sweetforge.feature -codebase -all <focus>` — **never**, always rejected.

     If the user passes `-codebase -all` followed by any non-whitespace text, stop and tell them verbatim: *"`-all` processes every requirement in the overview and cannot be combined with a focus description. Use `/sweetforge.feature -codebase <focus>` to target a single requirement, or `/sweetforge.feature -codebase -all` (with no extra text) to process them all."* Do not proceed.

3. **`feature_title`** — a short, human-readable Title-Case title derived from `short_description`.
   - Example: "Card Component for Dashboard Stats".
   - Preserve technical terms and acronyms (OAuth2, API, JWT, etc.).
   - If you cannot infer a sensible `feature_title`, ask the user to clarify instead of guessing.
   - **Not applicable** in `codebase_all` mode: the title is derived per-requirement from each requirement's heading in `$OVERVIEW_FILE` (see Step 2.C).

4. **`feature_slug`** — a kebab-case slug derived from `feature_title` (e.g. `card-component-for-dashboard-stats`). This is used for folder and file names.
   - In `codebase_all` mode, each requirement gets its own slug derived from its heading.

## Step 2. Branch on `mode`

### Step 2.A — `mode == codebase` (reverse-engineering)

Execute this step **only** when `mode == codebase`.

0. **Structural index check** (applies to sub-step 2 below).

   Before parsing raw source code, check whether a pre-built structural index exists:

   a. Check whether `.sweetforge/index/_meta.json` exists.
   b. **If it exists:** read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from each manifest entry in `_meta.json` (all 7 manifests: `backend-entities.md`, `backend-api.md`, `frontend-pages.md`, `frontend-components.md`, `frontend-hooks.md`, `frontend-lib.md`, `packages.md`). If no relevant files changed (fast path), read the manifests from `.sweetforge/index/` and use their content for sub-step 2 ("Search the source code") instead of running Glob/Grep over raw source. If some files changed, read the manifests for unchanged scopes and parse only the changed files directly.
   c. **If `_meta.json` does not exist:** fall back to raw source parsing in sub-step 2. After the Step 2.A.5 summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

1. **Search the functional overview.**
   - Open `$OVERVIEW_FILE` (literal path: `@_specification/Functional Architecture/functional-overview.md`).
   - Identify the feature, requirement, or functional area it describes that best matches `short_description`. Capture the section heading, the surrounding bullets, and any cross-references to other requirements.
   - If no clear match is found, record that explicitly — you will mention it in the summary to the user.

2. **Search the source code.**
   - Use Glob/Grep to locate the files that implement the feature matching `short_description`. Look across the monorepo (backend, frontend, shared packages) — don't limit yourself to one folder.
   - Capture the most relevant files (controllers, services, React components, hooks, types) with their paths and a one-line description of what each one does for this feature.
   - If nothing matches, record it — the `-codebase` mode presumes an existing implementation, so the absence of code is a blocker you must report.

3. **Search the vibe-coding notes.**
   - List every file under `$SPEC_VIBE_DIR/` (literal path: `@_specification/vibe coding/`) and identify any whose name or contents reference the feature described in `short_description`.
   - Capture the matching file paths and a short note on why they are relevant.
   - If the folder is empty or no file matches, record it and move on — it's not a blocker.
   - Treat vibe-coding notes as a **first-class source** (comparable to the overview and the code), not as a secondary enrichment. They often capture the user's intent or the rationale behind a design choice that the code alone does not reveal.

4. **Detect inconsistencies between sources.**

   Compare the three sources you just gathered (overview section, source code, vibe-coding notes) and — if a spec file already exists at `$SPEC_FUNCTIONAL_DIR/<feature_slug>/Functional Feature.md` or at `$SPEC_COMPONENTS_DIR/<component_slug>.md` — also compare them against the **existing spec** you would be about to enrich. An inconsistency is a **factual contradiction** between two sources, not a mere omission by one of them. Look for:

   - **Behavioral contradictions** — one source describes behavior A, another describes incompatible behavior B for the same operation (e.g. overview says "drop anywhere auto-scrolls", code has no auto-scroll sensor wired).
   - **Structural contradictions** — same entity / field / prop / event / endpoint declared with different names, types, cardinalities, or required/optional flags across sources (e.g. overview says `pourcentage: int 0-100`, code stores a `BigDecimal`, vibe note says it should be a percentage with one decimal).
   - **Scope contradictions** — one source marks a capability as in-scope/supported, another marks it as out-of-scope/deferred/not implemented.
   - **Business-rule contradictions** — a RG-XX constraint mentioned in one source but demonstrably not enforced in another (e.g. overview cites RG-07, no server-side check is found, no frontend gating either).
   - **Naming / terminology drift** — the same concept referred to by different names across sources (e.g. `livrable` vs `deliverable`, `Produit` vs `Product`, `Affectation` vs `Assignment`). Report it as a warning, not a blocker — it only becomes a problem if it creates ambiguity downstream.
   - **Existence contradictions** — one source references a field, endpoint, or enum value that the other sources clearly do not know about. Distinguish *missing in source X* (= omission, do NOT report) from *denied by source X* (= contradiction, report).

   For every inconsistency found, record a tuple:
   - `source_a` (path or "code at `<file:line>`")
   - `source_b` (path or "code at `<file:line>`")
   - `concern` — the field / behavior / rule in one short phrase
   - `value_a`, `value_b` — what each source says (verbatim if short, paraphrased if long)
   - `severity`:
     - `blocker` — the new spec cannot be written coherently without resolving it (e.g. two incompatible structural definitions of the same entity).
     - `warning` — the spec can still be written, but the user should know the two sources disagree (e.g. a naming drift, a missing RG enforcement).

   **Do not silently resolve inconsistencies.** Even when an authority order could be applied, you MUST list them in the confirmation summary below. The user decides whether to abort and fix, or to proceed anyway. If the user proceeds with `yes` while blockers remain unresolved, the written spec MUST encode each blocker as a `[NEEDS CLARIFICATION: <concern> — <source_a> says X, <source_b> says Y]` marker inside the relevant chapter, so the contradiction is visible in the final document.

5. **Summarize findings and ask for confirmation.**
   - Present to the user, in this exact structure:
     ```
     Mode: -codebase
     Feature: <feature_title>

     Overview match:
       - <section heading in functional-overview.md, or "no match found">
       - <short summary of what it says>

     Source code:
       - <path/to/file1> — <one-line purpose>
       - <path/to/file2> — <one-line purpose>
       - ...

     Vibe-coding notes:
       - <path/to/note1> — <why it's relevant>
       - ...  (or "no related notes")

     Candidate component: <name of a specific/complex component detected, or "none">

     Existing spec: <path if it already exists and will be enriched, or "none — will be created">

     Inconsistencies detected: <N_blocker blocker(s), N_warning warning(s)>
       - [BLOCKER] <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
       - [WARN]    <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
       - ...  (or "none" if N == 0)

     Target output files:
       - $SPEC_FUNCTIONAL_DIR/<feature_slug>/Functional Feature.md
       - $SPEC_COMPONENTS_DIR/<component-slug>.md  (only if a component was detected)

     Proceed? (yes / adjust / abort)
     ```
   - If at least one `BLOCKER` inconsistency is present, append one line to the summary: *"BLOCKER inconsistencies will be encoded as `[NEEDS CLARIFICATION]` markers in the written spec unless you `abort` and fix the sources first."*
   - **STOP and wait for the user's confirmation** before continuing to Step 3. Do NOT write any file at this stage.
   - If the user says `adjust`, let them redirect the search (different feature, different files) and re-run Step 2.A.
   - If the user says `abort`, stop the command without writing anything.
   - If the user says `yes`, continue to Step 3. Carry the list of inconsistencies forward — they will be emitted as `[NEEDS CLARIFICATION]` markers in Step 4 and listed in the final summary in Step 5.

### Step 2.B — `mode == new` or `mode == default` (greenfield)

Execute this step **only** when `mode == new` or `mode == default`.

1. Do **not** search the overview, the source code, or the vibe-coding notes. The feature is assumed not to exist yet.
2. Interpret `short_description` as the creative seed for the spec.
3. Do **not** ask for confirmation at this stage — proceed directly to Step 3. (The user already chose this mode explicitly, or accepted the default.)

### Step 2.C — `mode == codebase_all` (mass reverse-engineering)

Execute this step **only** when `mode == codebase_all`. This mode replaces the retired `sweetforge.specFromCodeBase` command: it reverse-engineers every requirement listed in the overview in a single run.

1. **Load the overview and extract the requirement list.**
   - Open `$OVERVIEW_FILE` (literal path: `@_specification/Functional Architecture/functional-overview.md`).
   - Identify the list of **requirements** to spec. By convention the overview exposes them under a `Requirements` section (typically as sub-headings like `Product & Release Management`, `Project Management`, `Resources & Workload`, etc., or as bullet groups under "High Level Functional Requirements"). Each such sub-section becomes one requirement.
   - For each requirement, capture:
     - its **heading** (verbatim, to be used as `requirement_title`),
     - a **kebab-case slug** derived from the heading (to be used as folder name under `$SPEC_FUNCTIONAL_DIR/`),
     - the **bullets / description** that belong to that section in the overview.
   - **Every** requirement found in the overview is included — there is no filter in `codebase_all` mode (see Step 1 on the `-all` vs `<focus>` mutual exclusion).

2. **Present the list and ask for confirmation.**
   - Present to the user, in this exact structure:
     ```
     Mode: -codebase -all

     Requirements to spec (<N>):
       1. <requirement_title_1> → $SPEC_FUNCTIONAL_DIR/<slug_1>/Functional Feature.md
          <short one-line summary from the overview>
       2. <requirement_title_2> → $SPEC_FUNCTIONAL_DIR/<slug_2>/Functional Feature.md
          <short one-line summary>
       ...

     Proceed? (yes / adjust / abort)
     ```
   - **STOP and wait for the user's confirmation** before continuing. Do NOT write any file at this stage.
   - If the user says `adjust`, let them narrow or widen the list (add or remove specific requirements by index) and re-present. This post-confirmation editing is the only way to scope the run in `codebase_all` mode — the flag itself does not accept a focus description.
   - If the user says `abort`, stop the command without writing anything.
   - If the user says `yes`, continue.

3. **For each confirmed requirement, perform a focused search** (mirroring Step 2.A but scoped to this single requirement, and WITHOUT an extra confirmation — the user has already confirmed the list):

   **Structural index pre-load** — before iterating over requirements, perform the index check once for the entire batch:

   a. Check whether `.sweetforge/index/_meta.json` exists.
   b. **If it exists:** read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from each manifest entry in `_meta.json` (all 7 manifests). If no relevant files changed, read all manifests once and use them as the codebase knowledge base for every requirement's "Codebase scan" below — skip per-requirement Glob/Grep entirely. If some files changed, read the manifests for unchanged scopes and restrict per-requirement Glob/Grep to the changed files only.
   c. **If `_meta.json` does not exist:** fall back to per-requirement Glob/Grep as described below. After the Step 5 summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

   Per-requirement search steps:

   - **Codebase scan** — use Glob/Grep to locate the files that implement the requirement (backend, frontend, shared packages), or use the pre-loaded manifests when the index is fresh. Capture the most relevant files and their one-line purpose. If nothing matches for a given requirement, record it as a warning and continue with the next requirement (do NOT abort the whole run).
   - **Vibe-coding scan** — list files under `$SPEC_VIBE_DIR/` whose name or content reference the requirement, and capture them. Vibe-coding notes are treated as a first-class source (same weight as the overview and the code).
   - **Consistency check** — apply the **same inconsistency-detection rules** defined in Step 2.A-4 to the per-requirement sources (requirement section in the overview + per-requirement code files + per-requirement vibe-coding notes + existing spec file if any). Record every inconsistency (with `severity = blocker | warning`) on the requirement's record. No per-requirement confirmation prompt — the list was confirmed globally in 2.C-2. Blockers found here will surface in the final Step 5 summary and be encoded as `[NEEDS CLARIFICATION]` markers in the written spec.
   - **Component detection** — apply the component heuristics from Step 3 per requirement; a requirement may produce zero, one, or several component specs.

4. Once all searches and consistency checks are done, proceed to Step 3 / Step 4, which will run **in a loop** over the confirmed list (see the "Mass-mode loop" note in Step 4).

## Step 3. Decide whether a component-level spec is needed

> **Mass-mode note**: In `codebase_all` mode, this decision is made **once per requirement** inside the loop described at the top of Step 4. For all other modes it is made once for the whole run.

Evaluate whether the current feature/requirement (i.e. `short_description` + Step 2.A findings for single modes, or the per-requirement findings from Step 2.C for mass mode) describes a **specific, complex, reusable component** that deserves its own `Functional Component.md` spec in addition to the feature spec.

Apply these heuristics. A component spec is warranted when **at least two** of the following are true:

- The feature is self-contained and has a well-defined public API (props, events, exported types).
- It is reusable across multiple pages or consumers (or intended to be).
- It encapsulates non-trivial interaction logic (drag-and-drop, virtualization, complex state machine, custom rendering).
- It is packaged as a workspace package (`sweet-*` folder) or is clearly extractable as one.
- In `-codebase` mode, a distinct React component / service class exists in the codebase and is referenced by more than one caller.

If none of the above hold — for example the feature is a new screen section, a business rule, or a backend workflow with no reusable UI primitive — then **do not** generate a component spec, only the feature/requirement spec.

Record your decision (`component_spec = yes | no`) and, if yes, derive a `component_slug` (kebab-case, e.g. `sweet-release-grid`, `date-range-picker`).

## Step 4. Draft and write the spec(s)

> **Mass-mode loop**: When `mode == codebase_all`, wrap the whole of Step 3 + Step 4.A + Step 4.B in a loop that iterates over the list of confirmed requirements from Step 2.C. For every iteration, `feature_title` / `feature_slug` / "source files" / "vibe-coding files" / "component decision" come from that specific requirement's findings. Do NOT share state across iterations. On failure of one iteration (e.g. no code found for that requirement), record the failure and **continue** with the next iteration — do not abort the whole run. Report every success and failure in the final summary (Step 5).

### Step 4.A — Feature spec

All modes use the same template and the same output filename convention; only the content-derivation method and the number of files produced differ.

- Load `$TEMPLATE_FEATURE` (literal path: `@.sweetforge/templates/Functional Architecture/Functional Feature.md`) to understand the required sections.
- Use its exact structure. Generate every chapter.
- **If `mode == codebase`**: derive the content by **reverse engineering** the source files identified in Step 2.A — describe what the feature actually does today, not what it should do. Integrate any relevant context from the matching section of `$OVERVIEW_FILE` and from the vibe-coding notes found in `$SPEC_VIBE_DIR/`.
- **If `mode == codebase_all`**: same reverse-engineering methodology as `codebase`, but the source for the current iteration comes from Step 2.C (per-requirement codebase + vibe-coding scan). The matching section of `$OVERVIEW_FILE` for this iteration is the requirement's sub-section identified in Step 2.C-1.
- **If `mode == new` or `mode == default`**: derive the content from `short_description` and industry-standard defaults for unclear aspects.
- Write the resulting spec to `$SPEC_FUNCTIONAL_DIR/<feature_slug>/Functional Feature.md`. The filename MUST be exactly `Functional Feature.md`, matching the template — do NOT use `spec.md`, `<feature>-spec.md`, or any other variant. The kebab-case `<feature_slug>` folder is created if it does not exist.
- If a spec file already exists at that path, **enrich** it instead of overwriting: merge new content into existing sections, keep the existing heading order, and flag in the final summary which sections were updated. Do not duplicate information.

In all cases:
- Replace placeholders with concrete details derived from the description (and from the code, for `-codebase*`).
- Preserve section order and headings from the template.
- Do **not** add technical implementation details such as code examples.
- For unclear aspects:
  - Make informed guesses based on context and industry standards.
  - Only mark with `[NEEDS CLARIFICATION: specific question]` if:
    - The choice significantly impacts scope or user experience.
    - Multiple reasonable interpretations exist with different implications.
    - No reasonable default exists.
  - Prioritize clarifications by impact: scope > security/privacy > user experience > technical details.
- **Unresolved inconsistencies from Step 2.A-4 / Step 2.C-3** MUST each be encoded as a `[NEEDS CLARIFICATION: <concern> — <source_a> says X, <source_b> says Y]` marker inside the chapter of the spec that covers the concern (e.g. a structural contradiction lands in the `Data Structure` chapter; a business-rule contradiction lands in `Business Rules`; a behavioral contradiction lands in `Features` or `Edge Cases`). Do not hide them in a footnote or drop them silently.
- When enriching an existing file, pay special attention to the inconsistency sub-category "existing spec vs new findings": prefer to rewrite the contradicted chapter with the new finding and move the old value into a `[NEEDS CLARIFICATION: existing spec said X, code now shows Y]` marker, rather than overwriting silently.

### Step 4.B — Component spec (conditional)

Execute this step **only** when `component_spec == yes` (from Step 3). In mass mode this runs zero, one, or several times per requirement depending on the heuristics.

- Load `$TEMPLATE_COMPONENT` (literal path: `@.sweetforge/templates/Functional Architecture/Functional Component.md`) to understand the required sections.
- Use its exact structure. Generate every chapter.
- **If `mode == codebase` or `mode == codebase_all`**: derive the component spec by reading the actual component source files identified in Step 2.A / Step 2.C (props, exports, internal state, peer dependencies).
- **If `mode == new` or `mode == default`**: derive the component spec from `short_description` and reasonable assumptions about its shape.
- Write the resulting spec to `$SPEC_COMPONENTS_DIR/<component_slug>.md`.
- If a spec file already exists at that path, **enrich** it instead of overwriting: merge new content into existing sections, keep the existing heading order, and flag in the final summary which sections were updated. Do not duplicate information.

## Step 5. Final output to the user

After all files are saved, respond with a short summary.

**Single-spec modes** (`codebase`, `new`, `default`):

```
Mode: -codebase | -new | default
Title: <feature_title>

Feature spec file:
  - <path to the feature spec>

Component spec file (if generated):
  - <path to the component spec>, or "none"

Inconsistencies detected: <N_blocker blocker(s), N_warning warning(s)>
  - [BLOCKER] <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>" — encoded as [NEEDS CLARIFICATION] in <chapter>
  - [WARN]    <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
  - ...  (or "none")

Notes:
  - <enrichment details, missing matches, NEEDS CLARIFICATION count, etc.>
```

**Mass mode** (`codebase_all`):

```
Mode: -codebase -all
Requirements processed: <N_success> / <N_total>

Feature spec files:
  - <path_1> — <success | failure reason>
  - <path_2> — ...
  - ...

Component spec files (if any generated):
  - <path_a>
  - <path_b>
  - ...

Inconsistencies detected (aggregated over all requirements): <N_blocker blocker(s), N_warning warning(s)>
  - <requirement_title_X>:
      - [BLOCKER] <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>" — encoded as [NEEDS CLARIFICATION] in <chapter>
      - [WARN]    <concern>: ...
  - <requirement_title_Y>:
      - ...
  - ...  (or "none")

Failures / warnings (if any):
  - <requirement_title_X>: <reason (e.g. no code found, template load failed, etc.)>
  - ...

Notes:
  - <enrichment details (which existing files were enriched vs. created from scratch), NEEDS CLARIFICATION count, etc.>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file(s) and report where they live, with every inconsistency plainly visible.
