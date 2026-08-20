---
name: generate-component
description: Generate a new frontend component following ATOM architecture patterns. Use when creating list pages, detail pages, tabs, hooks, or reusable UI components.
argument-hint: "[type: list-page|detail-page|tab|hook|ui-component] [entity-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx tsc:*)
---

You are generating a new frontend component for the ATOM project. Follow every rule below strictly. For full code templates, see [templates.md](templates.md).

## Step 1 — Determine Component Type

Parse `$ARGUMENTS` to identify the **type** and **entity name**:

| Argument | Component Type | File Location |
|----------|---------------|---------------|
| `list-page {Entity}` | List page with DataTable + CRUD | `src/app/{entity}/page.tsx` |
| `detail-page {Entity}` | Detail page with tabs | `src/app/{entity}/[id]/page.tsx` |
| `tab {TabName}` | Tab component for a detail page | `src/app/{entity}/[id]/tabs/{TabName}Tab.tsx` |
| `hook {hookName}` | Custom React hook | `src/hooks/use{HookName}.ts` |
| `ui-component {Name}` | Reusable UI component | `src/components/ui/{Name}.tsx` |
| `form-modal {Entity}` | CRUD form modal | `src/app/{entity}/components/{Entity}FormModal.tsx` |

If the type is unclear, ask the user before proceeding.

## Step 2 — Read Existing Code

Before writing anything:
1. Read `frontend/src/types/index.ts` to find the entity's TypeScript interface
2. Read `frontend/src/lib/api.ts` to find existing API functions for the entity
3. Read `frontend/src/lib/constants.ts` for existing color maps and constants
4. Read existing similar components (e.g., if creating a list page, read `src/app/projets/page.tsx` as reference)
5. Check `frontend/src/i18n/locales/en/` for existing translation namespaces

## Step 3 — Mandatory Architecture Rules

### Imports (strict order)
```
"use client";
1. React & framework (useState, useEffect, useTranslation, useRouter, lucide icons)
2. Layout & UI components (@/components/layout/*, @/components/ui/*)
3. Custom hooks (@/hooks/*)
4. Types (import type { ... } from "@/types")
5. API & utilities (import * as api, constants, exportToExcel)
```

### Path Aliases
- **ALWAYS** use `@/` alias — NEVER relative paths like `../../../`
- **ALWAYS** `import * as api from "@/lib/api"` — never destructure api
- **ALWAYS** `import type` for type-only imports

### Hooks to Use (MANDATORY)
| Need | Hook | Import |
|------|------|--------|
| Create/Edit modal | `useCrudModal<T, F>` | `@/hooks/useCrudModal` |
| Delete confirmation | `useDeleteConfirm<T>` | `@/hooks/useDeleteConfirm` |
| Table settings (columns, pagination) | `useTableSettings` | `@/hooks/useTableSettings` |
| Form validation | `useFormValidation` | `@/hooks/useFormValidation` |
| Team member CRUD | `useTeamCRUD` | `@/hooks/useTeamCRUD` |

Do NOT reimplement modal state, delete confirmation, or table settings manually — always use the hooks above.

### Data Fetching
- **List pages**: `Promise.all([...])` for parallel independent calls
- **Detail pages**: `Promise.allSettled([...])` — primary data must succeed, secondary falls back to `[]`
- **Refetch without remount**: Use `initialLoadDone` ref to skip `setLoading(true)` after first load
- **Tabs**: Call `onRefresh()` after mutations — never fetch data internally

### Error Handling
- Global Axios interceptor in `api.ts` shows toast on all errors
- **Empty catch blocks are correct** for standard mutations
- Only add local catch for specific cases (409 conflict, custom form error)
- NEVER add toast/notification logic in catch blocks

### i18n
- Use `useTranslation(["{entity}", "common", "enums"])`
- Enum values: `t(\`EnumName.${value}\`, { ns: "enums" })`
- Shared labels (Save, Cancel, Delete): `t("key", { ns: "common" })`
- Create translation files in `src/i18n/locales/{en,fr,de}/{entity}.json` if namespace doesn't exist

