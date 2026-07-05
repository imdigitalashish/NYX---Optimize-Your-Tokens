# Nyx Research — live results

## T1: density/accuracy cliff (Gemini 3.1 Pro) — CONFIRMED FINDING
narrow-baseline's default 28080 chars/page is PAST the accuracy knee on identifier-dense content.

| chars/page | billed tok | char/tok | accuracy (3 trials) |
|---|---|---|---|
| 18000 | 2208 | 13.4 | 6/6, 6/6, 6/6 ✅ |
| 22000 | 2180 | 13.6 | 6/6, 6/6, 6/6 ✅ |
| 28080 (narrow-baseline default) | 2068 | 14.4 | 4/6, 4/6, 4/6 ❌ (−33%) |

**Actionable:** cap at ~22k chars/page → recover 33% accuracy at ~5% token cost.
narrow-baseline leaves accuracy on the table by over-packing. First concrete improvement.

## T2: color-channel packing — KILLED
Hypothesis: pack 3 text layers in R/G/B channels for 3x density.
Result: model CANNOT separate overlapping color planes. When 3 layers occupy the same
pixels, the vision encoder blends them into unreadable mush (read 0/3, output garbled
fragments like "ESEzoss"). Frontier encoders normalize/blend RGB; they do not expose a
per-channel reading path. Separable colors would need separate SPACE = no density gain.
VERDICT: dead end. Color is not a free data channel for these encoders.

INSIGHT SPAWNED: the encoder blends spatially-overlapping signal. So the real lever is
SPATIAL efficiency (how few pixels per legible char), not spectral. Redirect to glyph
geometry + provider tile-billing (T3) where the pixels->tokens map is the actual constraint.

## T3: PROVIDER-TUNED GEOMETRY — MAJOR BREAKTHROUGH (Gemini)
Measured real billed-tokens(w,h). AXIOM A3 (px/750 universal) is FALSE.

**Gemini bills ~1080 tokens FLAT from 0.59 Mpx to 25 Mpx** (tested 6144x4096).
Image size is nearly free on Gemini — only readability limits density.

narrow-baseline's 1568x728 page is tuned for Claude's px/750 billing. On Gemini it wastes money by
splitting into multiple flat-billed pages. Fix: ONE wide page per doc.

Head-to-head, 22,138-char corpus, Gemini 3.1 Pro:
| geometry | pages | billed tok | density | accuracy |
|---|---|---|---|---|
| narrow-baseline (1568w,728h) | 2 | 2093 | 10.6 | 5/5,5/5,5/5 |
| Nyx-opt (wide 1pg 2348w) | 1 | 1053 | 21.0 | 4/5,4/5,4/5 |

**>>> 50% FEWER TOKENS than narrow-baseline on Gemini** (accuracy 4/5 vs 5/5 — tune needed).

Readability ceiling at flat billing (single page): ~22k chars = 5/5, ~29k = 2/5. Knee ~22-24k.

### T3 TUNED — the Nyx-Gemini optimum (5/5 accuracy, 49% fewer tokens)
Single page, varied width, 22k corpus, Gemini 3.1 Pro:
| width | billed tok | density | accuracy |
|---|---|---|---|
| 1568 (narrow-baseline) as 1pg | 1100 | 20.1 | 4/5,3/5 |
| 1808 | 1071 | 20.7 | 5/5,5/5 ✅ |
| **2048** | **1065** | **20.8** | **5/5,5/5** ✅ WINNER |
| 2348 | 1053 | 21.0 | 4/5,4/5 |

**WINNER: single 2048px-wide page = 1065 tok @ 5/5, vs narrow-baseline 2093 tok = 49% FEWER.**
Rule for Gemini: pack the whole doc into ONE ~2048px-wide page (up to ~22k chars),
exploiting flat-tile billing. Narrower (1568) or wider (2348) both lose accuracy.

## T7: SALIENCE-MASKED RENDERING (from VIST PVE) — WORKS
Strip stopwords before render -> fewer chars -> larger legible glyphs after downsample.
Prose corpus 22,780 chars, Gemini 3.1 Pro, single 2048px page:
| render | billed | accuracy |
|---|---|---|
| FULL text | 1050 | 4/7 |
| SALIENCE-compressed (71% of chars) | 1079 | **6/7** |
Salience masking IMPROVES accuracy at ~same token cost (fewer chars = more legible glyphs).
Validated frozen-API adaptation of VIST's function-word masking.

## T8: COMBINED PIPELINE (T3 geometry + T7 salience) — synthesis loop
Regime matters:
- Small doc (40k, fits 1 page): T3 geometry alone = 1113 tok @ 5/5 vs narrow-baseline 2162 (48% fewer).
  Salience adds nothing (already 1 page), slightly hurts. -> use geometry only.
- Large doc (81k, over readable limit): 
  | method | billed | acc |
  |---|---|---|
  | narrow-baseline (4 pages) | 4388 | 2/5 |
  | T3 geometry only (1 crammed pg) | 1073 | 1/5 (unreadable) |
  | **T8 salience+geometry** | 1100 | **3-4/5** |
  -> **75% fewer tokens than narrow-baseline AND better accuracy.** Salience rescues readability.

RULE: doc <= readable-page -> geometry only. doc > readable -> add salience (or split pages).

## T8b: FINAL SYNTHESIZED PIPELINE — the Nyx-Gemini method
Large doc (35.5k full / 29k salience), Gemini 3.1 Pro:
| method | pages | billed | accuracy |
|---|---|---|---|
| narrow-baseline | 4 | 4388 | 2/5 |
| **Nyx (salience + 2048w + 22k/page split)** | 2 | **2151** | **5/5** |
**>>> 51% fewer tokens AND perfect accuracy where narrow-baseline fails.**

