---
description: Generate or refresh the codebase structural index (.sweetforge/index/) so other SweetForge commands can read compact manifests instead of parsing raw source code
argument-hint: [--full]
allowed-tools: Read, Write, Glob, Grep, Bash, Agent
---

## Paths (single source of truth)

- `$INDEX_DIR`              = `.sweetforge/index`
- `$META_FILE`              = `$INDEX_DIR/_meta.json`
- `$SPEC_FUNCTIONAL_DIR`    = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`    = `_specification/Components`

### Source directories (scanned during indexing)

- `$BACKEND_SRC`            = `sweet-backend/src/main/java`
- `$FRONTEND_SRC`           = `sweet-frontend/src`
- `$PKG_GANTT`              = `sweet-gantt/src`
- `$PKG_RELEASE_GRID`       = `sweet-releaseGrid/src`
- `$PKG_TYPES`              = `sweet-types/src`
- `$PKG_CALENDAR`           = `sweet-calendar/src`
- `$PKG_WORKLOAD`           = `sweet-workload/src`
- `$PKG_WORKLOAD_ENGINE`    = `sweet-workloadEngine/src`

### Manifest files (outputs)

| Manifest file | What it captures | Primary consumers |
|---|---|---|
| `backend-entities.md` | Java model classes, fields, types, annotations, enums | `datamodel`, `overview`, `feature` |
| `backend-api.md` | Controllers: routes, HTTP methods, params, response types; service method signatures | `overview`, `feature`, `component` |
| `frontend-pages.md` | Pages, tabs, data fetching patterns, navigation, route structure | `overview`, `feature`, `code.quality` |
| `frontend-components.md` | Reusable components (components/ui/, components/layout/), props API, usage contexts | `component`, `feature`, `code.quality` |
| `frontend-hooks.md` | Custom hooks, API surface, state shape, consumers | `component`, `feature`, `code.quality` |
| `frontend-lib.md` | api.ts endpoint catalog, constants, utility functions, type declarations | `overview`, `feature`, `datamodel` |
| `packages.md` | sweet-* package exports, internal structure, dependencies, props API | `component`, `overview`, `feature` |

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## Purpose

This command generates a **structural index** of the codebase — a set of compact manifest files that capture the essential architecture (entities, routes, pages, components, hooks, types) in a format that is **~15x smaller** than the raw source code.

Other SweetForge commands that accept the `-codebase` flag (`overview`, `feature`, `component`, `datamodel`, `code.quality`) can then read the manifests instead of parsing the full source, dramatically reducing token consumption and execution time.

The index is **not a spec** — it is a machine-readable structural snapshot. It does not belong in `_specification/` and is never shown to end users. It lives under `.sweetforge/index/` and is typically `.gitignore`d (or committed as a dev convenience — user's choice).

## High level behavior

1. Parse arguments to determine the mode (incremental or full).
2. If incremental, compute the delta since the last indexed commit.
3. Delegate code parsing to parallel sub-agents (one per manifest scope).
4. Each agent reads the raw source, extracts structural information, and returns a structured report.
5. The main conversation writes the manifest files from the agent reports.
6. Update `_meta.json` with the current commit hash and timestamp.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`mode`** — one of `incremental` or `full`.
   - If `$ARGUMENTS` contains `--full` (case-insensitive), set `mode = full`.
   - Otherwise, set `mode = incremental` (default).
   - If the user passes any unknown flag, stop and ask the user to clarify.

## Step 2. Evaluate freshness

1. Check whether `$META_FILE` exists. If it does not, force `mode = full` regardless of the argument (there is nothing to increment from).

2. If `mode == incremental`, read `$META_FILE` and extract `lastIndexCommit`.
   - Run `git diff --name-only <lastIndexCommit>..HEAD` to get the list of changed files since the last index.
   - Classify each changed file into the manifest scope it belongs to (using the source directory mappings above).
   - Build a set of **affected manifests** — only these will be regenerated.
   - If **no source file changed** since the last index, report *"Index is up to date (last indexed at commit `<hash>` on `<date>`). Nothing to do."* and stop.
   - If the `lastIndexCommit` hash is no longer reachable (e.g. after a force-push or rebase), warn the user and fall back to `mode = full`.

3. If `mode == full`, all manifests will be regenerated.

4. Present the plan to the user:

   ```
   Index mode: <incremental | full>
   Last indexed commit: <hash> (<date>) | none (first run)
   Current HEAD: <hash>

   Files changed since last index: <N> (or "N/A — full rebuild")
   Manifests to regenerate:
     - backend-entities.md    <regenerate | up to date>
     - backend-api.md         <regenerate | up to date>
     - frontend-pages.md      <regenerate | up to date>
     - frontend-components.md <regenerate | up to date>
     - frontend-hooks.md      <regenerate | up to date>
     - frontend-lib.md        <regenerate | up to date>
     - packages.md            <regenerate | up to date>

   Proceed? (yes / abort)
   ```

   **STOP and wait for user confirmation.** If `abort`, stop without writing anything.

## Step 3. Delegate parsing to sub-agents

For each manifest marked `regenerate`, launch an `Explore` sub-agent with `subagent_type: "Explore"`. Each agent receives a self-contained prompt specifying:

1. The **exact source files** it must read (glob patterns for its scope).
2. The **extraction rules** defining what to capture (see per-manifest specifications below).
3. A **strict instruction** that the agent is **read-only**: it MUST NOT create, modify, or delete any file. Only `Read`, `Glob`, `Grep`.
4. The **output format** it must return (see per-manifest schemas below).

**Parallelization strategy**: launch all agents for the affected manifests in parallel (maximum 7 agents, one per manifest). This is well within the 10-agent cap.

For `mode == incremental`, each agent receives **only the changed files** in its scope, plus a copy of the **existing manifest** so it can perform a surgical update rather than a full rewrite. The agent's output is a **patch** (sections to add, update, or remove) rather than a complete manifest.

### Fallback

If the Agent tool is denied or fails, fall back to inline reading in the main context. Process manifests one at a time (not in parallel) to avoid context overflow. Report the fallback in the final summary.

## Step 4. Per-manifest extraction rules

### 4.1 `backend-entities.md`

**Source scope**: `$BACKEND_SRC/**/model/**/*.java`, `$BACKEND_SRC/**/model/enums/**/*.java`

**Agent prompt instructions**: For every Java class in the model package:

Extract and report in this format:

```markdown
## <EntityName>

- **Extends**: <parent class or "none">
- **Annotations**: <@Data, @SuperBuilder, etc.>
- **File**: <relative path>

### Fields

| Field | Type | Annotations | Notes |
|-------|------|-------------|-------|
| <name> | <type> | <@NotNull, etc.> | <default value, validation> |

### Enums (if applicable)

| Value | Description |
|-------|-------------|
| <VALUE_1> | <from context or javadoc> |
```

For enum classes, capture the enum name, every value, and any fields on the enum constants.

### 4.2 `backend-api.md`

**Source scope**: `$BACKEND_SRC/**/controller/**/*.java`, `$BACKEND_SRC/**/service/**/*.java`, `$BACKEND_SRC/**/repository/**/*.java`

**Agent prompt instructions**: For every controller class:

```markdown
## <ControllerName>

- **Base path**: <@RequestMapping value>
- **File**: <relative path>

### Endpoints

| Method | Path | Params | Request body | Response | Status | Notes |
|--------|------|--------|-------------|----------|--------|-------|
| GET | /api/... | <@PathVariable, @RequestParam> | — | <type> | 200 | |
| POST | /api/... | | <type> | <type> | 201 | |

### Service methods (from <ServiceName>)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| <name> | <types> | <type> | <business logic summary> |
```

For repositories, capture only custom query methods (not inherited CRUD).

### 4.3 `frontend-pages.md`

**Source scope**: `$FRONTEND_SRC/app/**/*.tsx`, `$FRONTEND_SRC/app/**/*.ts`

**Agent prompt instructions**: For every page and tab component:

```markdown
## <PagePath> (`/produits`, `/projets/[id]`, etc.)

- **File**: <relative path>
- **Lines**: <line count>
- **Role access**: <PO, CP, Manager, or all>

### Data fetching

| API call | Purpose | Fetch strategy |
|----------|---------|---------------|
| api.getProduits() | Load products | useEffect on mount |

### Tabs (if detail page)

| Tab name | Component | File |
|----------|-----------|------|
| Synthese | SyntheseTab | tabs/SyntheseTab.tsx |

### State

| State | Type | Purpose |
|-------|------|---------|
| produits | Produit[] | Main data list |

