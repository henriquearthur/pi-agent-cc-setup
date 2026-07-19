# Full machine setup

This guide replicates the Claude Code–like Pi Agent setup on a fresh machine.

## 1. Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 20+** | Pi runtime | [nodejs.org](https://nodejs.org/) or your version manager |
| **Pi Agent** | The coding agent | `npm install -g @earendil-works/pi-coding-agent` |
| **ripgrep (`rg`)** | Fast search (recommended) | [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) |
| **fd** | Fast file find (recommended) | [sharkdp/fd](https://github.com/sharkdp/fd) |
| **git** | Package install + workflows | system package manager |

Verify:

```bash
node -v
pi --version
rg --version
fd --version
```

## 2. One-command install

```bash
curl -fsSL https://raw.githubusercontent.com/henriquearthur/pi-agent-cc-setup/main/scripts/install.sh | bash
```

What the script does:

1. `pi install git:github.com/henriquearthur/pi-agent-cc-setup`
2. Merges [config/settings.recommended.json](../config/settings.recommended.json) into `~/.pi/agent/settings.json`
3. Installs [config/APPEND_SYSTEM.md](../config/APPEND_SYSTEM.md) as `~/.pi/agent/APPEND_SYSTEM.md`

### Useful flags

```bash
# From a local clone
./scripts/install.sh --from .

# Also install subagent package + recommended skills
./scripts/install.sh --with-subagents --with-skills

# Keep your current settings.json untouched
./scripts/install.sh --skip-settings
```

## 3. Manual install (step by step)

### 3.1 Install the Pi package

```bash
pi install git:github.com/henriquearthur/pi-agent-cc-setup
```

Or from a checkout:

```bash
git clone https://github.com/henriquearthur/pi-agent-cc-setup.git
pi install ./pi-agent-cc-setup
```

This loads:

- **extensions/** — TUI chrome, compact tools, plan mode, `.claude/` compat
- **themes/claude-code.json** — warm Claude-like palette
- **prompts/** — `/commit`, `/review`, `/security-review`, `/test`

### 3.2 Apply recommended settings

Copy keys from `config/settings.recommended.json` into `~/.pi/agent/settings.json`, or merge with `jq`:

```bash
# backup first
cp ~/.pi/agent/settings.json ~/.pi/agent/settings.json.bak

# set the theme after install
# then start pi and run: /theme claude-code
```

Important keys:

| Key | Value | Effect |
|-----|-------|--------|
| `theme` | `"claude-code"` | Claude-like colors |
| `quietStartup` | `true` | Hide Pi inventory banner (header extension replaces it) |
| `hideThinkingBlock` | `true` | Cleaner transcript; thinking still runs |
| `editorPaddingX` | `1` | Tighter editor chrome |
| `outputPad` | `0` | Less vertical padding |
| `enableSkillCommands` | `true` | Skills available as slash commands |
| `compaction` | reserve 16k / keep 20k | Longer useful context before compact |
| `retry` | 3 attempts | Survive transient provider errors |

**Not included on purpose:** `defaultProvider` / `defaultModel`. Keep your own model choices.

### 3.3 System prompt preamble

```bash
cp config/APPEND_SYSTEM.md ~/.pi/agent/APPEND_SYSTEM.md
```

This appends Codex-style preamble guidance (announce tool work, progress updates) without replacing Pi's base system prompt.

### 3.4 Optional: subagents package

```bash
pi install npm:@tintinweb/pi-subagents@0.14.2
```

### 3.5 Optional: third-party skills

These are **not** vendored in this repo (separate authors/licenses). Install via the [skills](https://skills.sh/) CLI:

```bash
npx skills add vercel-labs/agent-skills@find-skills -g -y
npx skills add anthropics/skills@frontend-design -g -y
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y
```

Link them into Pi if the skills CLI does not already:

```bash
mkdir -p ~/.pi/agent/skills
ln -s ~/.agents/skills/find-skills ~/.pi/agent/skills/find-skills
ln -s ~/.agents/skills/frontend-design ~/.pi/agent/skills/frontend-design
ln -s ~/.agents/skills/vercel-react-best-practices ~/.pi/agent/skills/vercel-react-best-practices
```

## 4. Authenticate a model

Pi needs at least one provider. Examples:

```bash
# Interactive
pi
# then /login  (or provider-specific auth)

# Or environment variables for your provider
export ANTHROPIC_API_KEY=...
export OPENAI_API_KEY=...
export XAI_API_KEY=...
```

See Pi docs: [providers](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md) and [models](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/models.md).

## 5. Verify the setup

```bash
pi
```

You should see:

1. Quiet startup (no long inventory dump)
2. A single welcome line: `✦ Pi  <project>  ·  / commands  ·  Ctrl+Alt+P plan`
3. Footer with project/branch, context %, model, thinking level
4. Theme colors in the warm Claude orange/cream range

Quick smoke test:

```text
/plan
List the top-level files in this repo and propose a 3-step Plan:
```

Expect plan mode status (`⏸ plan`), blocked writes, and a parsed todo widget after the model emits a numbered `Plan:`.

```text
/plan off
```

Expand a collapsed tool result with **Ctrl+O**.

## 6. Project-local Claude Code conventions

In a trusted project, this package also understands:

```text
your-repo/
  .claude/
    skills/          # discovered as Pi skills
    rules/**/*.md    # listed in the system prompt for on-demand reading
```

Trust is controlled by Pi (`defaultProjectTrust` / trust prompts). Untrusted projects skip `.claude/` loading.

## 7. Updating

```bash
pi install git:github.com/henriquearthur/pi-agent-cc-setup@main
# or
pi update --extensions
```

Re-run `scripts/install.sh` if you also want settings / `APPEND_SYSTEM.md` refreshed.

## 8. Uninstall

```bash
pi remove git:github.com/henriquearthur/pi-agent-cc-setup
# or whatever source string `pi list` shows
```

Optionally restore settings from your backup and remove `~/.pi/agent/APPEND_SYSTEM.md`.

## 9. What is intentionally not included

| Item | Reason |
|------|--------|
| Orca terminal extensions | Specific to the Orca multiplexer environment |
| API keys / `auth.json` | Secrets stay on your machine |
| `defaultProvider` / `defaultModel` | Personal preference |
| Bundled `rg` / `fd` binaries | Install from upstream; do not ship platform binaries |
| Third-party skills content | Install from original authors via skills.sh |

## 10. Directory map after install

```text
~/.pi/agent/
  settings.json              # merged recommended UX settings
  APPEND_SYSTEM.md           # preamble guidance
  git/github.com/henriquearthur/pi-agent-cc-setup/   # package clone (git install)
  skills/                    # optional skill symlinks
  npm/                       # npm packages such as pi-subagents
```
