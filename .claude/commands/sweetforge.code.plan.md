---
description: Read specification files and generate a phased incremental implementation plan with SpecKit-compatible spec.md + plan.md per phase under specs/
argument-hint: [-refresh] [phase count or scope guidance]
allowed-tools: Read, Write, Glob, Grep, Bash
handoffs:
  - label: Generate tasks for a phase
    agent: speckit.tasks
    prompt: Generate tasks for the current phase
    send: true
  - label: Implement a phase
    agent: speckit.implement
    prompt: Start the implementation
    send: true
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_TECHNICAL_DIR`    = `_specification/Technical Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`
- `$OVERVIEW_FILE`         = `$SPEC_FUNCTIONAL_DIR/functional-overview.md`
- `$PLAN_DIR`              = `_plan`
- `$SPECS_DIR`             = `specs`
- `$INDEX_DIR`             = `.sweetforge/index`
- `$SPECKIT_TEMPLATES`     = `.specify/templates`

You are generating a **phased incremental implementation plan** from the project's specification layer. The command produces two outputs:

1. A human-readable plan index at `$PLAN_DIR/README.md`
2. One **SpecKit-compatible feature directory** per phase at `$SPECS_DIR/<NNN>-phase-<N>-<slug>/` containing `spec.md` and `plan.md` in the exact formats expected by `/speckit.tasks`

This allows the user to run `/speckit.tasks` then `/speckit.implement` on any phase without further transformation.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

The command reads every specification file in the project (`$SPEC_FUNCTIONAL_DIR/`, `$SPEC_TECHNICAL_DIR/`, `$SPEC_COMPONENTS_DIR/`), analyzes feature dependencies, and produces:

1. `$PLAN_DIR/README.md` — overview (dependency graph, phase table, agent strategy, stack summary, usage instructions).
2. Per phase — `$SPECS_DIR/<NNN>-phase-<N>-<slug>/spec.md` + `plan.md` in SpecKit format, ready for `/speckit.tasks`.

The command supports two modes:

- **Default mode** — full plan generation from scratch.
- **`-refresh` mode** — re-read the specifications and update the existing plan in place. Preserves phase structure if possible.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `refresh` or `generate`.
   - If `$ARGUMENTS` starts with `-refresh`, set `mode = refresh`. Strip the flag.
   - Otherwise, set `mode = generate`.

2. **`user_guidance`** — the remaining text after flags. Optional. May contain:
   - A target phase count (e.g. "7 phases", "5 sprints") — use as a hint, not a hard constraint.
   - Scope guidance (e.g. "backend only", "skip dashboards") — filter features accordingly.
   - If empty, use the default heuristic (see Step 3).

## Step 2. Gather the material

### 2.1 Load specifications

Read every `.md` file under these directories (recursive):

- `$SPEC_FUNCTIONAL_DIR/` — functional overview + feature specs
- `$SPEC_TECHNICAL_DIR/` — backend and frontend architecture
- `$SPEC_COMPONENTS_DIR/` — component specs (workspace packages, UI components)

For each file, capture:
- Path (relative to workspace root)
- Feature/domain it describes
- Entities (with field names, types, relationships), endpoints, components, business rules (RG-XX) mentioned
- Dependencies on other features (explicit cross-references or entity dependencies)

**Critical**: extract entity **field-level details** (names, types, constraints) and **endpoint signatures** (HTTP verb, path, request/response shapes, status codes) — these will be inlined into the generated spec.md and plan.md so that downstream SpecKit commands have all the information without needing to read `_specification/`.

### 2.2 Structural index (optional acceleration)

Before parsing raw spec files, check whether `.sweetforge/index/_meta.json` exists:

- **If it exists:** read the manifests to get a compact view of what exists. Use this to cross-reference the spec scope against the actual codebase — identify what is already implemented vs. what remains to build.
- **If it does not exist:** skip. The plan is generated purely from specifications.

### 2.3 Existing plan (refresh mode only)

If `mode == refresh`, read the current `$PLAN_DIR/README.md` and all existing `$SPECS_DIR/*-phase-*/spec.md` files to understand the existing plan structure. The goal is to minimize disruption.

## Step 3. Analyze and design phases

### 3.1 Identify functional blocks

From the gathered material, identify the **functional blocks** to implement. Typically these map to the feature specs under `$SPEC_FUNCTIONAL_DIR/`, but a single spec may be split across phases if it is too large, or multiple small specs may be grouped into one phase.

For each block, record:
- `block_name` — human-readable name
- `entities` — backend entities involved (with fields)
- `endpoints_estimate` — approximate endpoint count
- `components` — frontend pages, components, hooks involved
- `business_rules` — RG-XX rules to implement
- `workspace_packages` — sweet-* packages involved
- `depends_on` — other blocks this one depends on

### 3.2 Build the dependency graph

From the `depends_on` relationships, build a directed acyclic graph of blocks. Identify:

- **Foundation blocks** — no dependencies (auth, shared types, base infrastructure)
- **Core blocks** — depend only on foundation (main entity CRUD)
- **Integration blocks** — depend on multiple core blocks (cross-domain features, visualizations)
- **Consumer blocks** — depend on everything else (dashboards, reporting)

### 3.3 Assign blocks to phases

Group blocks into phases following these principles:

1. **Respect the dependency graph** — a phase never depends on a later phase.
2. **Each phase is deployable** — after completing a phase, the application is functional.
3. **Each phase is testable** — concrete verification criteria exist.
4. **Roughly balanced effort** — no phase should be dramatically larger than others.
5. **Parallelizable where possible** — identify blocks within a phase that can be built by independent agents.
6. **Foundation first** — infrastructure, auth, shared types, reusable UI components come early.
7. **Visualizations and packages can be deferred** — workspace packages are pure presentation.
8. **Dashboards and reporting last** — they are pure consumers.

Default target: **6-8 phases**. Adjust based on `user_guidance` if provided.

### 3.4 Name the phases

Each phase gets:
- A **sequential number** (1-based)
- A **3-digit SpecKit prefix** for the `$SPECS_DIR/` directory (e.g. `001`, `002`, ...) — this is required by SpecKit's branch/directory naming convention (`^[0-9]{3}-`)
- A **slug** (kebab-case, e.g. `phase-1-foundation`, `phase-2-produits-ressources`)
- A **title** (human-readable)

The output directory name follows the pattern: `$SPECS_DIR/<NNN>-phase-<N>-<slug>/` (e.g. `specs/001-phase-1-foundation/`).

## Step 4. Confirmation

Present to the user, in this exact structure:

```
Mode: generate | refresh

Specification files read: <N_total>
  - Functional: <N_func> files
  - Technical: <N_tech> files
  - Components: <N_comp> files

Entities detected: <N_entities>
Endpoints estimated: ~<N_endpoints>
Business rules: <N_rules> (RG-XX)
Workspace packages: <N_packages>

Phases proposed: <N_phases>
  1. <phase_title_1> — <1-line summary>
     Entities: <list>  |  Endpoints: ~<N>  |  Rules: <list>
     SpecKit dir: $SPECS_DIR/001-phase-1-<slug>/
  2. <phase_title_2> — <1-line summary>
     Entities: <list>  |  Endpoints: ~<N>  |  Rules: <list>
     SpecKit dir: $SPECS_DIR/002-phase-2-<slug>/
  ...

Dependency graph:
  Phase 1
    |
  Phase 2
    |
  ...

Target output:
  - $PLAN_DIR/README.md
  - $SPECS_DIR/001-phase-1-<slug>/spec.md + plan.md
  - $SPECS_DIR/002-phase-2-<slug>/spec.md + plan.md
  - ...

Proceed? (yes / adjust / abort)
```

**STOP and wait for the user's confirmation** before writing any file.

- If the user says `adjust`, let them reorder, merge, split, or rename phases, then re-present.
- If the user says `abort`, stop without writing anything.
- If the user says `yes`, proceed to Step 5.

## Step 5. Write the files

### 5.1 Write `$PLAN_DIR/README.md`

The README contains:

1. **Title** — `# Plan d'implementation -- <application name>`
2. **Approche** — incremental methodology description
3. **Workflow par phase** — usage instructions:
   ```
   # Select the phase to work on:
   export SPECIFY_FEATURE=001-phase-1-foundation
   
   # Generate tasks:
   /speckit.tasks
   
   # Execute:
   /speckit.implement
   ```
