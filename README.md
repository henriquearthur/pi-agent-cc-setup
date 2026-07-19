# pi-agent-cc-setup

**Make [Pi Agent](https://github.com/earendil-works/pi) feel like Claude Code.**

A ready-to-install Pi package: Claude-like TUI chrome, compact tool traces, plan/execute workflow, theme, prompts, and a one-command installer that replicates the full setup on another machine.

> Not affiliated with Anthropic or Claude Code. This is a community configuration pack for [Pi](https://pi.dev).

---

## What you get

| Area | Behavior |
|------|----------|
| **Header** | Single welcome line instead of Pi's inventory dump |
| **Footer** | Project · branch · context % · model · thinking level |
| **Tools** | Collapsed bash/read traces; expand with `Ctrl+O` |
| **Plan mode** | `/plan` or `Ctrl+Alt+P` — read-only exploration + numbered plan |
| **Execute** | `/execute` runs the saved plan with progress tracking |
| **Compat** | Reads `.claude/skills` and `.claude/rules` in trusted projects |
| **Theme** | Warm orange/cream `claude-code` palette |
| **Prompts** | `/commit`, `/review`, `/security-review`, `/test` |
| **Preamble** | Codex-style progress updates via `APPEND_SYSTEM.md` |

```text
✦ Pi  my-app  ·  / commands  ·  Ctrl+Alt+P plan

› $ rg -n "TODO" src
  ↳ output hidden · 12 lines · Ctrl+O

 my-app • main │ ⏸ plan │ ctx 18%  claude-sonnet-4  high
```

---

## Quick install

**Requirements:** [Node.js 20+](https://nodejs.org/), [Pi Agent](https://github.com/earendil-works/pi)

```bash
npm install -g @earendil-works/pi-coding-agent

# Install this package + recommended settings + system preamble
curl -fsSL https://raw.githubusercontent.com/henriquearthur/pi-agent-cc-setup/main/scripts/install.sh | bash
```

Or only the Pi package (no settings merge):

```bash
pi install git:github.com/henriquearthur/pi-agent-cc-setup
```

Then:

```bash
pi
/theme claude-code    # if the theme is not already selected
```

**Full machine walkthrough:** [docs/SETUP.md](docs/SETUP.md)

---

## Install options

```bash
# From a local clone
git clone https://github.com/henriquearthur/pi-agent-cc-setup.git
cd pi-agent-cc-setup
./scripts/install.sh --from .

# Also pull subagents + popular skills
./scripts/install.sh --with-subagents --with-skills

# Package only; leave my settings alone
./scripts/install.sh --skip-settings
```

| Flag | Meaning |
|------|---------|
| `--from <path>` | Install from a local checkout |
| `--skip-settings` | Do not touch `~/.pi/agent/settings.json` |
| `--with-subagents` | `pi install npm:@tintinweb/pi-subagents` |
| `--with-skills` | Install recommended skills via [skills.sh](https://skills.sh/) |
| `--force-append` | Overwrite existing `APPEND_SYSTEM.md` |

---

## After install — day-to-day

| Action | How |
|--------|-----|
| Toggle plan mode | `/plan` or `Ctrl+Alt+P` |
| Leave plan mode | `/plan off` |
| Run approved plan | `/execute` |
| Show plan todos | `/todos` |
| Expand tool output | `Ctrl+O` |
| Conventional commit help | `/commit` |
| PR-style review | `/review` |
| Security pass | `/security-review` |
| Run focused tests | `/test` |

### Plan mode workflow

1. `/plan` — writes blocked; model explores and ends with a numbered `Plan:`
2. Review the todo widget in the TUI
3. `/execute` — tools restored; model works the list and marks `[DONE:n]`
4. Status clears when every step is done

### Claude Code project layout

In **trusted** repos you can keep using Claude-style paths:

```text
.claude/
  skills/           # discovered as Pi skills
  rules/**/*.md     # paths listed for the model to read on demand
```

---

## Repository layout

```text
pi-agent-cc-setup/
  extensions/                 # Pi extensions (TUI + workflow + compat)
    claude-code-header.ts
    claude-code-statusline.ts
    claude-code-tool-output.ts
    claude-code-compat.ts
    claude-code-workflow/
  themes/claude-code.json     # color theme
  prompts/                    # slash prompt templates
  config/
    settings.recommended.json # UX settings (no API keys / no model lock-in)
    APPEND_SYSTEM.md          # system-prompt preamble
  scripts/install.sh          # one-shot installer
  docs/
    SETUP.md                  # full replication guide
    EXTENSIONS.md             # extension reference
```

This is a standard **Pi package** (`package.json` → `"pi"` manifest + `pi-package` keyword). See Pi's [packages docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md).

---

## Recommended settings (summary)

Applied by the installer from `config/settings.recommended.json`:

- `theme: "claude-code"`
- `quietStartup: true` — header extension owns the welcome line
- `hideThinkingBlock: true` — cleaner transcript
- `editorPaddingX: 1`, `outputPad: 0` — tighter chrome
- Compaction + retry tuned for longer sessions

**Not forced:** provider, model, or API credentials. Configure those yourself (`/login`, env vars, etc.).

Details: [docs/SETUP.md](docs/SETUP.md) · Extensions: [docs/EXTENSIONS.md](docs/EXTENSIONS.md)

---

## Optional extras

### Subagents

```bash
pi install npm:@tintinweb/pi-subagents@0.14.2
```

### Skills (third-party)

```bash
npx skills add vercel-labs/agent-skills@find-skills -g -y
npx skills add anthropics/skills@frontend-design -g -y
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y
```

### CLI helpers

Install [ripgrep](https://github.com/BurntSushi/ripgrep) and [fd](https://github.com/sharkdp/fd) on your PATH for faster agent search/discovery.

---

## Updating / removing

```bash
pi install git:github.com/henriquearthur/pi-agent-cc-setup@main
pi update --extensions

pi remove git:github.com/henriquearthur/pi-agent-cc-setup
```

---

## Security

Pi packages run with full system access. Extensions are TypeScript executed by the agent host. Review this repository before installing, especially if you pin floating refs like `@main`.

Never commit `auth.json`, API keys, or session transcripts into a setup pack.

---

## Compatibility

- Developed against **Pi Agent 0.80.x**
- macOS / Linux (installer is bash). Windows: use Pi's package install manually and copy `config/` files
- Theme schema: Pi coding-agent interactive theme JSON

---

## License

[MIT](LICENSE) © Henrique Arthur

Theme/extension ideas inspired by Claude Code's UX; no Anthropic code or trademarks are included beyond descriptive comparison.
