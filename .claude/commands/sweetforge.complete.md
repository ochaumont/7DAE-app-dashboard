---
description: Enrich and consolidate an existing specification file by folding in answered open questions and/or content from related spec files.
argument-hint: <path-to-spec.md> [-openQuestion] [-files <path1,path2,...>]
allowed-tools: Read, Write, Edit, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations referenced by this command. They are declared here for consistency with the rest of the `sweetforge.*` family even though the command operates on a target file whose path is passed as an argument.

- `$SPEC_FUNCTIONAL_DIR`   = `_specification/Functional Architecture`
- `$SPEC_COMPONENTS_DIR`   = `_specification/Components`
- `$SPEC_VIBE_DIR`         = `_specification/vibe coding`

The target spec file passed as the first argument is expected to live under `$SPEC_FUNCTIONAL_DIR/`, `$SPEC_COMPONENTS_DIR/`, or (rarely) `$SPEC_VIBE_DIR/`. When merging sibling specs via `-files`, the sibling paths are expected to live under the same three roots.

Whenever the instructions below mention "the spec layer" or "the target spec file" in prose, interpret it as a markdown file under one of the three paths above.

You are responsible for **enriching and consolidating an existing specification file**.
The target file already exists — your job is NOT to generate a new spec, but to **refine, fold in answers, and merge related content** so the final document is directly exploitable.

You MUST preserve the structure, headings order, and tone of the target spec. You MUST NOT duplicate information: every piece of data integrated should either replace or intelligently enrich the existing content.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Given a target specification file and one or more flags, apply the requested transformations and save the result in place. At the end, print a short summary of what was changed.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. **`target spec file`** (required, positional)
   - The first non-flag argument is the path to the spec file that will be enriched.
   - It MUST exist. If not, stop and ask the user for a valid path.
   - Resolve it relative to the current working directory if not absolute.

2. **`-openQuestion`** (flag, no value)
   - When present, process the target file's `Open Questions` section (see Step 2).

3. **`-files <list>`** (flag with value)
   - Comma-separated (or space-separated inside quotes) list of additional spec file paths.
   - Each listed file MUST exist. If any path is invalid, report the bad paths and stop.
   - When present, merge the content of these files into the target spec (see Step 3).

If neither `-openQuestion` nor `-files` is provided, stop and ask the user which mode they want.
Both flags MAY be combined in a single invocation; in that case run Step 2 first, then Step 3.

## Step 2. `-openQuestion` — fold answered open questions back into the spec

Do this only when `-openQuestion` is set.

1. **Locate the Open Questions section** in the target spec. It is typically a top-level `## Open Questions` heading (or any heading whose text matches `/open questions?/i`). Read the full section.

2. **Identify answered questions.** Each question is usually prefixed with a marker like `[NEEDS CLARIFICATION: <topic>]` followed by a prose question. A question is considered **answered** when ANY of the following is true:
   - An explicit answer is written on the same line or immediately after the question (e.g. `... ? no`, `... => yes`, `... — nearest day`).
   - A separate bullet below the question starts with `Answer:`, `Reply:`, `→`, `=>`, or similar.
   - The user has provided answers elsewhere in the conversation that explicitly map to a specific open question by topic — check the conversation history if present.

   Questions with no discernible answer MUST be left untouched (they remain open).

3. **For each answered question, fold the answer into the relevant chapters of the spec**, not just as a footnote. Choose the right destination by topic:
   - **Scope / non-scope decisions** → update `In Scope` or `Out of Scope`. When an open question resolves to "no", add `(confirmed out of scope)` and the short justification next to the corresponding bullet (or add a new bullet if none exists).
   - **New behaviors, rules, or invariants** → add a new numbered `Business Rules` entry (e.g. `BR-14`, `BR-15`…). Pick the next available number. Lead with the rule, then a short rationale derived from the answer.
   - **Planned but not-yet-implemented evolutions** → add an `In Scope` bullet with a clear `(planned evolution — see BR-NN)` marker AND a matching Business Rule flagged as `(planned)`. Do NOT pretend the feature exists today.
   - **Data structure / API changes** → update the `Data Structure of Component` or `API` sections accordingly.
   - **UX / visual behavior** → update the `UI Design` or `Features` section.
   - **Acceptance criteria implications** → add corresponding checkbox lines in `Acceptance Criteria`. Mark future-dated ones as `(Planned — BR-NN)`.