4. **Graphe de dependances** — ASCII art dependency graph
5. **Strategie agents** — per-phase agent parallelism opportunities
6. **Tableau recapitulatif** — markdown table: Phase, Nom, Entites BE, Endpoints, Pages FE, Composants, Regles, Packages
7. **Stack technique** — bullet list

### 5.2 Write SpecKit `spec.md` for each phase

For each phase, write `$SPECS_DIR/<NNN>-phase-<N>-<slug>/spec.md` following the **SpecKit spec template format** (`@.specify/templates/spec-template.md`).

The mapping from the phase analysis to the SpecKit spec format is:

#### Header

```markdown
# Feature Specification: Phase <N> -- <phase_title>

**Feature Branch**: `<NNN>-phase-<N>-<slug>`
**Created**: <today's date>
**Status**: Draft
**Input**: Generated by /sweetforge.code.plan from _specification/
```

#### User Scenarios & Testing

Map the phase scope into **User Stories ordered by implementation priority**. Each story represents one coherent, independently testable slice of work within the phase.

**Mapping rules for User Stories:**

- **Backend entity CRUD + its frontend page** = one User Story. Example: "Product Owner can create, edit, delete, and list products via the /produits page" is US1 if Products are the first deliverable.
- **A shared infrastructure layer** (auth, base components, libs) = one User Story, typically P1 in foundation phases.
- **A complex tab or sub-feature** that can be tested in isolation = one User Story. Example: "Project Manager can manage milestones with RG-04 late detection and RG-06 gate ordering" is a separate story from "Project Manager can manage phases".
- **A workspace package** = one User Story (e.g. "sweet-gantt renders project timelines with zoom and drag").

For each User Story:

```markdown
### User Story <N> - <Brief Title> (Priority: P<N>)

<Describe user journey in plain language — who does what and sees what result>

**Why this priority**: <dependency/value justification>

**Independent Test**: <concrete test: "Start backend+frontend, login as <role>, navigate to <route>, perform <action>, verify <result>">

**Acceptance Scenarios**:

1. **Given** <state>, **When** <action>, **Then** <outcome>
2. **Given** <state>, **When** <action>, **Then** <outcome>
```

**Critical rules for acceptance scenarios:**
- Each scenario must be **concrete and testable** — include specific values, routes, HTTP status codes.
- Include **negative scenarios** for business rules (e.g. "Given total > 100%, When user clicks Save, Then save button is disabled and error message appears").
- Include the **RG-XX rule number** in scenarios that test business rules.
- Infer the scenarios from the specification content gathered in Step 2 — do NOT use generic placeholders.

#### Edge Cases

List edge cases relevant to this phase (empty states, long names, server errors, concurrent access patterns, etc.).

#### Requirements — Functional Requirements

Map every endpoint and business rule from the phase scope into **FR-XXX** requirements. These must be **self-contained** — include the full detail so SpecKit tasks can generate implementation tasks without reading `_specification/`.

**Mapping rules:**

