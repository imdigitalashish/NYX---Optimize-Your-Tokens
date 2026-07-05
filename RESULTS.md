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
