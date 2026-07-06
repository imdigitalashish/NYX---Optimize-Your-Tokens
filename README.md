# Nyx — provider-adaptive optical text compression for coding agents

> *Nyx (Νύξ), Greek goddess of night — she folds the vast into the dark, yet you still find
> your way.* Nyx renders bulky text as dense images so a vision-capable agent reads it for a
> fraction of the input tokens.

Backed by **29 live experiments** against commercial VLM APIs (see `PAPER.md`, `RESULTS.md`,
`INDEX.md`). This is not a repackaging of prior work — it introduces provider-adaptive
geometry, salience pre-compression, and multi-file packing, with an honest map of where the
technique works and where it doesn't.

## The one-paragraph truth

On **Gemini 3.1 Pro / Gemini family**, Nyx cuts input tokens **~35% (avg) to ~50% (large
docs)** vs a narrow single-geometry baseline, and **~85-89% vs raw text**, at equal-or-better accuracy
on real code and reports. It packs whole multi-file codebases into ONE flat-billed image.
On **Claude Opus 4.8** it's marginal-but-usable. On **GPT** it doesn't work — read as text.
The tradeoff: imaged requests are **~3× slower in wall-clock** (optimizes cost, not speed).

## Why it works (the discovery)

Image-token billing is **provider-specific**, and we measured it live:
- **Gemini bills a FLAT ~1080 tokens for ANY image from 0.6 to 25 megapixels.** Image size
  is nearly free — only readability limits density. This is the key insight a Claude-tuned approach (built for
  Claude's `pixels/750` billing) never exploited.
- Opus/GPT scale with pixels then cap — a small page is right for them.

So on Gemini, Nyx packs the whole document into ONE wide, dense, flat-billed page instead of
multiple Claude-sized pages → ~50% fewer tokens on large docs.

## Install (GitHub Copilot CLI / Agency)

```bash
git clone https://github.com/imdigitalashish/NYX---Optimize-Your-Tokens nyx
copilot skill add ./nyx/skills/nyx
copilot skill list        # confirm "nyx"
```
Then in any session: *"using nyx, analyze these files"*. Best with
`--model gemini-3.1-pro-preview`.

## The renderer (provider-adaptive)

```bash
node render.mjs --provider gemini  <files...>   # one wide dense page (flat billing)
node render.mjs --provider opus    <files...>   # 8x12 glyphs Opus can read
node render.mjs --provider gpt     <files...>   # passes through: read as text
node render.mjs --provider gemini --compress   <big-file>   # stopword+vowel drop, fit 1 page
node render.mjs --provider gemini --multifile  <many-files> # whole codebase, one page
```

## What we proved (headline numbers, live-measured)

| content | text tokens | narrow baseline | **Nyx** |
|---|---|---|---|
| source-code-file (28k code), Gemini | 8598 | 2172 (3/3) | **1088 (3/3)** |
| report report (22k), Gemini | 7698 | 2036 (3/4) | **1053 (4/4)** |
| 175k-char codebase, Gemini | ~50000 | — | **5324 (89% fewer)** |

- Verbatim GUID recall on Gemini: **~85%** (vs a weak encoder's 0/15).
- Multi-file: 12 files / 26k chars → ONE page / ~1050 tokens.
- Slow-fast (image-history + text-recent) integrates seamlessly — the agent-conversation pattern.

## The honest boundaries

- **Doc-size dependent:** the ~50% win needs docs >15k chars. Below that both fit one page and
  Nyx is ~4% worse (the tool auto-uses narrow geometry for small docs).
- **Latency:** ~3× slower wall-clock. Use for cost-sensitive / batch / huge-context work, not
  latency-critical interactive turns.
- **Lossy:** ~85% verbatim, not 100%. For must-be-exact IDs, read as text.
- **Model-dependent:** best on Gemini 3.1 Pro; works on Opus 4.8 at lower savings; some vision encoders read dense renders better than others.

## What we tried that DIDN'T work (so you don't have to)

Color-channel packing (encoders blend RGB), micro-atlas / real fonts (don't beat 5×8 Spleen),
structured columnar layout (reflow blob wins 3×), verbatim bands (Gemini reads GUIDs fine),
Rust/WASM renderer (JS renders 200k chars in 169ms — not a bottleneck).

## License
MIT. Renderer vendored from an MIT-licensed text-to-image library.