### THE NYX METHOD (frozen commercial VLM, no training) — beats narrow-baseline
1. Salience-compress: drop stopwords (VIST PVE, frozen-API adaptation).
2. Geometry: 2048px-wide pages (not narrow-baseline's 1568) — tuned to Gemini flat-tile billing (T3).
3. Split at ~22k chars/page (readability knee, T1) — extra pages ~free on Gemini's flat billing.
Result: 49-75% fewer tokens than narrow-baseline across doc sizes, equal-or-better accuracy on Gemini.
Provenance: novel synthesis of T1(density knee)+T3(provider billing)+T7(salience/VIST) that
narrow-baseline never exploited (it's Claude-tuned, single-geometry, no salience).

## T3 CROSS-PROVIDER billing (CRITICAL — the axiom fully mapped)
Billed image tokens by geometry, measured live:

| WxH | Mpx | Gemini 3.1 | Opus 4.8 | GPT-5.4 |
|---|---|---|---|---|
| 768x768 | 0.59 | 1089 | 787 | 692 |
| 1568x728 (narrow-baseline) | 1.14 | 1078 | 1459 | 1353 |
| 2048x768 | 1.57 | 1080 | 2075 | 1844 |
| 2048x2048 | 4.19 | 1089 | 4764 | 2805 |
| 4096x2048 | 8.39 | 1081 | 4235* | 2340* |
| 6144x4096 | 25.17 | 1080 | 4707* | 2692* |
(* = past the provider's internal resample cap; tokens plateau as image is downscaled)

### THREE DIFFERENT BILLING REGIMES — one method cannot be optimal for all:
- **Gemini: FLAT ~1080 tokens regardless of size.** Pack as big/wide as readable. Extra
  pages nearly free. THE big opportunity. Nyx-Gemini method exploits this.
- **Opus 4.8: scales ~px/750 up to ~1.15Mpx, then caps ~4700.** narrow-baseline's 1568x728 is
  correctly tuned here. To save on Opus, minimize pixels -> SMALL dense pages (opposite of Gemini!).
- **GPT-5.4: scales with px, caps ~2700.** Similar to Opus; small pages win.
- GPT-5.5 is Responses-API only (not testable via chat/completions here).

### IMPLICATION: Nyx must be PROVIDER-ADAPTIVE.
- Gemini -> wide flat-billed pages (our 49-75% win).
- Opus/GPT -> narrow-baseline-style minimal-pixel pages (narrow-baseline already near-optimal there; our T1
  density-knee backoff to ~22k/page is the only improvement).

## CRITICAL FINDING — readability depends on the model's vision encoder
Tested Opus 4.8 and GPT-5.4 across ALL densities, including LOW density (3000 chars/page,
large glyphs):
| provider | cap3000 (big glyphs) | cap6000 | cap12000 |
|---|---|---|---|
| Opus 4.8 | 1/5 | 0/5 | 0/5 |
| GPT-5.4 | 0/5 | 0/5 | 0/5 |

Opus and GPT CANNOT read narrow-baseline's 5x8 bitmap-atlas glyphs at ANY density. This is not a
density or method problem — their vision encoders don't OCR this synthetic bitmap font.
(Gemini 3.1 Pro reads it fine — 5/5 at 22k/page.)

### Consequence for the thesis
- Nyx (and narrow-baseline's whole approach) is effectively a **Gemini-3.1-Pro-only** technique with
  the current bitmap atlas. On Opus/GPT it saves ~15-18% tokens but at 0/5 accuracy = useless.
- narrow-baseline's own docs already flagged Opus as weak; our data shows it's not weak, it's ~zero
  on this atlas. The earlier "Opus 7/7" wins were on ANTI-ALIASED real-font renders through
  Agency's Read (different path), NOT this bitmap atlas.
- OPEN QUESTION (new thesis T9): does a real anti-aliased TrueType render (not the 5x8 atlas)
  unlock Opus/GPT? If yes, the method generalizes. If no, it's Gemini-strongest forever.

## T9: glyph-SIZE is the Opus/GPT unlock (not atlas type) — FULL cross-provider verdict
Cell-size sweep, small corpus, Gemini vs Opus vs GPT:
| cell px | Gemini density@acc | Opus acc | GPT acc |
|---|---|---|---|
| 5x8 (narrow-baseline) | 21 @ 5/5 | 2/5 | 0/5 |
| 7x10 | - | 1/5 | 2/5 |
| 9x12 | - | 4/5 | 0/5 |
| 11x14 | - | **5/5 @ density 5.1** | 0/5 (capped) |

### FINAL VERDICT — provider capability is the real axis
- **Gemini 3.1 Pro**: reads tiny 5x8 glyphs. Density ~21 char/tok. Flat billing. THE platform
  for optical text compression. Nyx method wins 49-75% vs narrow-baseline here.
- **Opus 4.8**: CAN read, but needs ~11x14 glyphs -> density only ~5 char/tok, and pixel-scaled
  billing. Net: optical barely breaks even vs text on Opus. Marginal at best.
- **GPT-5.4**: effectively CANNOT reliably OCR synthetic renders at any size (erratic 0-2/5).
  Optical text compression does NOT work on GPT. Use text.

### The single most important thing we learned
narrow-baseline/Nyx optical compression is NOT a general technique. It is a **Gemini-3.1-Pro
capability**. The 49-75% wins are real but Gemini-strongest. On Opus the savings are lower.
This is the honest boundary of the whole approach — and neither narrow-baseline nor we can change it
without the providers improving their vision encoders.
