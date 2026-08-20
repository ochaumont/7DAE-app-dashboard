---
description: Create or update the consolidated data-model spec by merging entity information from every feature and component spec; optionally cross-reference the codebase
argument-hint: [-codebase]
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$TEMPLATES_DIR`         = `.sweetforge/templates/Functional Architecture`
- `$TEMPLATE_FILE`         = `$TEMPLATES_DIR/Data Model.md`
- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`
- `$OVERVIEW_FILE`         = `$SPEC_FUNCTIONAL_DIR/functional-overview.md`
- `$DATA_MODEL_FILE`       = `$SPEC_FUNCTIONAL_DIR/data-model.md`

The output path is **fixed**: the command always writes to `$DATA_MODEL_FILE`, regardless of arguments. If the file already exists, its content is enriched in place rather than overwritten blindly.

Whenever the instructions below mention the template or the output file in prose, interpret them as these variables.

You are responsible for building (or refreshing) the **consolidated data-model specification** of this application by reading every feature spec under `$SPEC_FUNCTIONAL_DIR/` and every component spec under `$SPEC_COMPONENTS_DIR/`, extracting the entity / field / relationship information each one mentions, merging it, and writing a single authoritative data-model document at `$DATA_MODEL_FILE` following the exact structure of `$TEMPLATE_FILE`.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

This command performs a **merge-and-consolidate** operation:

1. Walk the whole functional-architecture and components spec trees.
2. For each spec file, extract any entity-level information it exposes (fields, types, relationships, enums, join tables, business rules that bind the data model).
3. If `-codebase` is set, also cross-reference the extracted model with the actual backend and frontend source code (Java entities, TypeScript types / interfaces / enums) to catch entities that exist in code but have not yet been documented in any spec, and to detect contradictions between specs and code.
4. Deduplicate and reconcile the findings into a single, coherent entity catalog.
5. Fill in the `Data Model` template and write the result to `$DATA_MODEL_FILE` (enriching an existing file rather than overwriting it when it is already present).
6. Report every contradiction resolved and every new entity surfaced.

The command does **not** invent entities. If an entity is referenced in specs without a field list, it is kept as a stub in the output with a `[NEEDS CLARIFICATION: fields not documented]` marker on its fields row — unless `-codebase` is set and the fields can be recovered from the source.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `specs_only` or `codebase`.
   - If `$ARGUMENTS` starts with `-codebase` (case-insensitive), set `mode = codebase`. Strip the flag from the arguments before further parsing.
   - Otherwise, set `mode = specs_only`.
   - If the user passes any unknown flag, stop and ask the user to clarify instead of guessing.
   - `$ARGUMENTS` is not expected to carry any additional text beyond the flag. If extra text is present, ignore it silently (it may be a user comment) but report in the final summary that it was ignored.

## Step 2. Collect the source specs

1. **Enumerate every markdown spec file** under:
   - `$SPEC_FUNCTIONAL_DIR/**/*.md` (recursive) — includes `functional-overview.md` at the root and every `Functional Feature.md` inside requirement sub-folders.
   - `$SPEC_COMPONENTS_DIR/**/*.md` (recursive) — every component spec.
   - Explicitly **exclude** `$DATA_MODEL_FILE` itself from the walk (to avoid feeding the previous consolidated output back into the next run as if it were a source).
2. Build an **ordered list** of spec files to read, with `$OVERVIEW_FILE` first (it is the most authoritative source for the domain model), followed by feature specs, then component specs.

## Step 3. Extract entity fragments from each spec

For every file collected in Step 2, read it and pull out any information that describes the data model. Look for:

- **Sections explicitly labelled `Data Model`, `Data Structure`, `Entities`, `Fields`, `Relationships`, `Enums`, `Types`.** These are the primary sources.
- **Inline mentions of entity names, field names, and types** inside sections like `Features`, `API`, `Business Rules`, `Acceptance Criteria`, `Edge Cases` (secondary — used to corroborate or enrich the primary sources, never as the sole basis for a new entity).
- **TypeScript-style type blocks** (```ts ... ```), **Java-style class blocks** (```java ... ```) or prop-table rows that spell out field names and types. Treat them as authoritative for the file they come from.
- **Enum values** expressed either as a table or as a `| "VALUE" | "VALUE" |` union.

For every extracted fragment, record:

