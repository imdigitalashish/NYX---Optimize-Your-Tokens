# Nyx: Provider-Adaptive Optical Text Compression for Frozen Vision-Language Models

*A research report. All numbers measured live against commercial VLM APIs. 20 experiments,
kill-fast methodology, git-checkpointed with full receipts.*

## Abstract

Rendering bulky text as dense images to cut LLM input tokens (narrow-baseline, DeepSeek-OCR, VIST)
works because an image's token cost is fixed by pixels, not characters. Prior work either
co-trains the encoder/decoder (DeepSeek-OCR, VIST, C3) or targets a single provider with a
single geometry (narrow-baseline). We study the **frozen-commercial-API** regime — no training, just
the best possible optical packing for APIs you can only call. Across 20 experiments we find:

1. **Image-token billing is provider-specific and one provider is nearly free.** Gemini 3.1
   Pro bills a **flat ~1080 tokens for any image from 0.6 to 25 megapixels.** Claude Opus 4.8
   and GPT scale with pixels then cap. narrow-baseline's Claude-tuned 1568×728 geometry is thus
   ~2× too expensive on Gemini.
2. **A single wide, densely-packed page on Gemini cuts tokens ~50% vs narrow-baseline** and ~87% vs
   raw text, at equal or better accuracy, on real code and reports.
3. **Optical readability is a provider capability, not a rendering problem.** Gemini reads
   5×8-pixel glyphs at ~36 chars/token and recalls exact GUIDs ~85%. Opus needs ~8×12 glyphs
   (~7 chars/token). GPT effectively cannot OCR synthetic renders at any size.
4. **Font engineering is a dead end.** A hand-designed 4×6 bitmap font (Tom Thumb) and real
   TrueType fonts both fail to beat the incumbent 5×8 Spleen atlas — the binding constraint
   is the encoder's OCR, not glyph design.
5. **Salience compression (stopword + vowel drop) before rendering** halves characters,
   preserves fact recall, and lets larger documents fit one flat-billed page.

## Method (what to actually ship)

Provider-adaptive:
- **Gemini family** → one ~2048–2348px-wide page, native 5×8 AA glyphs, reflow-packed, up to
  ~38k chars/page; salience-compress if larger. ~50% fewer tokens than narrow-baseline.
- **Opus 4.8** → 8×12 glyphs, ~22k chars/page. Makes it *work* (narrow-baseline's 5×8 = 1/5 garbage on
  Opus; ours = 5/5) but density only ~7. Marginal.
- **GPT / unknown** → don't image; pass through as text. Optical fails.

## Key results (live-measured)

| | narrow-baseline | Nyx-v2 | vs text |
|---|---|---|---|
| source-code-file (28k code), Gemini | 2172 tok, 3/3 | **1088 tok, 3/3** | −87% |
| report report (22k), Gemini | 2036 tok, 3/4 | **1053 tok, 4/4** | −86% |

## The honest boundary

Optical text compression is, today, a **strongest on Gemini 3.1 Pro**. The ~50% win over
narrow-baseline is real but Gemini-specific. On Opus the savings are lower. This is set by
provider vision encoders and no rendering trick changes it. As encoders improve, the
technique generalizes; until then, use it on Gemini and fall back to text elsewhere.

## Experiment index
T1 density cliff · T2 color-packing (killed) · T3 provider billing (breakthrough) ·
T7 salience · T8 synthesis · T9 glyph-size unlock · T10 fonts · T11 AA · T12 density ceiling ·
T13 micro-atlas · T14 aggressive compression · T15 Gemini-family generalization ·
T16 max density · T17 verbatim band · T18 verbatim recall · T19 layout · T20 real-world.

Full receipts: `RESULTS.md`. Literature: `LITERATURE.md`. Method: `METHOD.md`.