### Key patterns

- <initialLoadDone ref, Promise.allSettled, etc.>
```

### 4.4 `frontend-components.md`

**Source scope**: `$FRONTEND_SRC/components/**/*.tsx`, `$FRONTEND_SRC/components/**/*.ts`

**Agent prompt instructions**: For every component:

```markdown
## <ComponentName>

- **File**: <relative path>
- **Lines**: <line count>
- **Category**: <ui | layout | domain>

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| <name> | <type> | <yes/no> | <purpose> |

### Consumers

- <file that imports this component> — <usage context>

### Key behavior

- <notable interactions, conditional rendering, accessibility>
```

### 4.5 `frontend-hooks.md`

**Source scope**: `$FRONTEND_SRC/hooks/**/*.ts`

**Agent prompt instructions**: For every custom hook:

```markdown
## <hookName>

- **File**: <relative path>
- **Generic params**: <T, F, etc. if applicable>

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| <name> | <type> | <purpose> |

### Returned API

| Property/Method | Type | Description |
|----------------|------|-------------|
| <name> | <type> | <purpose> |

### Internal state

| State | Type | Purpose |
|-------|------|---------|
| <name> | <type> | <role> |

### Consumers

- <file> — <usage context>
```

### 4.6 `frontend-lib.md`

**Source scope**: `$FRONTEND_SRC/lib/**/*.ts`, `$FRONTEND_SRC/types/**/*.ts`, `$FRONTEND_SRC/i18n/**/*.ts`

**Agent prompt instructions**:

For `api.ts` — list every exported function:

```markdown
## API Client (`lib/api.ts`)

| Function | Method | Endpoint | Params | Returns |
|----------|--------|----------|--------|---------|
| getProduits | GET | /api/produits | — | Produit[] |
```

For `constants.ts` — list every exported constant/map:

```markdown
## Constants (`lib/constants.ts`)

| Export | Type | Purpose |
|--------|------|---------|
| STATUT_COLORS | Record<string, string> | Status-to-color mapping |
```

For `types/index.ts` — list every interface and type:

```markdown
## Types (`types/index.ts`)

### <InterfaceName>

| Field | Type | Optional | Notes |
|-------|------|----------|-------|
| <name> | <type> | <yes/no> | |
```

For utility files (`capacity.ts`, `alerts.ts`, `exportExcel.ts`, `auth.tsx`) — list exports with one-line descriptions.

For i18n — list namespaces and language support only (not every key).

### 4.7 `packages.md`

**Source scope**: `$PKG_GANTT/**/*.{ts,tsx}`, `$PKG_RELEASE_GRID/**/*.{ts,tsx}`, `$PKG_TYPES/**/*.ts`, `$PKG_CALENDAR/**/*.{ts,tsx}`, `$PKG_WORKLOAD/**/*.{ts,tsx}`, `$PKG_WORKLOAD_ENGINE/**/*.{ts,tsx}`

**Agent prompt instructions**: For each sweet-* package:

```markdown
## <package-name>

- **Path**: <relative path>
- **Files**: <count>
- **Lines**: <total line count>
- **Dependencies**: <peer deps from package.json>
- **Build**: <tsup | tsc | none>

### Exported API

| Export | Type | Description |
|--------|------|-------------|
| <ComponentName> | React.FC | <one-line purpose> |
| <hookName> | function | <one-line purpose> |
| <TypeName> | type/interface | <one-line purpose> |

### Internal structure

| File | Role |
|------|------|
| src/index.tsx | Entry point / barrel |
| src/components/X.tsx | <purpose> |

