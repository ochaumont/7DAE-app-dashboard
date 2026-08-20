---
description: Create a commit message by analyzing git diffs, propose it to the user, and commit only on approval
argument-hint: (no arguments)
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git commit:*)
---

You are helping the user craft a high-quality commit message for the changes currently staged in git. You must **never auto-commit**: your role is to inspect the staged changes, draft a clear conventional commit message that explains *why* the change was made (not just what), and wait for the user's explicit approval before running `git commit`.

Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

## Context

- Current git status: !`git status`
- Current git diff: !`git diff --staged`

## Step 1. Analyse the staged changes

Read the staged diff and the git status above. Build a mental model of:

- Which files were touched and why.
- What category the change belongs to (new feature, bug fix, refactor, docs, styling, tests, performance).
- Whether the change has a single coherent intent, or spans multiple unrelated concerns (in which case you should flag it to the user — a commit should not mix concerns).
- The *why*: what problem does this change solve, or what capability does it add? The user can read the diff to see *what* changed; the commit message should capture the *why* that is not visible in the code.

Use the present tense throughout the message ("add", "fix", "refactor" — not "added", "fixed", "refactored").

## Step 2. Pick the commit type

Choose exactly one of the following conventional types, each paired with its emoji:

| Emoji | Type | When to use |
|---|---|---|
| ✨ | `feat:` | A new feature or capability is added |
| 🐛 | `fix:` | A bug is fixed |
| 🔨 | `refactor:` | Code is restructured without changing behavior |
| 📝 | `docs:` | Only documentation changed |
| 🎨 | `style:` | Formatting, whitespace, code style (no behavior change) |
| ✅ | `test:` | Tests were added or updated |
| ⚡ | `perf:` | Performance optimization |

Use **only** these seven types and emojis. If the change does not fit any of them, ask the user to clarify the intent rather than guessing.

## Step 3. Format the message

Use this exact format:

```
<emoji> <type>: <concise_description>

<optional_body_explaining_why>
```

- The first line (subject) is short, imperative, and capitalized where natural. Keep it under ~72 characters when possible.
- The optional body is a short paragraph that explains *why* the change was made — the context, the motivation, the incident, the requirement. Skip the body only when the subject line is fully self-explanatory.

## Step 4. Propose and wait for confirmation

Present to the user, in this exact structure:

```
Summary of staged changes:
  - <file_1> — <one-line summary of what changed>
  - <file_2> — ...
  - ...

Proposed commit message:

  <emoji> <type>: <subject>

  <body>

Commit now? (yes / no / edit)
```

- If the user says `yes`, run `git commit -m "<the message>"` and confirm success.
- If the user says `no`, stop without committing.
- If the user says `edit`, take their corrections into account and re-present the updated message. Loop until they say `yes` or `no`.

**Never auto-commit.** Never run `git commit` without an explicit `yes` from the user. If the staged diff is empty, tell the user and stop — there is nothing to commit.
