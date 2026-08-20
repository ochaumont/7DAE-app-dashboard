---
description: Perform a senior/staff-level review of the front-end codebase and save a structured report under _reviews/
argument-hint: (no arguments)
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal references below.

- `$REVIEW_OUTPUT_DIR` = `_reviews`

The report produced by this command is always saved under `$REVIEW_OUTPUT_DIR/` as a Markdown file named `<YYYY-MM-DD>-frontend-review.md` (use today's date). Older review files are preserved so the history of quality over time is traceable.

You are responsible for performing a **comprehensive, senior/staff-level review** of the front-end codebase of this project. Your role is strictly observational and advisory: identify issues, improvement opportunities, and optimizations, and propose concrete recommendations. **You MUST NOT refactor any code** — this command produces a written report, nothing else.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

## Motivation

- The codebase has grown rapidly with many features added incrementally — quality may have drifted.
- Identifying and fixing quality issues proactively prevents bugs, reduces maintenance cost, and improves developer experience.
- Ensures consistency across pages and components as the application scales.

## Scope

### In scope

- Pages, components, hooks, libs, types, i18n files under the front-end workspace.
- Pattern consistency across the codebase.
- Performance and maintainability concerns.
- Organization of files and directories, separation of responsibilities.

### Out of scope

- Backend Java code (a separate review would cover that).
- Adding new features or changing existing behavior.
- Automated test coverage assessment (no tests exist currently — flag this as a finding, but do not attempt to bootstrap a test suite).
- Third-party library upgrades (report outdated dependencies in the findings, but do not plan upgrades).

## Step 1. Locate the front-end sources and gather context

0. **Structural index check** (applies to sub-steps 1-2 below).

   Before enumerating the front-end sources, check whether a pre-built structural index exists:

   a. Check whether `.sweetforge/index/_meta.json` exists.
   b. **If it exists:** read `lastIndexCommit` and run `git diff --name-only <lastIndexCommit>..HEAD` scoped to the `sourceGlobs` from the `_meta.json` manifest entries for: `frontend-pages.md`, `frontend-components.md`, `frontend-hooks.md`. If no relevant files changed (fast path), read those 3 manifests from `.sweetforge/index/` to build the structural map of pages, components, and hooks — their file paths, line counts, prop APIs, consumers, and key patterns. Use this as the skeleton for Step 2 analysis categories, reading individual files only when a finding needs deeper inspection. If some files changed, read the manifests for unchanged scopes and enumerate the changed files normally.
   c. **If `_meta.json` does not exist:** fall back to full source enumeration in sub-step 1 below. After the final summary, append: *"Tip: run `/sweetforge.index` first for faster execution."*

1. Use `Glob` to locate the front-end workspace (typically `sweet-frontend/src/**/*.{ts,tsx}` plus `sweet-*/src/**/*.{ts,tsx}` for shared packages).
2. Read the project's root `package.json` and any relevant config files (`tsconfig.json`, `eslint.config.*`, `next.config.*`, `tailwind.config.*`) to understand the stack.
3. Read the top-level CLAUDE.md (if present) for project conventions and constraints.
4. Enumerate the high-level folder structure (pages, components, hooks, lib, types, i18n, etc.).

## Step 2. Run the analysis

Walk through every analysis category below and collect findings for each. For each finding, record a severity (`low` / `medium` / `critical`), a concrete example (file path + short excerpt), and an actionable recommendation.

### 2.A Architecture & code organization

- Overall project structure (folders, separation of concerns).
- Adherence to best practices (modularity, decoupling, readability).
- Consistency of design patterns used (hooks, services, providers, etc.).
- Component reusability.

### 2.B Separation of concerns

- Are components, pages, hooks, services, utilities, types, and styles properly separated?
- Identify parts that are too mixed together (e.g. a page component doing API calls inline instead of delegating to a hook or service).

### 2.C Component decomposition

- Is the UI broken down at the right level of granularity?
- Flag components that are too large, too coupled, or not reusable enough.

### 2.D Feature-based vs technical organization

- Evaluate whether a domain-based structure would serve the project better than a purely technical one (for example grouping by business domain rather than by file type).

### 2.E Code quality

- Readability (naming of variables, functions, components).
- Unnecessary complexity or over-engineering.
- Code duplication (DRY).
- Adherence to conventions (linting, formatting).
- Presence of dead or unused code.

### 2.F Comments and documentation (beginner-friendly bias)

- Evaluate whether the code includes clear comments, especially for someone new to React.
- Recommend adding: component responsibilities, prop and state descriptions, clarification of complex hooks, high-level header comments explaining the purpose of each file.
- Comments should prioritize clarity over brevity.

### 2.G Performance

- Rendering optimization (unnecessary re-renders, memoization).
- State management (local vs global).
- Bundle size, lazy loading, code splitting.
- Image and asset optimization.
- Proper use of hooks (`useEffect`, `useMemo`, `useCallback`).

### 2.H UI / UX

- Visual consistency.
- Accessibility (ARIA, keyboard navigation, contrast).
- Responsive design.
- User feedback (loading states, error states, empty states).

### 2.I Security

- Protection against XSS / injection attacks.
- Handling of sensitive data.
- Client-side input validation.
- Proper use of tokens / storage (localStorage, cookies).

### 2.J Data handling & API integration

- API call structure and error handling.
- Loading / error state handling.
- Caching and synchronization strategy.
- Separation between business logic and UI.

### 2.K Tooling & dependencies

- Relevance of the libraries used.
- Unused or outdated dependencies.
- Build setup, environment variables, configuration drift.

### 2.L State and data flow organization

- Where do state management, API calls, and business logic live?
- Suggest a better organization when the current split causes friction.

### 2.M Scalability & maintainability

- Will the current structure hold as the app grows?
- Highlight risks, bottlenecks, and technical debt.
- Propose a target structure when the current one is clearly inadequate.

## Step 3. Handle edge cases in judgment

When assessing findings, keep these caveats in mind:

- Some apparent duplication may be intentional (similar-but-subtly-different logic per page). Before flagging duplication, check whether the variants have meaningful behavioral differences.
- Performance optimizations should be weighed against readability. Not every re-render is a problem — flag only those with measurable cost or clear waste.
- Fixing one pattern inconsistency may cascade across many files. When proposing a refactor, estimate the blast radius and call it out.

## Step 4. Write the report

Save the findings to `$REVIEW_OUTPUT_DIR/<YYYY-MM-DD>-frontend-review.md` (use today's date in ISO-8601 format, e.g. `2026-04-12-frontend-review.md`). If the `$REVIEW_OUTPUT_DIR/` folder does not exist, create it.

Use this exact structure for the report:

```markdown
# Front-end code review — <project name>

> Date: <YYYY-MM-DD>
> Scope: <list of workspaces scanned>
> Files analyzed: <N>

## 0. Executive summary

<1-2 paragraphs highlighting the top findings and the single most impactful recommendation.>

## 1. Findings by category

### 1.A Architecture & code organization
- **[severity] <short title>** — <description>
  - Example: `<file:line>` — <excerpt or one-line explanation>
  - Recommendation: <concrete action>
- ...

### 1.B Separation of concerns
...

(continue for each of the 13 categories from Step 2)

## 2. Prioritized recommendations

### Critical (<N findings>)
- <title> — <1-line action>
- ...

### Medium (<N findings>)
- ...

### Low (<N findings>)
- ...

## 3. Proposed target structure (if applicable)

<ASCII tree of the recommended directory organization, with a short rationale per node.>

## 4. Final summary

<Single paragraph with the priority ordering: what to fix first, what to fix next, what to leave for later.>
```

## Step 5. Final output to the user

After saving the report, respond in the chat with this exact format:

```
Mode: front-end quality review
Report file:
  - _reviews/<YYYY-MM-DD>-frontend-review.md  [created]

Findings breakdown:
  - Critical: <N>
  - Medium: <N>
  - Low: <N>

Top 3 priorities:
  1. <critical finding 1>
  2. <critical finding 2>
  3. <critical finding 3 or highest-priority medium if fewer than 3 critical>

Notes:
  - Categories with zero findings: <list or "none">
  - Files that could not be analyzed: <list or "none">
  - Scope notes: <e.g. "backend not analyzed — out of scope">
```

Do not repeat the full report in the chat output — the Markdown file is the canonical deliverable. The chat output is just a pointer + the top-3 action items so the user knows what to do next.
