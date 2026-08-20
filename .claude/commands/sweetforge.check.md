---
description: Audit every spec file under _specification/ for unresolved open questions and cross-file inconsistencies; read-only report, never modifies anything
argument-hint: (no arguments)
allowed-tools: Read, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`

The audit always covers **both** `$SPEC_FUNCTIONAL_DIR/` and `$SPEC_COMPONENTS_DIR/` (recursive). Whenever the instructions below mention "the spec layer" or "the specs" in prose, interpret it as "every markdown file under these two folders".

You are responsible for producing a **status report** on the health of the project's specification layer. The command is **strictly read-only**: it never creates, modifies, renames, or deletes any file. Its only output is a structured report in the chat.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

The command performs two independent audits:

1. **Open-question audit** — scan every spec file for unresolved clarifications, questions, TBDs, and similar markers, and report them file by file.
2. **Consistency audit** — compare the spec files against each other and report every factual contradiction found between two or more specs.

Both audits run regardless of how many files are present. The final report has one section per audit, plus a short header with the counts.

The command **never** modifies any file. If the user wants to act on the findings (resolve a question, reconcile a contradiction), they must edit the relevant files themselves, typically via `/sweetforge.complete` (for open questions) or `/sweetforge.spec -codeBase <feature>` (for re-deriving a spec from the code). This command only reports.

## Step 1. Validate preconditions

1. Verify that **at least one** of `$SPEC_FUNCTIONAL_DIR/` or `$SPEC_COMPONENTS_DIR/` exists and contains at least one `.md` file. If both are empty or missing, stop and tell the user: *"Both `$SPEC_FUNCTIONAL_DIR` and `$SPEC_COMPONENTS_DIR` are empty or missing. Nothing to check."*
2. List every `.md` file under both folders (recursive). Record `N_arch` (functional-architecture files), `N_comp` (component files), and `N_total = N_arch + N_comp` for the final summary.

## Step 2. Open-question audit

For every spec file collected in Step 1, read its full content and look for any of the following **unresolved markers**:

- **`[NEEDS CLARIFICATION: <question>]`** — inline marker used by the `sweetforge.*` command family. Report it as `needs-clarification`.
- **`[TBD]`, `[TODO]`, `[FIXME]`, `[WIP]`, `[PLACEHOLDER]`** — bracket tags anywhere in the text. Report them as `tbd-tag`.
- **Open Questions section** — a section whose heading matches `/open questions?/i`. Inside it, look for:
  - Lines still carrying `[NEEDS CLARIFICATION: ...]` without an inline answer on the same line (no `=>`, `→`, `Answer:`, `Reply:`, etc.).
  - A `### Still open` sub-section that is **not** `_None._` (convention used by `sweetforge.complete`).
  - Any bullet that ends with a question mark and has no answer in a **defined neighborhood**. "Nearby" means any of: (a) the same bullet after an inline marker like `=>`, `→`, `—`, `Answer:`, `Reply:`; (b) a sub-bullet directly below the question (one level of indentation deeper); (c) a paragraph or bullet within the next 3 lines in the same section. An answer that lives in a different section, or further than 3 lines away with no visual link, does NOT count — the question is still considered unresolved.
  Report these as `open-question`.
- **`[NEEDS CLARIFICATION]` without the colon-text form** — rare but worth catching; report as `needs-clarification`.
- **Planned markers that reference a BR that does not exist** — e.g. `(planned — see BR-99)` where the cited BR is not defined in the same file. Report as `planned-dangling-reference` (soft warning).

For every match, record:
- `file` — the spec file path (relative to the workspace root).
- `line` — the 1-based line number where the marker appears.
- `kind` — one of `needs-clarification | tbd-tag | open-question | planned-dangling-reference`.
- `text` — the verbatim content of the marker, trimmed to ≤ 120 characters (add `…` if longer).

Do NOT flag resolved questions. A question is considered **resolved** when:
- It carries an inline answer (after `=>`, `→`, `—`, `Answer:`, `Reply:` or equivalent).
- It lives in a `### Resolved (for reference)` sub-section of an Open Questions block.
- It has been folded back into another chapter of the same file and the Open Questions entry is gone.

Aggregate the findings per file: `{ file, total_unresolved, by_kind: { needs-clarification: N, tbd-tag: N, open-question: N, planned-dangling-reference: N } }`.

## Step 3. Consistency audit

Compare every spec file against every other spec file (and against itself for internal coherence) and detect factual contradictions. Apply the **same inconsistency catalog** used by `/sweetforge.spec` in its Step 2.A-4:

- **Behavioral contradictions** — spec A describes behavior X for a feature, spec B describes incompatible behavior Y for the same feature.
- **Structural contradictions** — same entity / field / prop / event / endpoint declared with different names, types, cardinalities, or required/optional flags across two specs. Pay special attention to data-model entities (Produit, Release, Livrable, Projet, Ressource, Affectation, PeriodeConges, etc.) and their field definitions.
- **Scope contradictions** — one spec marks a capability as in-scope, another marks it as out-of-scope / deferred / not implemented for the same feature.
- **Business-rule contradictions** — the same RG-XX rule paraphrased differently in two files, or a rule referenced in one spec that is explicitly marked out-of-scope in another.
- **Naming / terminology drift** — the same concept referred to by different names across specs (e.g. `livrable` vs `deliverable`, `Produit` vs `Product`, `Affectation` vs `Assignment`, `progression` vs `progress`, `pourcentage` vs `percentage`). Report as `warning` (not blocker) unless the drift creates an actual ambiguity.
- **Existence contradictions** — spec A references a field, endpoint, or enum value that spec B clearly denies (not just omits — see the rule below).
- **Cross-reference breakage** — spec A references spec B (e.g. "see sweet-calendar.md") or a specific BR-XX / UC-XX / RG-XX, and the target does not exist or has been renumbered.
- **Dangling type references** — spec A imports a type from `sweet-types` or similar, and the referenced type is not declared in any spec.
- **Business-rule numbering collisions** — two specs both define a `BR-07` with different content inside the same functional area.

**Matching rules:**
- Semantic matching, not lexical. Same concept with different wording = same concept.
- **Omission is not a contradiction.** If spec A describes a field and spec B simply does not mention it, that is an omission — do NOT flag it. Only flag when spec B makes a contradicting claim about it (e.g. `pourcentage: int` vs `pourcentage: BigDecimal`).
- When the same rule is mentioned in 3+ files, all 3 must agree. If 2 agree and 1 disagrees, flag the odd one out with the 2-vs-1 context.

For every inconsistency, record:
- `concern` — the field, behavior, or rule under contention, in one short phrase.
- `source_a` — file path and (if possible) line range.
- `source_b` — file path and line range.
- `value_a` — what source A says (verbatim or short paraphrase).
- `value_b` — what source B says.
- `severity`:
  - `blocker` — two specs describe incompatible versions of the **same** data structure or API contract; downstream code cannot honor both.
  - `warning` — naming drift, cross-reference breakage, soft disagreement that does not break the implementation.

Group inconsistencies by `concern` so the user sees each contradiction once, even if three files are involved.

## Step 4. Final output to the user

After both audits are done, respond with a structured report in this exact format:

```
Spec check — status report

Spec files scanned: <N_total>  (functional architecture: <N_arch>, components: <N_comp>)

================================================================
Open questions — <N_files_with_questions> file(s) contain unresolved items
================================================================
  <path/to/spec_1.md>  — <total> unresolved
    - [line <L>] [needs-clarification] "<text>"
    - [line <L>] [tbd-tag]              "<text>"
    - [line <L>] [open-question]        "<text>"
    - ...
  <path/to/spec_2.md>  — <total> unresolved
    - [line <L>] [needs-clarification] "<text>"
    - ...
  ...

(If zero files contain unresolved items, write instead:
 "_No unresolved open questions found across the spec layer._")

================================================================
Inconsistencies — <N_blockers> blocker(s), <N_warnings> warning(s)
================================================================
  <concern_1>   [BLOCKER]
    - <source_a_path>:<line>  says "<value_a>"
    - <source_b_path>:<line>  says "<value_b>"
    - (and optionally: "<source_c_path>:<line> says ..." if 3+ files are involved)

  <concern_2>   [WARN]
    - <source_a_path>:<line>  says "<value_a>"
    - <source_b_path>:<line>  says "<value_b>"

  ...

(If zero inconsistencies are found, write instead:
 "_No cross-file inconsistencies detected across the spec layer._")

================================================================
Suggested next steps
================================================================
  - Resolve open questions: /sweetforge.complete -openQuestion @<spec_file>
  - Reconcile inconsistencies: re-run /sweetforge.spec -codeBase <feature> to re-derive the contradicted chapter from the code, or edit the losing file manually.
  - (Only include items that are actually actionable given the findings — drop the bullet if no open question / inconsistency was found.)
```

Do not repeat the full content of any spec file. The output is a report — it points to problems, it does not display the entire spec layer. Keep verbatim quotes short (≤ 120 characters each).

**Never write to, rename, or delete any file.** This command is an observer; the user reads the report and decides what to act on next.