- Each backend endpoint = one FR. Format: `FR-XXX: System MUST expose <HTTP_VERB> <path> that <behavior>. Returns <status_code> on success, <error_status> on <error_condition>.`
- Each business rule = one FR. Format: `FR-XXX: System MUST enforce <RG-XX>: <rule description>. Backend returns <status> when violated. Frontend <UI behavior>.`
- Each frontend page/component = one FR. Format: `FR-XXX: System MUST provide <route/component> that <functionality>.`
- Each shared library/hook = one FR. Format: `FR-XXX: System MUST provide <lib/hook> that <exports and behavior>.`

**Include field-level details in entity FRs.** Example:
```
FR-003: System MUST expose POST /api/produits that creates a Produit with fields: nom (String, required), type (enum: SOFTWARE|HARDWARE, required), responsableId (UUID, optional), productManager (String, optional), architect (String, optional), origine (enum: CREATED|IMPORTED, default CREATED), externalReference (String, optional). Returns 201 on success.
```

#### Key Entities

List every entity for this phase with **all fields, types, and constraints**. This is the data model section — it replaces what SpecKit would normally get from `data-model.md`.

```markdown
### Key Entities

- **<EntityName>**: <brief description>
  - `id`: UUID (inherited from BaseEntity)
  - `fieldName`: Type (constraint) — description
  - `fieldName`: Type (enum: VAL1|VAL2|VAL3) — description
  - Relationships: belongs to <Entity> via `foreignKeyId`, has many <Entity>
```

**Include ALL fields** from the `_specification/` analysis. Do not summarize or abbreviate — the spec.md must be the single source of truth for this phase.

#### Success Criteria

Map the verification criteria from the phase analysis into measurable outcomes:

```markdown
### Measurable Outcomes

- **SC-001**: <criterion mapped from verification checklist>
- **SC-002**: ...
```

#### Assumptions

List prerequisites (previous phases completed), technology stack assumptions, and scope boundaries for this phase.

### 5.3 Write SpecKit `plan.md` for each phase

For each phase, write `$SPECS_DIR/<NNN>-phase-<N>-<slug>/plan.md` following the **SpecKit plan template format** (`@.specify/templates/plan-template.md`).

The mapping from the phase analysis to the SpecKit plan format is:

```markdown
# Implementation Plan: Phase <N> -- <phase_title>

**Branch**: `<NNN>-phase-<N>-<slug>` | **Date**: <today> | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/<NNN>-phase-<N>-<slug>/spec.md`

## Summary

<1-2 paragraphs: what this phase builds, which _specification/ files it draws from, key technical decisions>

## Technical Context

**Language/Version**: Java 21 (backend), TypeScript 5 (frontend)
**Primary Dependencies**: Spring Boot 3.4.3 (backend), Next.js 16 / React 19 (frontend), Tailwind CSS 4
**Storage**: In-memory ConcurrentHashMap + JSON file persistence (no database)
**Testing**: Manual verification (see spec.md Success Criteria)
**Target Platform**: Web application (localhost:8080 backend, localhost:3000 frontend)
**Project Type**: Full-stack web application (monorepo)
**Constraints**: Fully client-side rendering, Airbus corporate branding, i18n EN/FR/DE

## Project Structure

### Documentation (this phase)

```text
specs/<NNN>-phase-<N>-<slug>/
├── spec.md              # Feature specification (SpecKit format)
├── plan.md              # This file
└── tasks.md             # Generated by /speckit.tasks
```

### Source Code (repository root)

```text
sweet-backend/
├── src/main/java/com/airbus/atom/
│   ├── config/          # CORS, WebMvc
│   ├── controller/      # REST controllers
│   ├── model/           # Entities + enums
│   ├── repository/      # InMemoryRepository<T> + JSON persistence
│   └── service/         # Business logic
├── data/                # JSON seed files
└── pom.xml

sweet-frontend/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities (api.ts, auth.tsx, i18n.tsx, etc.)
│   └── types/           # TypeScript interfaces + enums
└── package.json

packages/
├── sweet-types/         # Shared types (build first)
├── sweet-gantt/         # Gantt visualization
├── sweet-releaseGrid/   # Release grid + DnD
├── sweet-calendar/      # Annual calendar
└── sweet-workload/      # Workload chart
```