4. **Rewrite the Open Questions section** to reflect the new state:
   - Create a `### Resolved (for reference)` sub-section that lists each folded question as a one-line summary: `**<topic>** → **<answer>.** <one-line pointer to where it now lives>`.
   - Create a `### Still open` sub-section that contains only the questions that remained unanswered, reformulated if necessary to narrow their scope now that adjacent points are resolved.
   - If every question was answered, keep the `Resolved (for reference)` sub-section and mark `### Still open` as `_None._`
   - If every question was already resolved before your run, leave the section intact and report this in the summary.

5. **Consistency sweep.** After folding, re-read the spec and:
   - Remove any contradiction between the new Business Rules and existing ones (e.g. an old "not supported" bullet that is now planned).
   - Cross-reference new BRs from the Scope section with `(see BR-NN)` markers.
   - Do not leave orphan `[NEEDS CLARIFICATION: ...]` markers in chapters other than `Open Questions`.

## Step 3. `-files` — merge related spec files into the target

Do this only when `-files <list>` is set.

1. **Read each listed file in full.** Do not summarize from memory.

2. **Classify the content you find.** For each source file, sort its material into the buckets matching the target's template:
   - Summary / purpose / motivation.
   - Features (functional + business rules).
   - Scope (in / out).
   - Usage (use cases, edge cases).
   - API (props, events, types, peer deps, i18n keys).
   - UI Design (layout, navigation & action).
   - Data Structure.
   - Actions.
   - Acceptance Criteria.
   - Open Questions.

3. **Merge into the target spec, section by section.** For every source chunk:
   - **If the same information already exists** in the target, either skip it (if strictly redundant) or enrich the existing bullet/paragraph with the extra detail. Harmonize vocabulary — use the target's preferred terms (e.g., if the target says `livrable` and the source says `deliverable`, normalize to `livrable`).
   - **If the information is new**, add it under the matching chapter, keeping the bullet style and the level of detail consistent with what already exists in that chapter.
   - **If the information contradicts the target**, apply the following explicit priority order:
     1. **The target spec wins by default.** In any ambiguous case, keep the target's value and list the contradiction in the run summary (not in the spec itself) so the user can arbitrate later.
     2. **A source file overrides the target only when the user explicitly flags it as authoritative** — for example by passing `-files <newer.md>` with a commit message, a release note, or a comment in the run that marks the source as the newer / more correct version.
     3. **On silent conflict** (no explicit authority marker, no clear recency signal), keep the target value AND record both values in the run summary with a note that the user should resolve the contradiction manually. Do not invent a winner.

4. **Avoid structural drift.** The target's heading order, numbering scheme, and tone MUST NOT change. Do not introduce new top-level chapters that are absent from the template. If a source file has a chapter that the target does not, merge its bullets into the closest existing chapter instead.

5. **Cross-references.** If the merged content references another spec file (e.g. "see sweet-types.md"), keep the reference as a relative link rather than inlining the other spec's content. Inline only what is needed to make the target self-sufficient for its own scope.

6. **Open Questions merging.** When merging, concatenate the unresolved questions from the source files into the target's `Open Questions → Still open` sub-section, deduplicating by topic. If running `-openQuestion` in the same invocation, do Step 2 AFTER the merge so that any newly-merged answers are folded in as well.

## Step 4. Constraints — must hold for every run

- **Preserve structure and readability.** Headings, tables, and bullet indentation follow the target file's existing conventions.
- **No redundancy.** Every piece of integrated data replaces or enriches existing content, never duplicates it.
- **Functional and terminological coherence.** Vocabulary is harmonized to the target's preferred terms. Enum values, field names, and business-rule numbering stay consistent.
- **No "TBD" or "we'll see later".** The final document is directly exploitable. Planned features are clearly marked `(planned)` with a pointer to their BR, not left as vague intentions.
- **No silent deletions.** If you remove a bullet because it became redundant or wrong, mention it in the run summary so the user can verify.
- **Edit in place.** Save the result back to the target spec file path. Do not create a `.new` copy.
- **Do not fabricate answers.** If a question looks "probably answered" but the answer is implicit, leave it in `Still open` with a narrower wording — do not invent a resolution.

## Step 5. Final output to the user

After the file is saved, respond with a short summary in this exact format:

```
Spec file: <target-spec-path>

Open questions folded (if any):
  - <topic> → <destination chapter + BR number if applicable>
  - ...

Merged from (if any):
  - <source file 1>: <short description of what was integrated>
  - <source file 2>: ...

Still open:
  - <remaining question topic>
  - ...

Notes:
  - <contradictions resolved, bullets removed, vocabulary normalized, etc.>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The goal is to save the enriched spec file and report what actually changed.
