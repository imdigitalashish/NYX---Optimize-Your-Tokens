# Nyx — token-saving context compression for coding agents

> *Nyx (Νύξ), the Greek primordial goddess of night — she folds the vast into the dark
> and yet you still find your way.* Nyx renders bulky text as dense images so a coding
> agent reads it for a fraction of the input tokens.

## What it is

Nyx is a tiny skill + renderer for **GitHub Copilot CLI** (and any agent whose
built-in `Read` tool can open PNG files). When you ask the agent to work over large files
or logs "using nyx", it renders that text into dense PNG pages and reads the **images**
instead of the raw text. An image's token cost is fixed by its pixel size, not by how many
characters are packed inside it — so dense content costs far fewer input tokens as an
image than as text.

No MCP server, no proxy, no daemon. Just:
- `skills/nyx/SKILL.md` — instructions that trigger on "nyx" / "token-saving mode"
- `render.mjs` — a pure-JS script that turns files into dense PNG pages
- `vendor/` — the pure-JS glyph renderer (vendored, MIT; no native deps)

## Why images can be cheaper (the mechanism)

- Text billing ≈ `chars / ~3` tokens (varies by tokenizer and content).
- Image billing ≈ `width × height / 750` tokens on Claude — **independent of the text inside**.
- A 1568×728 page holds ~28,000 characters but bills ~1,500 tokens. So above a break-even
  density, imaging wins.
- **The catch:** it is **lossy**. The gist, structure, and most values survive; exact long
  identifiers (GUIDs, SHAs, error codes) can be misread. So Nyx is for *comprehension and
  reasoning over bulk*, not for byte-exact recall.

## What we measured before building (the experiment)

We validated the idea empirically before shipping. Full climb log in
`EXPERIMENT.md`; headline findings:

### 1. Token savings are real and content-dependent (measured via live `prompt_tokens`)

| Content | Text tokens | Image tokens | Savings |
|---|---:|---:|---:|
| Task 1 — dense report (22.6k chars, long lines/tables) | 10,228 | 5,473 | **~46%** |
| Task 2 — source code (28.4k chars, short lines) | 11,822 | 2,169 | **~82%** |

### 2. Accuracy holds on frontier models — collapses on older ones

Same dense document (Task 1), text vs image, 6-question comprehension incl. verbatim IDs:

| Model | Gist acc (img) | Verbatim-ID acc (img) |
|---|---|---|
| **gemini-3.1-pro-preview** | 15/15 | 14/15 |
| **claude-opus-4.8** | 15/15 | 10/15 |
| claude-sonnet-4.5 (older) | 2/5 | 0/5 |

→ Nyx targets **claude-opus-4.8** and **gemini-3.1-pro-preview** only.

### 3. The one lever that mattered: content-adaptive reflow

We hill-climbed 11 rendering strategies, git-checkpointing and reverting regressions.
Score went from **−18.75** (naive) to **~70** (winner). The breakthrough:

- **Reflow-pack SPARSE content** (source code, short lines): collapse newlines so short
  lines fill full-width rows. 28k-char file: 11 pages → 2 pages, −25% → +82% savings.
- **Do NOT reflow DENSE content** (reports, tables, long lines): keep one line per row so
  it stays legible. Reflowing dense text crams it unreadably and accuracy → 0.

Everything else (anti-aliasing, multi-column, markdown-stripping, width-shrink,
cap-tuning 9k/15k) failed to beat this and was reverted.

### 4. Compression ceiling (how far we can push without losing accuracy)

- **Dense content: ~45% savings at ZERO accuracy loss** — you can't compress dense text
  much more because it's already token-efficient, but that 45% is free.
- **Sparse code: ~80% savings at ~90% of text accuracy** — a small, real cost.
- Pushing the per-page density harder buys almost nothing extra: the ceiling is set by the
  **content type and the model's vision encoder**, not by how hard you pack.

## Tool parameters (frozen from the winning "iter4" strategy)

| Parameter | Value | Why |
|---|---|---|
| `MIN_CHARS` | 6000 | Below this, the fixed image-token floor makes imaging lose money → skip (stay text) |
| `SPARSE_LINE_THRESHOLD` | 60 chars | Avg non-empty line length. `< 60` = sparse (reflow-pack). `≥ 60` = dense (one line/row) |
| `REFLOW_PAGE_CAP` | 12000 chars/page | Legibility cap for reflowed sparse content; spreads to legible pages |
| Dense render | no reflow, one line per row | Preserves table/prose structure the model relies on |
| Page geometry | 1568 px wide, ≤728 px tall, 5×8 glyphs | Fits Anthropic's 1568-edge / ~1.15 MP resample cap so billed pixels reach the encoder |
| Model allowlist | `claude-opus-4.8`, `gemini-3.1-pro-preview` | Only models that read dense renders accurately |
| Identifier sidecar | exact paths + line ranges returned as text | Mitigates verbatim confabulation; agent can re-Read for byte-exact needs |

## How it runs (no MCP)

```
1. User: "using nyx, check why this code is failing in src/**/*.ts"
2. SKILL.md triggers → tells the agent to run:
       node render.mjs --out .nyx-cache <files>
3. Agent runs it via its Bash tool → dense PNG pages written to .nyx-cache/
4. render.mjs prints a manifest: which page holds which file + exact file paths/line counts
5. Agent Reads the PNG pages (built-in Read opens them as images) → reasons → answers
6. Byte-exact need? Agent falls back to normal Read on that one file.
```

## Honest limitations

- Lossy; verbatim recall of exact long strings is unreliable. Sidecar + re-Read mitigates.
- Only worth it above ~6k chars of dense content; small reads stay text.
- Only validated on Opus 4.8 / Gemini 3.1 Pro.
- The agent must *choose* to use it (skill nudges it) — Nyx is opt-in by design, not a
  transparent proxy.

## License
Renderer vendored from an MIT-licensed text-to-image library. Nyx glue: MIT.