**Structure Decision**: Monorepo with backend (Spring Boot), frontend (Next.js), and 5 workspace packages. Backend and frontend run independently on separate ports.
```

**Adapt the Source Code tree** to only show the folders/files relevant to this specific phase — omit packages or directories that are not touched.

**Include a section listing the files to create/modify** in this phase, grouped by layer:

```markdown
## Files to Create/Modify

### Backend
- `sweet-backend/src/.../model/EntityName.java` — <brief description>
- `sweet-backend/src/.../controller/EntityController.java` — <endpoints>
- ...

### Frontend
- `sweet-frontend/src/app/route/page.tsx` — <brief description>
- `sweet-frontend/src/components/ComponentName.tsx` — <brief description>
- ...

### Packages (if applicable)
- `packages/sweet-types/src/index.ts` — <what to add>
```

### 5.4 Clean up (generate mode only)

If `mode == generate` and `$SPECS_DIR/` already contained phase directories from a previous run:
- **Ask the user** before deleting any existing phase folders.
- Never delete non-phase directories in `$SPECS_DIR/` (other features may exist there).
- Only delete directories matching `$SPECS_DIR/*-phase-*`.

## Step 6. Final output to the user

After all files are saved, respond with a short summary:

```
Mode: generate | refresh
Specification files read: <N_total>
Phases generated: <N_phases>

SpecKit feature directories:
  - $SPECS_DIR/001-phase-1-<slug>/  (spec.md + plan.md)
  - $SPECS_DIR/002-phase-2-<slug>/  (spec.md + plan.md)
  - ...

Plan index: $PLAN_DIR/README.md

Usage — to generate tasks and implement a phase:

  # Set the phase to work on:
  export SPECIFY_FEATURE=001-phase-1-<slug>

  # Generate implementation tasks:
  /speckit.tasks

  # Execute the tasks:
  /speckit.implement

  # Or use the handoff buttons below.

Next phase after completion: set SPECIFY_FEATURE=002-phase-2-<slug> and repeat.
```

Do not repeat the full spec content in the chat output unless the user explicitly asks to see it. The main goal is to save the files and report where they live.

## Key Design Rules

1. **spec.md and plan.md must be fully self-contained.** A reader (or SpecKit) must never need to open `_specification/` files to understand what to build. All entity fields, endpoint signatures, business rules, and UI specifications must be **inlined** in the generated files.

2. **Use SpecKit's exact format.** The `spec.md` must have User Scenarios (with P1/P2 priorities), Functional Requirements (FR-XXX), Key Entities, Success Criteria, Assumptions, Edge Cases. The `plan.md` must have Summary, Technical Context, Project Structure, Files to Create/Modify. SpecKit's `/speckit.tasks` command parses these sections by name.

3. **User Stories are the primary organization unit.** SpecKit tasks generates one phase per User Story. Design stories so each one maps to a coherent, independently testable slice of work (e.g. "CRUD Products backend + frontend" is one story, not "all backend entities").

4. **Functional Requirements carry the implementation detail.** Each FR-XXX must be specific enough that an LLM can generate the code without additional context — include field names, types, HTTP verbs, paths, status codes, validation rules, error messages.

5. **Key Entities replace data-model.md.** Since we skip SpecKit's `/speckit.plan` (which would generate data-model.md), the entity definitions in spec.md must be complete: all fields, types, constraints, relationships, enums.

6. **plan.md provides the technical frame.** It tells SpecKit what language, framework, and project structure to use, and lists every file to create. This replaces the research.md + data-model.md + contracts/ that `/speckit.plan` would normally generate.

7. **Sequential numbering (001, 002, ...)** in directory names ensures SpecKit's `check-prerequisites.sh` can resolve them via `find_feature_dir_by_prefix`. The user selects a phase by setting `export SPECIFY_FEATURE=<dir-name>`.
