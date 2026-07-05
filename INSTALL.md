# Installing Nyx in GitHub Copilot CLI

Nyx is a token-saving skill that renders bulky files as dense images the agent reads
instead of raw text. It needs no MCP server, no proxy — just Node and this skill.

---

## From a ZIP file (simplest)

Skills are just folders. The `skills/nyx/` folder is **self-contained** (bundles
`render.mjs` + the renderer), so installing is a one-liner.

### Easiest — let Copilot register it (recommended)
```bash
unzip nyx.zip -d nyx                 # or Expand-Archive on Windows
copilot skill add ./nyx/skills/nyx
copilot skill list                   # confirm "nyx" appears
```
`copilot skill add <dir>` registers the directory in your settings — no manual copying,
works from wherever you extracted it.

### Or copy it into the personal skills dir by hand

Personal skills live in `~/.copilot/skills/`:

Windows (PowerShell):
```powershell
Expand-Archive nyx.zip -DestinationPath $env:TEMP\nyx
New-Item -ItemType Directory -Force "$env:USERPROFILE\.copilot\skills" | Out-Null
Copy-Item $env:TEMP\nyx\skills\nyx "$env:USERPROFILE\.copilot\skills\nyx" -Recurse
```
macOS / Linux:
```bash
unzip nyx.zip -d /tmp/nyx
mkdir -p ~/.copilot/skills
cp -r /tmp/nyx/skills/nyx ~/.copilot/skills/nyx
```

Verify with `copilot skill list` (shows `nyx`), then start a new session.

---

## From this repo (git clone)

```bash
git clone <this-repo-url> nyx
copilot skill add ./nyx/skills/nyx
copilot skill list                   # confirm "nyx" appears
```

---

## Use it

In any session, just ask — the skill triggers on the word "nyx" or "token-saving mode":

```
using nyx, analyze why the request builder in src/providers/*.ts drops image blocks
```
```
nyx mode: read these logs and find the first error
```

The agent renders the files to dense PNGs (in a local `.nyx-cache/` folder) and reads
those images to answer — cutting input tokens ~45–80%.

> **Best on `gemini-3.1-pro-preview`** (clean ~66% token cut, near-parity accuracy).
> Not recommended on the strongest reasoning models that over-verify dense pages and lose
> the savings.

---

## Repo layout (for maintainers)

```
nyx/
├── .claude-plugin/plugin.json     # manifest
├── skills/nyx/SKILL.md            # the skill (auto-discovered)
├── skills/nyx/render.mjs          # the renderer (run by the skill)
├── skills/nyx/vendor/             # pure-JS glyph renderer (no native deps)
├── README.md  EXPERIMENT.md  INSTALL.md
```

The `skills/nyx/` folder is self-contained, so distributing just that folder (or a zip of
the repo) is enough.

---

## Uninstall

```bash
copilot skill remove nyx
```

## Requirements
- Node 18+ (bundled with most CLI runtimes).
- A vision-capable model, ideally `gemini-3.1-pro-preview`.

## Troubleshooting
- **"render.mjs not found"** — the skill resolves `render.mjs` in its own directory; if the
  agent can't find it, point it at the installed path from `copilot skill list`.
- **Savings look small on a file** — files under 6000 chars are skipped by design (too
  small to beat the image-token floor); they're read as normal text.
- **Exact IDs/strings look wrong** — imaging is lossy; for byte-exact values the agent
  falls back to a normal text Read of that one file. This is expected behavior.
