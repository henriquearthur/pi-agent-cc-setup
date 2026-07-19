# Extensions reference

All extensions ship under `extensions/` and load automatically when the package is installed.

## `claude-code-header`

**File:** `extensions/claude-code-header.ts`

Replaces Pi's noisy startup inventory (when `quietStartup: true`) with one Claude Code–like welcome line:

```text
✦ Pi  my-project  ·  / commands  ·  Ctrl+Alt+P plan
```

## `claude-code-statusline`

**File:** `extensions/claude-code-statusline.ts`

Custom footer:

```text
 my-project • main │ ctx 42%  grok-4.5  high
```

Shows extension status badges (for example plan mode) between the location and the right-hand metrics. Falls back to a compact path when the terminal is narrow.

## `claude-code-tool-output`

**File:** `extensions/claude-code-tool-output.ts`

Makes tool traces feel like Claude Code:

- Collapses tool details by default (`setToolsExpanded(false)`)
- Re-registers **bash** and **read** with inline `renderShell: "self"` (no heavy tool boxes)
- Collapsed summary: `output hidden · N lines · Ctrl+O`
- Full output still available via **Ctrl+O**

## `claude-code-workflow`

**File:** `extensions/claude-code-workflow/index.ts`

Plan → approve → execute loop inspired by Claude Code plan mode.

| Command / shortcut | Action |
|--------------------|--------|
| `/plan` | Enter read-only plan mode |
| `/plan off` | Leave plan mode |
| `Ctrl+Alt+P` | Toggle plan mode |
| `/todos` | Show saved plan progress |
| `/execute` | Leave plan mode and run the saved plan |

**Plan mode guards:**

- Blocks `edit` / `write`
- Allows only simple read-only bash (`ls`, `rg`, `git status`, …)
- Injects instructions to end with a numbered `Plan:` section
- Parses that section into a todo widget

**Execute mode:**

- Restores write tools
- Tracks `[DONE:<n>]` markers from the model
- Clears status when every step is done

State is persisted in the session via `pi.appendEntry("claude-code-workflow", …)`.

## `claude-code-compat`

**File:** `extensions/claude-code-compat.ts`

Bridges Claude Code project conventions into Pi for **trusted** projects:

| Path | Behavior |
|------|----------|
| `.claude/skills/` | Added to skill discovery |
| `.claude/rules/**/*.md` | Paths injected into the system prompt so the model can read them on demand |

Untrusted projects are ignored.