- `entity_name` — the class/type name as written in the source.
- `source_file` — the relative path to the spec it came from.
- `fields` — a list of `{ name, type, required, default, description, validation }` objects.
- `relationships` — a list of `{ name, target, cardinality, via, cascade }`.
- `business_rules` — any RG-XX markers that constrain this entity.
- `enum_values` — if the entity is an enum.

Keep one fragment per `(entity_name, source_file)` pair. Do NOT merge across files yet — that happens in Step 5.

## Step 4. (Optional) Cross-reference the codebase

Execute this step **only** when `mode == codebase`.

Before scanning raw source files, perform the **structural index check**:

1. Check whether `.sweetforge/index/_meta.json` exists.
2. **If it exists:** read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from the `_meta.json` manifest entries for: `backend-entities.md`, `frontend-lib.md`. If no relevant files changed (fast path), read those 2 manifests from `.sweetforge/index/` — `backend-entities.md` provides all Java entity classes, fields, types, and annotations; the Types section of `frontend-lib.md` provides the TypeScript interfaces and enums. Use the manifest content instead of scanning raw source. Skip sub-steps 4.1 and 4.2 below. If some files changed, read the manifests for unchanged scopes and parse only the changed files directly.
3. **If `_meta.json` does not exist** — fall back to raw source scanning as described in sub-steps 4.1 and 4.2 below. After the Step 6 summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

If the index check did not short-circuit, proceed with raw source scanning:

1. Scan the backend Java sources (typically under `sweet-backend/src/main/java/.../model/`) for classes annotated with `@Data`, `@SuperBuilder`, or extending `BaseEntity`. Capture their field declarations, types, and any JPA/validation annotations.
2. Scan the `sweet-types/` workspace package (if present) and the frontend `src/types/` folder for `interface`, `type`, and `enum` declarations.
3. For every code-level entity:
   - If the name **already** appears in the Step 3 extraction, enrich the fragment with the code-side fields (add missing ones, flag contradictions where a field type differs between spec and code).
   - If the name **does not** appear in any spec fragment, add a new fragment tagged `source_file = <code path>` and mark the entity with `origin = code-only` in the final summary — these are entities that exist in the implementation but are not yet documented in any spec.
4. Contradictions between spec and code are resolved by **preferring the code** (since it is executable truth) and recording the discrepancy in the final summary so the user can decide whether to update the spec.

## Step 5. Merge and deduplicate

1. Group all fragments by `entity_name` (case-sensitive, but with a fallback: if two fragments differ only by casing or by `Produit` vs `Product`, treat them as the same entity and standardise on the name used in `$OVERVIEW_FILE` when it appears there, otherwise the most common spelling).
2. For each entity group:
   - Build a **union of fields**. For each field, pick the most complete definition (the one with the most non-empty columns). If two definitions genuinely contradict on `type` or `required`, record the contradiction and keep the definition from the most authoritative source in this order: `$OVERVIEW_FILE` > code (if `-codebase`) > feature spec > component spec.
   - Build a **union of relationships** and deduplicate by `(target, via)`.
   - Build a **union of business rules** referenced.
3. Classify each entity as:
   - **Core** — has its own identity and its own fields beyond foreign keys.
   - **Join / association** — exists only to link two other entities via a pair of foreign keys (e.g. `ProjetLivrable`, `PhaseLivrable`, `MilestonePhase`).
   - **Enum** — no fields, only a set of values.
4. Compute the **entity dependency graph**: for every core and join entity, determine which entities it depends on (via non-nullable foreign keys), and order them into dependency levels (Level 0 = no dependencies, Level N = depends on at least one Level N-1 entity).

## Step 6. Confirmation

Before writing anything, present a summary of the consolidated model and wait for user confirmation. Because this command rewrites an aggregated file (`data-model.md`) that may contain manual annotations, the user must approve the scope of the change explicitly.

