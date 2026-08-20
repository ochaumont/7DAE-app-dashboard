---
description: Create or update a single component spec — greenfield from a description or reverse-engineered from the codebase, with full consistency check against the spec layer
argument-hint: [-codebase] <component name or short description>
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$TEMPLATES_DIR`         = `.sweetforge/templates/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`
- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_VIBE_DIR`         = `_specification/vibe coding`
- `$OVERVIEW_FILE`         = `$SPEC_FUNCTIONAL_DIR/functional-overview.md`
- `$TEMPLATE_FILE`         = `$TEMPLATES_DIR/Functional Component.md`

All modes of this command produce **exactly one** output file at `$SPEC_COMPONENTS_DIR/<component_slug>.md`. This command is **component-first**: unlike `/sweetforge.feature` (which can generate a component spec as a side-effect of a feature spec), `/sweetforge.component` exists to document a reusable component in isolation — no feature spec is produced, no matter which mode is used.

Whenever the instructions below mention a template path or a spec directory in prose, interpret them as these variables.

You are responsible for creating or refining **one** component specification. The spec must be derived from the user's input and, when the `-codebase` flag is set, from an analysis of the existing source code plus any supporting material under the overview and the vibe-coding notes. If a spec file already exists for this component, your role is to review, refine, and expand it to improve clarity, completeness, and accuracy — never to overwrite it silently.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

The command has two execution modes:

1. **`-codebase` mode** — reverse-engineering: the component already exists in the code. Locate it in the existing overview, source code, vibe-coding notes, and any existing component spec; detect inconsistencies; wait for user confirmation; then produce (or enrich) a `Functional Component.md` spec in `$SPEC_COMPONENTS_DIR/`.
2. **Default mode** (no flag) — greenfield: the component does not exist yet. Produce a `Functional Component.md` spec directly from the user's description, without searching the codebase.

In `-codebase` mode, the command MUST run a **consistency check** between the sources (overview, code, vibe-coding notes, existing component spec if any, and any feature spec that references the component) and surface every contradiction to the user before writing anything. The check never silently picks a winner: the user always sees what disagrees with what.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `codebase` or `default`.
   - Flag matching is **case-insensitive**: `-codebase` is the canonical form but `-codeBase`, `-CodeBase`, `-CODEBASE` are all accepted.
   - If `$ARGUMENTS` starts with `-codebase`, set `mode = codebase`. Strip the flag from the arguments before further parsing.
   - Otherwise, set `mode = default`.
   - If the user passes any other unknown flag (e.g. `-foo`), stop and ask the user to clarify instead of guessing.

2. **`component_name`** — a short, human-readable name derived from the remaining text.
   - Example: "Sweet Gantt", "DataTable", "Assignment Modal".
   - Preserve technical terms and acronyms (OAuth2, API, JWT, etc.).
   - If the remaining text is empty (or whitespace-only), stop and ask the user to provide a component name.
   - If you cannot infer a sensible `component_name`, ask the user to clarify instead of guessing.

3. **`component_slug`** — a kebab-case slug derived from `component_name` (e.g. `sweet-gantt`, `data-table`, `assignment-modal`). This is the **filename stem** used for the output at `$SPEC_COMPONENTS_DIR/<component_slug>.md`.
   - Before finalizing the slug, list the existing files in `$SPEC_COMPONENTS_DIR/`. If one of them matches the same component under a slightly different slug (e.g. `sweet-releaseGrid.md` vs `sweet-release-grid`, or `DataTable.md` vs `data-table`), **reuse the existing slug** rather than creating a sibling file. Fragmenting the same component across two files is a harder mistake to undo than picking a wrong-but-fixable slug.

## Step 2. Branch on `mode`

### Step 2.A — `mode == codebase` (reverse-engineering)

Execute this step **only** when `mode == codebase`.

0. **Structural index check** (applies to sub-step 2 below).

   Before parsing raw source code, check whether a pre-built structural index exists:

   a. Check whether `.sweetforge/index/_meta.json` exists.
   b. **If it exists:** read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from the `_meta.json` manifest entries for: `packages.md`, `frontend-components.md`, `frontend-hooks.md`. If no relevant files changed (fast path), read those 3 manifests from `.sweetforge/index/` and use their content for sub-step 2 ("Search the source code") — the manifests provide the component's public API, callers, and package structure. Still parse the specific component's entry-point file for prop-level detail that the manifests may summarize. If some files changed, read the manifests for unchanged scopes and parse only the changed files directly.
   c. **If `_meta.json` does not exist:** fall back to raw source parsing in sub-step 2. After the Step 2.A.6 summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

1. **Search the overview.**
   - Open `$OVERVIEW_FILE` (literal path: `@_specification/Functional Architecture/functional-overview.md`).
   - Identify any mention of the component or of the features it powers. Capture the relevant section headings and bullets.
   - If no mention is found, record it — it is not a blocker (not every component is named in the overview), but it means the component's usage context will have to be reconstructed from the code and from the feature specs alone.

