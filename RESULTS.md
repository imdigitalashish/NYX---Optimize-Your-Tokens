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

## T10: FONT-TYPE experiment + Opus optimum — REAL fonts LOSE to compact atlas
Real fonts (Consolas/Cascadia/Courier via headless browser) on Opus 4.8:
- All read 5/5 easily BUT density only ~2.2-3.2 char/tok (browser renders big, pixel-billed).
- Real fonts do NOT help Opus density — they're less pixel-efficient than the bitmap atlas.

Opus atlas cell-size floor (3 trials, the REAL Opus optimum):
| cell px | density | accuracy |
|---|---|---|
| 7x10 | 10.3 | 1/5,3/5,1/5 (unreliable) |
| 7x12 | 8.4 | 4/5,5/5,4/5 |
| **8x12** | **7.4** | **5/5,5/5,5/5** ← Opus WINNER |
| 10x14 | 5.1 | 5/5,5/5 |
| real Consolas 7px | 3.2 | 5/5 |

### CORRECTED Opus verdict (better than before!)
- Earlier I said Opus needs 11x14 (density 5.1). WRONG — tuning finds **8x12 = density 7.4**,
  reliable 5/5. That's 45% denser than my first Opus conclusion.
- Real fonts are a DEAD END for density (browser pixels too big). The compact bitmap atlas
  at 8x12 is the Opus optimum.
- Opus final: density ~7.4 char/tok (vs Gemini ~21, vs narrow-baseline's 5x8 which Opus reads at ~1/5).
- So Nyx DOES beat narrow-baseline on Opus: narrow-baseline's 5x8 = garbage (1/5); Nyx 8x12 = 5/5 at density 7.4.

## T11/T12: glyph floor + Gemini's TRUE density ceiling — REFINED
T11 (AA/supersample): GPT-5.4 stays 0-1/5 at all cell sizes/AA. GPT is a hard dead-end.
T12 (downscale probe): Gemini reads glyphs down to ~3.5x5.6px at 5/5 (well below 5x8 native).
  But density is capped by FLAT BILLING, not glyph size — downscaling a 1-page image saves
  nothing (already flat ~1054 tok).

### Gemini TRUE density ceiling (one flat-billed 2348px-wide page, 2 trials):
| chars | billed | density | accuracy |
|---|---|---|---|
| 38,398 | 1054 | **36.4** | 5/5, 5/5 ✅ CEILING |
| 48,016 | 1064 | 45.1 | 1/5, 2/5 ❌ |
| 57,847 | 1071 | 54.0 | 2/5, 2/5 ❌ |

**Gemini real ceiling: ~38k chars @ density 36.4 char/tok in ONE ~1054-token page.**
(My earlier "21" was on a smaller corpus — density rises with corpus size until the ~40k
readability cliff, because billing is flat.) This is ~2.6x narrow-baseline's ~14 char/tok.

Optimal Gemini config: 2348px-wide single page, ~38k chars max, native 5x8 AA glyphs.

## DEFINITIVE head-to-head (39.8k-char prose doc, Gemini 3.1 Pro, 3 trials)
| method | pages | billed | vs text | accuracy |
|---|---|---|---|---|
| TEXT | - | 9435 | - | 5/5 (trivial) |
| narrow-baseline | 2 | 2180 | -77% | 3/5,3/5,3/5 |
| **Nyx (salience+2348w+38k page)** | 1 | **1110** | **-88%** | 3/5,3/5,3/5 |

**>>> Nyx = 49% fewer tokens than narrow-baseline at EQUAL accuracy (both 3/5).**
**>>> Nyx = 88% fewer tokens than plain text.**
On Gemini this is the money result: half of narrow-baseline's cost, no accuracy loss.
(Both at 3/5 on hard dense prose — the accuracy ceiling is the encoder, same for both;
Nyx's advantage is purely token efficiency via flat-billing geometry + salience.)

## T13: VLM-optimized micro-atlas (Tom Thumb 4x6) — tested, does NOT beat Spleen
Built a real 4x6 hand-designed bitmap font (Tom Thumb, public domain) — crisp & legible
(unlike downsampled Arial/Consolas which were garbage).

Gemini (flat billing): micro-atlas reads ~3/5 at density ~36 — SAME as Spleen. No gain,
because Gemini billing is flat regardless of pixels; smaller glyphs don't reduce tokens.

Opus (pixel billing, 3 trials):
| render | density | accuracy |
|---|---|---|
| TomThumb 4x6 s2 gap0 (tight) | 6.2 | 4/5,4/5,4/5 |
| TomThumb 4x6 s2 gap1 rg2 | 4.6 | 5/5,5/5,5/5 |
| **Spleen 8x12 (incumbent)** | **7.3** | **5/5,5/5,5/5** ✅ still best |

VERDICT: micro-atlas does NOT beat Spleen 5x8/8x12 on either provider. Spleen is already
near-optimal legibility-per-pixel. The binding constraint is the vision ENCODER's OCR
ability, not the font design — a better font can't fix what the encoder can't resolve.
Font engineering is a DEAD END; the wins are in billing-geometry (T3) + salience (T7).

## T14: aggressive pre-render compression — stopwords + vowel-drop wins
Prose 40k chars, Gemini 3.1 Pro, single-page target:
| compressor | chars | billed | accuracy |
|---|---|---|---|
| none | 40031 (100%) | 2007 | 2/5,2/5 |
| stopwords | 24793 (62%) | 1092 | 4/5,5/5 |
| dropvowels | 33366 (83%) | 1072 | 4/5,5/5 |
| **both (stopwords+vowels)** | **19022 (48%)** | **1056** | **5/5,5/5** |
"both" halves the chars -> fits 1 flat-billed page -> 5/5 AND 47% cheaper than uncompressed.
Gemini reconstructs facts from vowel-dropped abbreviated text fine. Big lever for large docs.

## T15: Gemini family generalization — flat billing holds across Gemini models
gemini-3.5-flash: FLAT ~1080 tok (0.6-17 Mpx, same as 3.1-pro). Readability density 17.7 @ 4/5.
The flat-billing + optical-readability property is a GEMINI-FAMILY trait, not just 3.1-pro.
Method applies to gemini-3.1-pro (best), gemini-3.5-flash (cheaper), likely all Gemini vision.

## T16: max effective density — compression extends the ceiling
Compress (stopword+vowel) then pack: original 53.8k chars -> 29.8k -> ONE page -> effective
density 50.5 char/tok (but acc drops to 2-3/5 at that extreme). The rendered-char cliff (~40k
per page) is fixed; compression lets MORE ORIGINAL content fit under it. Best reliable point:
~40k original chars/page at 5/5 with compression, ~36 char/tok effective. Beyond = accuracy loss.

## T17/T5: hybrid verbatim band — UNNECESSARY on Gemini (reads GUIDs fine at normal density)
Dense-only render: 3/3 exact GUIDs/hashes read correctly on Gemini 3.1 Pro.
Adding a large-glyph 'verbatim band' HURT (2/3, +extra page, 2x tokens — confused the model).
Gemini's OCR is strong enough for verbatim IDs at normal density. The confabulation problem
(from narrow-baseline's Opus-era findings) is a WEAK-ENCODER problem, largely absent on Gemini 3.1 Pro.
-> No verbatim band needed for Gemini. (Would still help on Opus — untested, low priority.)