1. Present to the user, in this exact structure:
   ```
   Mode: specs_only | codebase
   Spec files scanned: <N_files>  (functional arch: <N_arch>, components: <N_comp>)

   Existing data-model.md: <path if it already exists and will be enriched, or "none — will be created">

   Entities consolidated: <N_total>
     - Core: <N_core>
     - Join / association: <N_join>
     - Enum: <N_enum>

   New entities detected (if any):
     - <entity_name> — from <source_file>  (<origin: spec | code-only>)
     - ...  (or "none")

   Contradictions detected: <N>
     - <entity>.<field> — <source_a> says "<value_a>", <source_b> says "<value_b>" → will pick <winner> per authority order
     - ...  (or "none")

   Chapters that will be <created | rewritten | enriched>:
     - §1 Overview
     - §2 Base Entity
     - §3 Core Entities (<N_core> blocks)
     - §4 Join / Association Entities (<N_join> blocks)
     - §5 Entity Dependency Graph
     - §6 Field Type Reference
     - §7 Complete Entity List

   Target output file:
     - $DATA_MODEL_FILE

   Proceed? (yes / adjust / abort)
   ```
2. **STOP and wait for the user's confirmation** before continuing to Step 7. Do NOT write any file at this stage.
   - If the user says `adjust`, let them narrow the scope (exclude a spec file, skip the codebase cross-reference, etc.) and re-run from Step 2.
   - If the user says `abort`, stop the command without writing anything.
   - If the user says `yes`, continue to Step 7.

## Step 7. Fill the template and write the output

1. Load `$TEMPLATE_FILE` (literal path: `@.sweetforge/templates/Functional Architecture/Data Model.md`) to understand the required sections.
2. Generate every chapter defined in the template, using the material from Step 5:
   - **§1 Overview** — count of core vs join entities; an ASCII ERD summarising the main relationships (use the style shown in the template's `1.2` block).
   - **§2 Base Entity** — the common fields shared by every entity (typically `id: UUID`, `createdAt`, `updatedAt`). Extract from `$OVERVIEW_FILE` if present, otherwise from the first spec that mentions a base class.
   - **§3 Core Entities** — one block per core entity, in the order given by the dependency graph (Level 0 first). For each block, fill the class table, the Fields table, the Relationships table, and the Business Rules list.
   - **§4 Join / Association Entities** — one block per join entity, with its purpose, fields, uniqueness constraint and cascade behavior.
   - **§5 Entity Dependency Graph** — render the level-by-level dependency graph computed in Step 5.
   - **§6 Field Type Reference** — keep the template's default table, and extend it only with types that actually appear in the consolidated model and are not in the default list.
   - **§7 Complete Entity List** — one row per entity in the final catalog, giving the `#`, `Entity`, `Type (Core / Join / Enum)`, `Fields` count, `Relationships` summary, and `API` base path (pulled from the source spec if mentioned, otherwise left blank).
3. Preserve the template's heading order and numbering exactly. Do not add new top-level sections that are absent from the template.
4. Do **not** add technical implementation details such as code examples (one-line signatures inside the field tables are fine, full code blocks are not).
5. For unclear aspects:
   - Make informed guesses based on context and existing patterns in the specs.
   - Only mark `[NEEDS CLARIFICATION: specific question]` when:
     - An entity is referenced without a field list anywhere.
     - A field type genuinely conflicts between two authoritative sources.
     - A cardinality cannot be determined from the specs (and the codebase is not available / `-codebase` not set).
6. **Write strategy**:
   - If `$DATA_MODEL_FILE` does **not** exist, create it from the consolidated content.
   - If it **already exists**, enrich it in place: preserve the existing section order, update each chapter with the newly-computed content, keep any manual annotations the user may have added (do not silently discard content that is not regenerable from specs), and flag in the final summary which chapters were touched.
   - Never delete an entity from the existing file without flagging it — only the user decides whether an entity removal is intentional or an oversight.

## Step 8. Final output to the user

After the file is saved, respond with a short summary in this exact format:

```
Mode: specs_only | codebase
Spec files scanned: <N_files>
Entities consolidated: <N_total>  (core: <N_core>, join: <N_join>, enum: <N_enum>)

Output file:
  - _specification/Functional Architecture/data-model.md  [created | enriched]

New entities surfaced (if any):
  - <entity_name> — from <source_file>
  - ...

Contradictions resolved (if any):
  - <entity_name>.<field> — <source_A> said <value_A>, <source_B> said <value_B>, picked <winner> because <reason>
  - ...

Unresolved clarifications (if any):
  - <entity_name>: <short question>
  - ...

Notes:
  - <chapters touched (for an enrichment run), ignored extra arguments, anything else worth surfacing>
```

Do not repeat the full data-model file in the chat output unless the user explicitly asks to see it. The main goal is to save the consolidated spec and report what changed.