2. **Search the source code.**
   - Use Glob/Grep to locate the files that implement the component. Look across the monorepo (backend services, frontend components, shared packages `sweet-*`). Components typically live in:
     - `sweet-frontend/src/components/**/*.{ts,tsx}`
     - `sweet-frontend/src/hooks/**/*.ts`
     - `sweet-<package>/src/**/*.{ts,tsx}` for shared workspace packages
     - `sweet-backend/src/main/java/.../service/` or `.../controller/` for backend services
   - Capture the entry point (class, React component, hook, or service), its public API (props, events, exported types, method signatures), its internal state, and its peer dependencies.
   - Also capture every **caller** — files that import this component — since the callers define the real usage contract. This matters for the "Consumers" / "Usage" section of the spec and for naming-drift detection.
   - If nothing matches, record it — `-codebase` mode presumes an existing implementation, so the absence of code is a **blocker** you must report to the user in the confirmation summary.

3. **Search the vibe-coding notes.**
   - List every file under `$SPEC_VIBE_DIR/` (literal path: `@_specification/vibe coding/`) and identify any whose name or contents reference the component (by name or by one of its features).
   - Capture the matching file paths and a short note on why they are relevant.
   - Treat vibe-coding notes as a **first-class source** (same weight as the overview and the code). They often capture design intent and rationale that the code alone does not surface.
   - If the folder is empty or no file matches, record it and move on — it's not a blocker.

4. **Check the existing component spec and any feature spec that references this component.**
   - Look for an existing file at `$SPEC_COMPONENTS_DIR/<component_slug>.md`. If one exists, read its current content — you will **enrich** it rather than overwrite it.
   - Also scan `$SPEC_FUNCTIONAL_DIR/**/Functional Feature.md` for any feature spec that mentions the component (by slug, by class name, or by natural-language name). Capture those file paths — they contribute both usage context (which features rely on this component) and cross-file consistency targets.

5. **Detect inconsistencies between sources.**

   Compare the sources gathered in the previous four sub-steps and detect factual contradictions. Apply the same inconsistency catalog as `/sweetforge.feature`:

   - **Structural contradictions** — same prop / event / exported type / method signature declared with different names, types, cardinalities, or required/optional flags across sources. For example: the overview says the calendar takes a percentage as `number`, the code declares `BigDecimal`, an existing feature spec says `string`. Report as `blocker` when the public contract is affected.
   - **Behavioral contradictions** — one source describes behavior X for an interaction, another describes incompatible behavior Y for the same trigger (e.g. overview says "drag-over auto-scrolls", the code has no auto-scroll sensor wired, a vibe note says auto-scroll was deliberately dropped). Report as `blocker`.
   - **Scope contradictions** — one source marks a capability as supported by the component, another marks it as out-of-scope / deferred / not implemented. Report as `blocker` when it would mislead a consumer.
   - **Naming / terminology drift** — the same concept referred to by different names across sources (e.g. `onToggleDay` vs `onDateToggle`, `props.nonWorkingDays` vs `props.leaveDays`). Report as `warning`, not blocker — unless the drift creates ambiguity about which version is authoritative.
   - **Existence contradictions** — one source references a prop / event / type / enum value that another source clearly denies (not just omits — omission alone is NOT a contradiction).
   - **Cross-reference breakage** — a feature spec references the component through a name, slug, or marker (BR-XX / UC-XX) that no longer exists in the component code.

   For every inconsistency, record a tuple:
   - `source_a` (path or `"code at <file:line>"`)
   - `source_b` (path or `"code at <file:line>"`)
   - `concern` — the prop / behavior / rule in one short phrase
   - `value_a`, `value_b` — what each source says
   - `severity` — `blocker` or `warning`

   **Do not silently resolve inconsistencies.** Even when an authority order could trivially pick a winner, you MUST list every inconsistency in the confirmation summary below. The user decides whether to abort and fix, or to proceed anyway. If the user proceeds with `yes` while blockers remain unresolved, the written spec MUST encode each blocker as a `[NEEDS CLARIFICATION: <concern> — <source_a> says X, <source_b> says Y]` marker inside the relevant chapter, so the contradiction stays visible in the final document.

