# Nyx Research — challenging the axioms of text-as-image compression

## The mechanism, stated precisely
Text → glyph bitmap → PNG → vision encoder → model "reads" it. Token cost is
`billed_pixels / K` (K≈750 Claude), NOT character count. Text costs ~3.5 char/token;
narrow-baseline packs ~28,000 chars into a ~1.15MP page billed ~1,525 tokens ≈ **18 char/token**.
So narrow-baseline's edge over text is ~5×. Everything below asks: can we do better than 18, faster,
or without the pain?

## The axioms narrow-baseline bakes in (and never questions)

1. **AXIOM A1 — glyphs must be human-legible 5×8 monochrome.** Chosen for Opus 4.7-era
   OCR. Frontier encoders (Gemini 3.1, Opus 4.8) may read far smaller. If 4×6 or 3×5 works,
   that's 1.6–2.7× more chars/page for free.

2. **AXIOM A2 — 1 char = 1 monochrome glyph = ~40 px.** A pixel can carry 24 bits (RGB).
   Color is used only for role-tinting decoration. What if color is a DATA channel? Pack
   3 independent text layers into R/G/B → up to 3× density if the encoder can separate them.

3. **AXIOM A3 — billing is width×height/750, provider-agnostic.** FALSE. Claude bills
   ~px/750 to 1.15MP. Gemini bills in 768px tiles (~258 tok/tile). GPT bills 85+170/tile.
   The optimal render GEOMETRY is provider-specific and nobody has tuned it. A page tuned to
   Gemini's tile grid could be dramatically cheaper per char than the Claude-tuned 1568×728.

4. **AXIOM A4 — you must send an image.** The pains (lossy, vision-only, slow, cache-hostile)
   all stem from this. Is there a text-domain compression that gets some of the win losslessly
   and universally? (tokenizer-aware packing). Probably smaller gains, but zero pain.

5. **AXIOM A5 — one glyph per cell, fixed grid.** Variable-width packing, ligature-like
   bigram glyphs (common digraphs as one cell), or dictionary substitution before render
   could raise char density independent of glyph size.

6. **AXIOM A6 — PNG, encoded in JS.** Latency pain. Token cost is pixel-bound, not
   byte-bound, so format is free to change. A Rust/WASM SIMD renderer + raw/QOI buffer could
   be 10–50× faster to build the page. Pure latency win, addresses a real pain.

7. **AXIOM A7 — lossy verbatim is acceptable/unavoidable.** The confabulation problem. What
   if we render exact identifiers (GUIDs/SHAs) in a HIGH-contrast, larger, isolated "verbatim
   band" while gist text stays dense? Hybrid fidelity — dense gist + sharp IDs — kills the
   worst pain (silent wrong IDs) at tiny token cost.

## Theses to test (kill-fast, keep-what-wins)

- **T1 (A1): Glyph-size floor per model.** Sweep 5×8 → 3×5. Find smallest legible cell on
  Gemini 3.1 / Opus 4.8. Expected: frontier reads smaller than narrow-baseline assumes. HIGH value,
  cheap.
- **T2 (A2): Color-channel packing.** Render 2–3 text layers in R/G/B. Can the model read a
  named channel? Even 1.5× is a breakthrough. HIGH risk, HIGH reward.
- **T3 (A3): Provider-tuned geometry.** Measure real billed tokens/char for identical content
  on Claude vs Gemini vs GPT; tune page to each provider's tile grid. Possibly large free win.
- **T4 (A6): Rust/WASM SIMD renderer.** Benchmark build+encode latency vs JS. Latency pain.
- **T5 (A7): Hybrid fidelity band.** Dense gist + sharp verbatim IDs. Kills confabulation.
- **T6 (A5): Bigram/dictionary pre-pack.** Substitute common tokens/digraphs pre-render.

## Scoring
Every thesis ships a number with an n or it's cut. Metric = chars per billed token
(density) AND accuracy (recall %) AND latency (ms). A win must beat narrow-baseline's ~18 char/tok
without dropping accuracy below text parity on the target model.