### Props (for main exported components)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| <name> | <type> | <yes/no> | <purpose> |
```

## Step 5. Write manifests

After all agents return, for each affected manifest:

1. **Full mode**: write the agent's complete output as the manifest file.
2. **Incremental mode**: merge the agent's patch into the existing manifest — add new sections, update modified sections, remove sections for deleted files.

Each manifest file starts with a header:

```markdown
<!-- Auto-generated by /sweetforge.index — do not edit manually -->
<!-- Last indexed: <ISO timestamp> | Commit: <short hash> | Mode: <full|incremental> -->
```

Write all manifests to `$INDEX_DIR/`.

## Step 6. Update meta

Write `$META_FILE` with:

```json
{
  "lastIndexCommit": "<full commit hash>",
  "lastIndexDate": "<ISO 8601 timestamp>",
  "mode": "<full | incremental>",
  "manifests": {
    "backend-entities.md": {
      "sourceGlobs": ["sweet-backend/src/main/java/**/model/**/*.java"],
      "entityCount": <N>,
      "lineCount": <N>
    },
    "backend-api.md": {
      "sourceGlobs": ["sweet-backend/src/main/java/**/controller/**/*.java", "..."],
      "endpointCount": <N>,
      "lineCount": <N>
    },
    "frontend-pages.md": {
      "sourceGlobs": ["sweet-frontend/src/app/**/*.tsx"],
      "pageCount": <N>,
      "lineCount": <N>
    },
    "frontend-components.md": {
      "sourceGlobs": ["sweet-frontend/src/components/**/*.tsx"],
      "componentCount": <N>,
      "lineCount": <N>
    },
    "frontend-hooks.md": {
      "sourceGlobs": ["sweet-frontend/src/hooks/**/*.ts"],
      "hookCount": <N>,
      "lineCount": <N>
    },
    "frontend-lib.md": {
      "sourceGlobs": ["sweet-frontend/src/lib/**/*.ts", "sweet-frontend/src/types/**/*.ts"],
      "exportCount": <N>,
      "lineCount": <N>
    },
    "packages.md": {
      "sourceGlobs": ["sweet-gantt/src/**", "sweet-releaseGrid/src/**", "..."],
      "packageCount": <N>,
      "lineCount": <N>
    }
  },
  "stats": {
    "sourceFilesScanned": <N>,
    "sourceLinesScanned": <N>,
    "manifestLinesWritten": <N>,
    "compressionRatio": "<X>:1"
  }
}
```

## Step 7. Final output

```
Index complete — .sweetforge/index/

Mode: <full | incremental>
Previous commit: <hash | none>
Current commit: <hash>

Manifests written:
  - backend-entities.md     <N> entities, <N> enums     (<N> lines)
  - backend-api.md          <N> endpoints               (<N> lines)
  - frontend-pages.md       <N> pages, <N> tabs         (<N> lines)
  - frontend-components.md  <N> components               (<N> lines)
  - frontend-hooks.md       <N> hooks                    (<N> lines)
  - frontend-lib.md         <N> API functions, <N> types (<N> lines)
  - packages.md             <N> packages                 (<N> lines)

Stats:
  - Source files scanned: <N>
  - Source lines scanned: <N>
  - Manifest lines written: <N>
  - Compression ratio: <X>:1

Notes:
  - <any warnings, fallbacks, missing directories, etc.>
```

## How other commands consume the index

This section documents the contract between `/sweetforge.index` and the other SweetForge commands. It is informational — the consuming commands are responsible for implementing their side of the contract.

### Consumption protocol

Every SweetForge command that supports `-codebase` mode SHOULD, before parsing raw source code:

1. Check whether `$INDEX_DIR/_meta.json` exists.
2. If it exists, read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD -- <relevant source globs>`.
3. **If no relevant files changed**: read the manifest(s) instead of the raw source. This is the fast path.
4. **If some files changed**: either (a) run `/sweetforge.index` first to refresh (suggest it to the user), or (b) read the manifests for unchanged scopes and parse only the changed files directly. Choice is up to the consuming command.
5. **If `_meta.json` does not exist**: fall back to parsing raw source (current behavior). Suggest to the user: *"Run `/sweetforge.index` first for faster execution."*

### Per-command manifest usage

| Command | Manifests it reads | What it still reads raw |
|---|---|---|
| `overview -codebase` | All 7 manifests | Nothing (manifests are sufficient) |
| `feature -codebase` | All 7 manifests (filtered to the feature's scope) | Specific files for deep-dive if needed |
| `feature -codebase -all` | All 7 manifests | Nothing |
| `component -codebase` | `packages.md`, `frontend-components.md`, `frontend-hooks.md` | The specific component's source for prop-level detail |
| `datamodel -codebase` | `backend-entities.md`, `frontend-lib.md` (types section) | Nothing |
| `code.quality` | `frontend-pages.md`, `frontend-components.md`, `frontend-hooks.md` | Flagged files for detailed review |

### Graceful degradation

The index is an **optimization, not a requirement**. Every command MUST continue to work without the index (by parsing raw source as before). The index simply makes them faster and cheaper.
