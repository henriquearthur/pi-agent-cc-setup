#!/usr/bin/env bash
# Install pi-agent-cc-setup into the current user's Pi Agent config.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/henriquearthur/pi-agent-cc-setup/main/scripts/install.sh | bash
#   ./scripts/install.sh
#   ./scripts/install.sh --from /path/to/checkout
#   ./scripts/install.sh --skip-settings
#   ./scripts/install.sh --with-subagents
#   ./scripts/install.sh --with-skills
set -euo pipefail

REPO_SLUG="henriquearthur/pi-agent-cc-setup"
GIT_SOURCE="git:github.com/${REPO_SLUG}"
PI_HOME="${PI_HOME:-${HOME}/.pi/agent}"
SETTINGS_FILE="${PI_HOME}/settings.json"
APPEND_SYSTEM_FILE="${PI_HOME}/APPEND_SYSTEM.md"

FROM_PATH=""
SKIP_SETTINGS=0
WITH_SUBAGENTS=0
WITH_SKILLS=0
FORCE_APPEND=0

log()  { printf '==> %s\n' "$*"; }
warn() { printf '!!  %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Install pi-agent-cc-setup into ~/.pi/agent

Options:
  --from <path>       Install from a local checkout instead of GitHub
  --skip-settings     Do not merge recommended settings.json keys
  --with-subagents    Also install npm:@tintinweb/pi-subagents
  --with-skills       Also install recommended third-party skills (skills CLI)
  --force-append      Overwrite existing ~/.pi/agent/APPEND_SYSTEM.md
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      FROM_PATH="${2:-}"; shift 2 || die "--from requires a path"
      ;;
    --skip-settings) SKIP_SETTINGS=1; shift ;;
    --with-subagents) WITH_SUBAGENTS=1; shift ;;
    --with-skills) WITH_SKILLS=1; shift ;;
    --force-append) FORCE_APPEND=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but was not found in PATH"
}

merge_settings() {
  local recommended="$1"
  need_cmd node

  mkdir -p "${PI_HOME}"
  if [[ ! -f "${SETTINGS_FILE}" ]]; then
    printf '{}\n' > "${SETTINGS_FILE}"
  fi

  node --input-type=module - "${SETTINGS_FILE}" "${recommended}" <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const [settingsPath, recommendedPath] = process.argv.slice(2);
const current = JSON.parse(readFileSync(settingsPath, "utf8"));
const recommended = JSON.parse(readFileSync(recommendedPath, "utf8"));

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else if (out[key] === undefined) {
      out[key] = value;
    } else if (isPlainObject(value) && !isPlainObject(out[key])) {
      // Keep the user's non-object value.
    } else if (!isPlainObject(value)) {
      // UX knobs from this package should win so the Claude Code look lands.
      out[key] = value;
    }
  }
  return out;
}

// Always apply the recommended theme + quiet chrome keys.
const forceKeys = new Set([
  "theme",
  "hideThinkingBlock",
  "quietStartup",
  "editorPaddingX",
  "outputPad",
  "autocompleteMaxVisible",
  "enableSkillCommands",
  "treeFilterMode",
]);

const merged = deepMerge(current, recommended);
for (const key of forceKeys) {
  if (key in recommended) merged[key] = recommended[key];
}
if (recommended.compaction) {
  merged.compaction = { ...(current.compaction ?? {}), ...recommended.compaction };
}
if (recommended.retry) {
  merged.retry = {
    ...(current.retry ?? {}),
    ...recommended.retry,
    provider: {
      ...((current.retry && current.retry.provider) || {}),
      ...((recommended.retry && recommended.retry.provider) || {}),
    },
  };
}

// Never invent provider/model choices — leave whatever the user already has.
writeFileSync(settingsPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`updated ${settingsPath}`);
NODE
}

install_package() {
  need_cmd pi

  if [[ -n "${FROM_PATH}" ]]; then
    local abs
    abs="$(cd "${FROM_PATH}" && pwd)"
    [[ -f "${abs}/package.json" ]] || die "no package.json in ${abs}"
    log "Installing local package: ${abs}"
    pi install "${abs}"
  else
    log "Installing package from GitHub: ${GIT_SOURCE}"
    pi install "${GIT_SOURCE}"
  fi
}

install_append_system() {
  local source_file="$1"
  mkdir -p "${PI_HOME}"

  if [[ -f "${APPEND_SYSTEM_FILE}" && "${FORCE_APPEND}" -ne 1 ]]; then
    if cmp -s "${source_file}" "${APPEND_SYSTEM_FILE}"; then
      log "APPEND_SYSTEM.md already up to date"
      return
    fi
    local backup="${APPEND_SYSTEM_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    cp "${APPEND_SYSTEM_FILE}" "${backup}"
    warn "Existing APPEND_SYSTEM.md backed up to ${backup}"
  fi

  cp "${source_file}" "${APPEND_SYSTEM_FILE}"
  log "Installed ${APPEND_SYSTEM_FILE}"
}

resolve_asset_root() {
  if [[ -n "${FROM_PATH}" ]]; then
    (cd "${FROM_PATH}" && pwd)
    return
  fi

  # After `pi install git:...`, the clone lives under ~/.pi/agent/git/
  local clone="${PI_HOME}/git/github.com/${REPO_SLUG}"
  if [[ -d "${clone}" ]]; then
    printf '%s\n' "${clone}"
    return
  fi

  # Running from a checkout of this repo.
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [[ -f "${here}/package.json" ]]; then
    printf '%s\n' "${here}"
    return
  fi

  die "could not locate package assets; re-run with --from /path/to/pi-agent-cc-setup"
}

check_optional_tools() {
  if ! command -v rg >/dev/null 2>&1; then
    warn "ripgrep (rg) not found — recommended for fast codebase search"
  fi
  if ! command -v fd >/dev/null 2>&1; then
    warn "fd not found — recommended for fast file discovery"
  fi
}

install_subagents() {
  log "Installing @tintinweb/pi-subagents"
  pi install "npm:@tintinweb/pi-subagents@0.14.2"
}

install_skills() {
  if ! command -v npx >/dev/null 2>&1; then
    warn "npx not found; skipping skills install"
    return
  fi

  log "Installing recommended skills via skills CLI"
  # Global install into ~/.agents/skills (skills CLI), which Pi picks up when linked/copied.
  npx --yes skills add vercel-labs/agent-skills@find-skills -g -y || warn "failed to install find-skills"
  npx --yes skills add anthropics/skills@frontend-design -g -y || warn "failed to install frontend-design"
  npx --yes skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y || warn "failed to install vercel-react-best-practices"

  # Ensure Pi can see skills installed by the skills CLI.
  mkdir -p "${PI_HOME}/skills"
  local agents_skills="${HOME}/.agents/skills"
  if [[ -d "${agents_skills}" ]]; then
    for skill in find-skills frontend-design vercel-react-best-practices; do
      if [[ -d "${agents_skills}/${skill}" && ! -e "${PI_HOME}/skills/${skill}" ]]; then
        ln -s "${agents_skills}/${skill}" "${PI_HOME}/skills/${skill}"
        log "Linked skill ${skill}"
      fi
    done
  fi
}

main() {
  need_cmd pi
  log "Pi detected: $(pi --version 2>/dev/null || echo unknown)"

  install_package

  local root
  root="$(resolve_asset_root)"
  log "Using assets from ${root}"

  if [[ "${SKIP_SETTINGS}" -eq 0 ]]; then
    merge_settings "${root}/config/settings.recommended.json"
  else
    log "Skipping settings merge (--skip-settings)"
  fi

  install_append_system "${root}/config/APPEND_SYSTEM.md"

  if [[ "${WITH_SUBAGENTS}" -eq 1 ]]; then
    install_subagents
  fi

  if [[ "${WITH_SKILLS}" -eq 1 ]]; then
    install_skills
  fi

  check_optional_tools

  cat <<EOF

Setup complete.

Next steps:
  1. Authenticate a model provider if needed:  pi /login   (or your provider's env vars)
  2. Start Pi:                                 pi
  3. Confirm theme:                            /theme claude-code
  4. Try plan mode:                            /plan   or   Ctrl+Alt+P
  5. Expand tool output:                       Ctrl+O

Docs: https://github.com/${REPO_SLUG}#readme
EOF
}

main