### Column Definitions
- Wrap in `useMemo` with `[t]` dependency
- Status columns: use `<Badge color={COLOR_MAP[item.statut]}>` with colors from `constants.ts`
- Action columns: `key: "actions"`, always `e.stopPropagation()` on buttons
- Pin `"nom"` and `"actions"` columns (always visible, not toggleable)

### TypeScript
- Union types, never enums: `type Statut = "A" | "B"`
- Entity-to-form mapper: null/undefined fields become `""` for form inputs
- Typed API functions: `api.get<Entity>(\`/path\`)`

## Step 3b — File Size Limits

Each component type has a **target size range** and a **hard maximum**. These are based on the actual codebase distribution.

| Component Type | Target Range | Hard Max | If Exceeded |
|----------------|-------------|----------|-------------|
| **List page** (`page.tsx`) | 300–400 lines | 450 lines | Extract form into `components/{Entity}FormModal.tsx` |
| **Detail page** (`[id]/page.tsx`) | 250–450 lines | 500 lines | Move tab-specific logic into tab components |
| **Tab component** | 200–400 lines | 500 lines | Split into sub-sections (see below) |
| **Form modal** | 150–270 lines | 350 lines | Split multi-step forms into step components |
| **Reusable UI component** | 50–300 lines | 350 lines | Extract sub-components into `ComponentName/` folder |
| **Custom hook** | 60–160 lines | 200 lines | Split into composed hooks |
| **Utility / lib** | 50–200 lines | 250 lines | Group related functions, split unrelated ones |

### Splitting Strategy When Approaching Limits

**List page > 450 lines** — Extract the CRUD form into a dedicated `FormModal` component:
```
src/app/{entity}/
  page.tsx                          — Table + toolbar + delete modal (≤400 lines)
  components/{Entity}FormModal.tsx  — Create/edit form modal (150–270 lines)
```

**Tab > 500 lines** — Split into sub-sections (like LivrablesTab → OwnedLivrablesSection + AssociatedLivrablesSection):
```
src/app/{entity}/[id]/tabs/
  {TabName}Tab.tsx                  — Orchestrator with shared state (≤250 lines)
  {TabName}Section.tsx              — Self-contained sub-section (200–400 lines)
```

**UI component > 350 lines** — Use folder pattern (like ReleaseGantt/):
```
src/components/ui/{ComponentName}/
  index.tsx           — Main component (orchestration)
  SubPart.tsx         — Extracted visual sub-part
  types.ts            — Shared types (optional)
```

### Key Principle
> A file should do **one thing well**. If you need to scroll more than 2 screens to understand what a file does, it's too long. Split by **responsibility**, not by arbitrary line count.

## Step 4 — Anti-Patterns (NEVER DO)

- Define color maps locally — import from `src/lib/constants.ts`
- Hardcode enum labels — use `t(\`EnumName.${value}\`, { ns: "enums" })`
- Use relative imports — use `@/` alias
- Call `setLoading(true)` on every refetch — use `initialLoadDone` ref
- Put entity-specific API logic in hooks — pass callbacks (dependency injection)
- Forget `e.stopPropagation()` in action buttons
- Add toast/notification in catch blocks — interceptor handles it
- Create TypeScript enums — use union types
- Fetch livrable by ID alone — use `fetchAllLivrablesWithContext()` from `src/lib/livrables.ts`

## Step 5 — Generate Code

Use the template from [templates.md](templates.md) matching the component type. Adapt it to the specific entity name, fields, and API endpoints.

## Step 6 — Apply Documentation Conventions

After generating the code, apply the `/component-conventions` skill rules:
1. Add the file header block comment with full structure breakdown
2. Add section separators inside the component function
3. Add JSDoc on all interface properties
4. Add inline comments on non-obvious hooks and business rules

## Step 7 — Post-Generation Checklist

After writing the component:

1. **Types**: Verify the entity interface exists in `src/types/index.ts` — create it if missing
2. **API functions**: Verify CRUD endpoints exist in `src/lib/api.ts` — add them if missing
3. **Translations**: Create/update translation files in `src/i18n/locales/{en,fr,de}/`
4. **Constants**: Add any new color maps to `src/lib/constants.ts`
5. **Navigation**: Add route to Navbar if it's a new top-level page
6. **TypeScript check**: Run `npx tsc --noEmit` to verify no errors
7. **Report**: List all files created/modified
