# Contributing

Thanks for helping improve the Claude Code–like Pi setup.

## Development

1. Clone the repo and install into your Pi user config from the checkout:

   ```bash
   ./scripts/install.sh --from . --skip-settings
   ```

2. Edit extensions under `extensions/`.

3. In a running Pi session, use `/reload` to pick up extension changes (auto-discovered paths and package installs that support reload).

4. Exercise the flow you changed (plan mode, tool collapse, footer, `.claude/` rules, etc.).

## Guidelines

- Keep the package free of secrets, machine-specific paths, and locked provider/model choices.
- Prefer English UI strings in extensions so the pack is usable internationally.
- Do not vendor large third-party skills; document install commands instead.
- Orca-specific hooks stay out of this repo.
- Match existing TypeScript style: small focused modules, minimal dependencies, Pi peer APIs only.

## Pull requests

- Describe the UX change and how you tested it.
- Update `docs/EXTENSIONS.md` or `README.md` when behavior is user-visible.
- Bump `package.json` version and add a `CHANGELOG.md` entry for user-facing releases.

## Reporting issues

Include Pi version (`pi --version`), OS, and whether you installed via git package or local path.
