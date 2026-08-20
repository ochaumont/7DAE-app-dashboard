---
description: Create a lightweight "vibe coding" feature spec file from a short idea, saved under _specification/vibe coding/
argument-hint: Short feature description
allowed-tools: Read, Write, Glob, Grep
---

## Paths (single source of truth)

These variables define the canonical locations used throughout this command. If any path changes in the future, update it **here first**, then propagate it to the literal `@...` references below (which are resolved by the Claude Code harness and do NOT support variable substitution).

- `$SPEC_VIBE_DIR` = `_specification/vibe coding`
- `$TEMPLATE_FILE` = `_specs/template.md`

The output path is **always** `$SPEC_VIBE_DIR/<feature_slug>.md`. Whenever the instructions below mention the output directory in prose, interpret it as `$SPEC_VIBE_DIR`.

You are helping to spin up a new lightweight feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title in kebab-case (e.g. `new-heist-form`).
- A detailed markdown spec file saved under `$SPEC_VIBE_DIR/` (literal path: `_specification/vibe coding/`).

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`
   - A short, human readable title in Title Case.
   - Example: "Card Component for Dashboard Stats".

2. `feature_slug`
   - A kebab-case slug derived from `feature_title` (e.g. `card-component-for-dashboard-stats`). Used as the file name.

If you cannot infer a sensible `feature_title`, ask the user to clarify instead of guessing.

## Step 2. Draft the spec content

Create a markdown spec document that Plan mode can use directly. Use the exact structure as defined in the spec template file `$TEMPLATE_FILE` (literal path: `@_specs/template.md`). Do not add technical implementation details such as code examples.

Save the resulting file to `$SPEC_VIBE_DIR/<feature_slug>.md` (literal path: `_specification/vibe coding/<feature_slug>.md`). Create the `$SPEC_VIBE_DIR` folder if it does not exist.

## Step 3. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

```
Spec file: _specification/vibe coding/<feature_slug>.md
Title: <feature_title>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives.