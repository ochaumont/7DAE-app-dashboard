---
description: Apply component structuring and documentation conventions when creating or refactoring React components
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx tsc:*)
---

When creating new components or refactoring existing ones, **strictly follow** all the conventions below. These rules ensure consistency, readability, and maintainability for developers of all experience levels.

---

## 1. File Header — Mandatory Detailed Description

Every `.tsx` / `.ts` file MUST start with a block comment describing:

```
/***********************************************************
 * ComponentName — One-line purpose summary.
 *
 * [Optional: visual layout diagram using ASCII art]
 *
 * File structure:
 *
 *   1. IMPORTS — what is imported and why
 *   2. INTERFACE / TYPES — each prop documented with JSDoc
 *   3. CONSTANTS (if any) — what they control
 *   4. COMPONENT FUNCTION — broken down by section:
 *      a. State & hooks — what each piece of state manages
 *      b. Effects — what triggers them, what they do
 *      c. Handlers / actions — what user action triggers each
 *      d. Derived data (useMemo) — what is computed and why
 *      e. Helper functions — their role
 *      f. JSX return — describe each visual section
 *
 * Used on: [which pages or parent components use this]
 ***********************************************************/
```

The description must be **detailed enough** that a junior developer understands every section's purpose **without reading the code itself**.

---

## 2. Section Separators

Inside component functions, use section separators to delimit logical blocks:
le fodler _specs contient les specifications qui ont permis de construire l'applications. Je souhaiterais reconstruire
```tsx
/***********************************************************
 * State — CRUD modal (create / edit product)
 ***********************************************************/

/***********************************************************
 * Actions — Import from referential
 ***********************************************************/

/***********************************************************
 * Computed — Filtered data & Excel export
 ***********************************************************/

/***********************************************************
 * Render — Page header + Products table
 ***********************************************************/
```

For JSX sections inside the return, use JSX comment separators:

```tsx
{/***********************************************************
 * Render — Create / Edit product modal
 ***********************************************************/}
```

---

## 3. Interface Documentation

Every interface property MUST have a JSDoc comment:

```tsx
interface MyComponentProps {
  /** Whether the modal is visible */
  open: boolean;
  /** The product being edited (null = create mode) */
  editItem: Produit | null;
  /** Callback invoked after successful validation */
  onSubmit: () => void;
}
```

When a file exports multiple interfaces, add a one-line JSDoc above each explaining its role:

```tsx
/** Data structure for the form fields — exported for reuse in parent page */
export interface ProductForm { ... }

/** Component props — contract between this modal and its parent */
interface ProductFormModalProps { ... }
```

---

## 4. Inline Comments on Non-Obvious Code

Add comments on:
- **React hooks** (`useCallback`, `useMemo`, `useEffect`) — explain WHY they are used, not just WHAT they do
- **Business rules** — reference the rule code (e.g., "RG-04: late detection")
- **Complex expressions** — ternaries, filter/map chains, CSS tricks
- **Magic numbers** — extract as named constants or explain inline

```tsx
/** useCallback memoizes this handler to prevent re-renders of child components */
const handleClick = useCallback(() => { ... }, [dep]);

// 12px offset so the tooltip doesn't overlap the cursor
const CURSOR_OFFSET = 12;
```

---

## 5. Component Decomposition Rules

### When to extract a sub-component:
- A JSX block is **>50 lines** and has a clear single responsibility
- A piece of UI is **reused** in multiple places
- A section has **its own state** (modals, popovers, expandable sections)

### When to extract a custom hook:
- A group of `useState` + `useCallback` / `useEffect` are **tightly coupled** (e.g., tooltip state + handlers)
- The same stateful logic is **reused** across components
- Extracting it makes the parent **easier to read** (reduces noise)

### When NOT to extract:
- The code is **<30 lines** and tightly coupled to the parent's state
- Extracting would require **passing >8 props** with no readability gain
- The code is **only used once** and the parent file is already short (<200 lines)

### File organization for complex components:
```
ComponentName/
  index.tsx              — Main component (orchestration + layout)
  types.ts               — Shared types and interfaces
  SubComponentA.tsx      — Extracted sub-component
  SubComponentB.tsx      — Extracted sub-component
  useCustomHook.ts       — Extracted custom hook
```

---

## 6. Centralized Constants

- **Color maps** (status→Badge color, status→hex) → `src/lib/constants.ts`
- **Never define color maps locally** in a component — always import from constants
- When adding a new enum-to-color mapping, add it to `constants.ts`

---

## 7. Props Pattern — State Lifting

Components should be **presentational** whenever possible:
- All state is lifted to the parent via props
- The component receives data + callbacks, renders UI
- Document this in the file header: "Pure presentational — no local state"

Exception: components that manage their **own internal UI state** (e.g., click-outside, dropdown open/close) — document what state is local vs lifted.

---

## 8. Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Component files | PascalCase | `ProductFormModal.tsx` |
| Hook files | camelCase with `use` prefix | `useTooltip.ts` |
| Type files | camelCase | `types.ts` |
| Constants | UPPER_SNAKE_CASE | `PRODUIT_TYPE_COLORS` |
| Props interfaces | `{ComponentName}Props` | `LeftPanelProps` |
| Exported form types | `{Entity}Form` | `ProductForm` |

---

## Execution

When the user asks to create or refactor a component:

1. **Read** the existing code (if refactoring)
2. **Apply** all conventions above
3. **Add** the file header description with full structure breakdown
4. **Add** section separators inside the component function
5. **Document** all interfaces with JSDoc
6. **Extract** sub-components and hooks following the decomposition rules
7. **Run** `npx tsc --noEmit` to verify no TypeScript errors
8. **Report** what was created/changed