6. **Summarize findings and ask for confirmation.**
   - Present to the user, in this exact structure:
     ```
     Mode: -codebase
     Component: <component_name>  (slug: <component_slug>)

     Overview mentions:
       - <section heading in functional-overview.md, or "no direct mention">
       - <short summary of what it says>

     Source code:
       - <path/to/entry_point> — <one-line purpose>
       - <path/to/supporting_file> — <one-line purpose>
       - ...
       Callers (N found):
         - <path/to/caller_file> — <how it uses the component>
         - ...

     Vibe-coding notes:
       - <path/to/note> — <why it's relevant>
       - ...  (or "no related notes")

     Existing component spec: <path if it already exists and will be enriched, or "none — will be created">

     Feature specs that reference this component:
       - <path/to/feature_spec> — <how it references the component>
       - ...  (or "none")

     Inconsistencies detected: <N_blocker blocker(s), N_warning warning(s)>
       - [BLOCKER] <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
       - [WARN]    <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
       - ...  (or "none")

     Target output file:
       - $SPEC_COMPONENTS_DIR/<component_slug>.md

     Proceed? (yes / adjust / abort)
     ```
   - If at least one `BLOCKER` inconsistency is present, append one line to the summary: *"BLOCKER inconsistencies will be encoded as `[NEEDS CLARIFICATION]` markers in the written spec unless you `abort` and fix the sources first."*
   - **STOP and wait for the user's confirmation** before continuing to Step 3. Do NOT write any file at this stage.
   - If the user says `adjust`, let them redirect the search (different component, different slug, different files) and re-run Step 2.A.
   - If the user says `abort`, stop the command without writing anything.
   - If the user says `yes`, continue to Step 3. Carry the list of inconsistencies forward — they will be emitted as `[NEEDS CLARIFICATION]` markers in Step 3 and listed in the final summary in Step 4.

### Step 2.B — `mode == default` (greenfield)

Execute this step **only** when `mode == default`.

1. Do **not** search the overview, the source code, or the vibe-coding notes. The component is assumed not to exist yet.
2. Interpret the user's input as the creative seed for the component spec.
3. Do **not** ask for confirmation at this stage — proceed directly to Step 3. (The user already chose the default mode by omitting the flag.)

## Step 3. Draft and write the component spec

- Load `$TEMPLATE_FILE` (literal path: `@.sweetforge/templates/Functional Architecture/Functional Component.md`) to understand the required sections.
- Use its exact structure. Generate every chapter.
- **If `mode == codebase`**: derive the content by **reverse engineering** the source files identified in Step 2.A — describe what the component actually exposes today (props, events, exported types, internal state, peer dependencies), not what it should expose. Integrate the context gathered from `$OVERVIEW_FILE` and from the vibe-coding notes. Reflect the real callers in the "Usage" / "Consumers" chapter if the template has one.
- **If `mode == default`**: derive the content from the user's description and industry-standard defaults for unclear aspects.
- Write the resulting spec to `$SPEC_COMPONENTS_DIR/<component_slug>.md`. The filename MUST be exactly `<component_slug>.md` (kebab-case, derived in Step 1) — do NOT use camelCase, do NOT use the `Functional Component.md` literal name (which belongs to the template, not to output files), do NOT use `spec.md` or similar variants.
- If a spec file already exists at that path, **enrich** it instead of overwriting: merge new content into existing sections, keep the existing heading order, preserve any manual annotations the user may have added, and flag in the final summary which sections were updated. Do not duplicate information.

In all cases:
- Replace placeholders with concrete details derived from the description (and from the code, for `-codebase`).
- Preserve section order and headings from the template.
- Do **not** add technical implementation details such as code examples.
- For unclear aspects:
  - Make informed guesses based on context and industry standards.
  - Only mark with `[NEEDS CLARIFICATION: specific question]` if:
    - The choice significantly impacts the component's public contract or its usage.
    - Multiple reasonable interpretations exist with different implications.
    - No reasonable default exists.
  - Prioritize clarifications by impact: public API > behavior > internal state > styling / theming.
- **Unresolved inconsistencies from Step 2.A-5** MUST each be encoded as a `[NEEDS CLARIFICATION: <concern> — <source_a> says X, <source_b> says Y]` marker inside the chapter of the spec that covers the concern (structural contradictions land in `API` / `Props` / `Data Structure`; behavioral contradictions land in `Features` / `Interactions`; cross-reference issues land in `Usage` / `Consumers`). Do not hide them in a footnote or drop them silently.
- When enriching an existing spec, pay special attention to the sub-category "existing spec vs new findings": prefer to rewrite the contradicted chapter with the new finding and move the old value into a `[NEEDS CLARIFICATION: existing spec said X, code now shows Y]` marker, rather than overwriting silently.

## Step 4. Final output to the user

After the file is saved, respond with a short summary in this exact format:

```
Mode: -codebase | default
Component: <component_name>
Slug: <component_slug>

Spec file:
  - <path to the component spec>  [created | enriched]

Inconsistencies detected: <N_blocker blocker(s), N_warning warning(s)>
  - [BLOCKER] <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>" — encoded as [NEEDS CLARIFICATION] in <chapter>
  - [WARN]    <concern>: <source_a> says "<value_a>", <source_b> says "<value_b>"
  - ...  (or "none")

Notes:
  - <enrichment details (which chapters were touched), missing matches, NEEDS CLARIFICATION count, etc.>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives, with every inconsistency plainly visible.
