# Viper Code

Viper Code is a Windows desktop GUI for coding agents — run **Claude Code** and **Codex** side by side in one app, with git worktrees, per-turn diffs, one-click PRs, and your skills available as slash commands.

**Download:** grab the latest `Viper-Code-x.y.z-x64.exe` from [Releases](https://github.com/Viperisuseful/ViperCode/releases). The app auto-updates from this repository — install once, every new tagged release is offered in-app.

> Windows SmartScreen note: builds are unsigned, so the first install shows "Windows protected your PC" — click **More info → Run anyway**.

## Providers

Viper Code supports exactly two providers. Install and log in to at least one before use:

- **Claude:** install [Claude Code](https://claude.com/product/claude-code) and run `claude` once to log in
- **Codex:** install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`

Your existing CLI setup carries over automatically — Viper Code launches the same `claude`/`codex` binaries under your home directory, so logins, `~/.claude` skills, plugins, MCP servers, and `CLAUDE.md` files all work without migration. Skills and custom commands show up in the composer when you type `/`.

Planned next: **GitHub Copilot** integration with account login.

## Versions and updates

- Releases are cut by pushing a `v*` tag; GitHub Actions builds the NSIS installer on `windows-latest` and publishes the `.exe`, `.blockmap`, and `latest.yml` to Releases.
- The installed app polls this repo's releases (electron-updater, `latest.yml`) and self-updates.
- The repo must stay **public** for auto-update and downloads to work.

## Development setup

Requirements:

- Node.js 24+ (Node 25 works)
- pnpm 10 (`npm install -g pnpm@10.24.0`)
- Vite+ (`npm install -g vite-plus@0.1.24`, provides the `vp` command)

```bash
# install dependencies
vp i

# run the web app + server in dev mode
pnpm dev

# run the Electron desktop app in dev mode
pnpm dev:desktop

# typecheck / test
pnpm typecheck
pnpm test
```

## Building the desktop app locally (Windows)

```bash
pnpm dist:desktop:win
```

The installer lands in `release/`. The updater feed defaults to `Viperisuseful/ViperCode`; override with `VIPERCODE_DESKTOP_UPDATE_REPOSITORY=<owner>/<repo>` at build time. Unsigned builds still get the app icon and version metadata embedded in the exe.

## Releasing a new version

1. Bump `version` in `apps/server/package.json`, `apps/desktop/package.json`, and `apps/web/package.json` (keep them identical — the server version stamps the installer, the web version must match to avoid client/server skew warnings; the build also injects `APP_VERSION` into the web bundle).
2. Commit, then `git tag vX.Y.Z && git push origin main vX.Y.Z`.
3. GitHub Actions publishes the release; installed apps pick it up automatically.

## CLI

The server package builds a `viper` CLI (`apps/server`, bin `viper`):

```bash
pnpm build
node apps/server/dist/bin.mjs        # or `viper` once linked/installed
```

## Fork history

Viper Code started as a fork of an MIT-licensed agent GUI (upstream kept as the `upstream` git remote; original copyright retained in [LICENSE](./LICENSE)). Changes made in the fork:

- Rebranded end to end (names, package scope `@vipercode/*`, env prefix `VIPERCODE_*`, `viper://` schemes, `~/.viper` state dir, V`>_` logo and wordmark).
- Removed the Cursor, Grok, and OpenCode provider integrations — Claude + Codex only.
- Windows-only: dropped macOS/Linux build targets, the marketing site, and the iOS companion app.
- Privacy: removed the bundled PostHog telemetry key (telemetry is off unless you provide your own), and all cloud/relay features are env-gated off by default.
- Replaced the upstream release pipeline with a single Windows release workflow ([.github/workflows/release.yml](.github/workflows/release.yml)).

## Notes

- Windows only. Releases ship a single NSIS `.exe` installer.
- Docs live in [docs/](./docs).
- Architecture overview: [docs/architecture/overview.md](./docs/architecture/overview.md)
