---
description: Create or update the application-wide overview spec from a short description, optionally reverse-engineered from the codebase
argument-hint: [-codebase] <short application description>
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$TEMPLATES_DIR` = `.sweetforge/templates/Functional Architecture`
- `$SPEC_FUNCTIONAL_DIR` = `_specification/Functional Architecture`
- `$TEMPLATE_FILE` = `$TEMPLATES_DIR/Functional Overview.md`
- `$OVERVIEW_FILE` = `$SPEC_FUNCTIONAL_DIR/functional-overview.md`

The output path is **fixed**: the command always writes to `$OVERVIEW_FILE`, regardless of the application title. If the file already exists, its content is enriched/updated in place rather than overwritten blindly.

Whenever the instructions below mention the template or the output file in prose, interpret them as these variables.

You are helping to spin up (or refine) the single application-wide overview specification for this project, from a short idea provided in the user input below.
Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human readable `application_title` in Title Case (e.g. "Project Management Application").
- Preserve technical terms and acronyms (OAuth2, API, JWT, etc.).
- Keep the title concise but descriptive enough to understand the application at a glance.
- A detailed Markdown specification file saved **always** at `$OVERVIEW_FILE`, using the exact structure of `$TEMPLATE_FILE`.

Then print a short summary of what you did.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `codebase` or `description`.
   - If `$ARGUMENTS` starts with `-codebase`, set `mode = codebase`. Strip the flag from the arguments before further parsing. In this mode you must analyze the existing codebase (reverse engineering) to derive the overview content.
   - Otherwise, set `mode = description`. The overview content is derived from the textual description alone.
   - If the user passes an unknown flag (e.g. `-foo`), stop and ask the user to clarify instead of guessing.

2. **`application_title`** — a short, human-readable title in Title Case derived from the remaining text.
   - Example: "Project Management Application".
   - If you cannot infer a sensible `application_title`, ask the user to clarify instead of guessing.

## Step 2. Gather the material

Load `$TEMPLATE_FILE` (literal path: `@.sweetforge/templates/Functional Architecture/Functional Overview.md`) to understand the required sections.

Parse the user description in `$ARGUMENTS`.

If `mode == codebase`, before parsing raw source code, perform the **structural index check**:

1. Check whether `.sweetforge/index/_meta.json` exists.
2. **If it exists:**
   a. Read `lastIndexCommit` from the file.
   b. Run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from each manifest entry in `_meta.json` (all 7 manifests: `backend-entities.md`, `backend-api.md`, `frontend-pages.md`, `frontend-components.md`, `frontend-hooks.md`, `frontend-lib.md`, `packages.md`).
   c. **No relevant files changed** (fast path) — read all 7 manifest files from `.sweetforge/index/` and use their content as the codebase analysis input. Skip raw source parsing entirely.
   d. **Some files changed** — read the manifests for scopes whose source globs had zero changes, and parse only the changed files directly for the remaining scopes.
3. **If `_meta.json` does not exist** — fall back to raw source parsing (the behavior described below). After the Step 3 summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

Then analyze the existing codebase (the application has already been implemented). The objective is to perform reverse engineering: derive and clearly express the functional behavior of the application based on its actual implementation, not based on assumptions. Capture the main entities, the top-level domains, the user-visible flows, and any existing overview section (if `$OVERVIEW_FILE` already exists) so you can enrich it rather than overwrite it. When the structural index is available and fresh, the manifests already provide this information in a compact form — use them directly instead of re-scanning the source.

## Step 3. Confirmation (only in `-codebase` mode)

Execute this step **only** when `mode == codebase`. In `description` mode, skip directly to Step 4.

1. **Summarize findings and ask for confirmation.** Present to the user, in this exact structure:
   ```
   Mode: -codebase
   Title: <application_title>

   Existing overview: <path if $OVERVIEW_FILE already exists — will be enriched, or "none — will be created">

   Codebase findings:
     - Main entities detected: <entity_a, entity_b, ...>
     - Top-level domains: <product management, project management, resources, ...>
     - User-visible flows: <flow_1, flow_2, ...>
     - Existing business rules found: <count> (RG-XX markers)

   Chapters that will be <created | rewritten | enriched>:
     - §1 Summary
     - §2 Motivation
     - §3 Requirements
     - ...

   Target output file:
     - $OVERVIEW_FILE

   Proceed? (yes / adjust / abort)
   ```
2. **STOP and wait for the user's confirmation** before continuing to Step 4. Do NOT write any file at this stage.
   - If the user says `adjust`, let them redirect the analysis (different scope, additional sources) and re-run Step 2.
   - If the user says `abort`, stop the command without writing anything.
   - If the user says `yes`, continue to Step 4.

## Step 4. Draft and write the spec

Use the exact structure as defined in the spec template file `$TEMPLATE_FILE` (literal path: `@.sweetforge/templates/Functional Architecture/Functional Overview.md`).

- Generate every chapter defined in the template.
- Do not add technical implementation details such as code examples.
- For unclear aspects:
  - Make informed guesses based on context and industry standards.
  - Only mark with `[NEEDS CLARIFICATION: specific question]` if:
    - The choice significantly impacts application scope or user experience.
    - Multiple reasonable interpretations exist with different implications.
    - No reasonable default exists.
  - Prioritize clarifications by impact: `scope > security/privacy > user experience > technical details`.

Write the resulting Markdown specification to `$OVERVIEW_FILE` (literal path: `@_specification/Functional Architecture/functional-overview.md`), replacing placeholders with concrete details derived from the application description (and, in `-codebase` mode, from the codebase analysis). Preserve the template's section order and headings. If the file already exists, enrich the existing content rather than silently overwriting unrelated chapters.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

```
Mode: codebase | description
Title: <application_title>
Spec file: _specification/Functional Architecture/functional-overview.md
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives.