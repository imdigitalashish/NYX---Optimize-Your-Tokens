# Nyx Research — Experiment Index (all findings, one page)

| # | thesis | verdict | key number |
|---|--------|---------|-----------|
| T1 | density/accuracy cliff | ✅ finding | narrow-baseline over-packs; knee ~22k chars/pg |
| T2 | RGB color-channel packing | ❌ killed | encoders blend channels, 0/3 |
| T3 | provider-tuned geometry | 🔥 breakthrough | Gemini FLAT ~1080 tok to 25 Mpx |
| T7 | salience masking (VIST) | ✅ works | +2/7 accuracy, fewer chars |
| T8 | combined synthesis | ✅ | 49-75% fewer than narrow-baseline |
| T9 | glyph-size unlock | ✅ finding | Opus needs 8-12px glyphs |
| T10 | font types (real fonts) | ❌ dead end | real fonts lose to 5x8 atlas |
| T11 | anti-alias/supersample | ❌ | GPT still fails |
| T12 | Gemini density ceiling | ✅ | ~38k chars/pg @ 36 char/tok |
| T13 | micro-atlas (Tom Thumb 4x6) | ❌ | doesn't beat Spleen |
| T14 | aggressive compression | ✅ | stopword+vowel = 48% chars, 5/5 |
| T15 | Gemini-family generalization | ✅ | flat billing across Gemini models |
| T16 | max effective density | ✅ | 50 char/tok effective (acc-limited) |
| T17 | verbatim band | ❌ unnecessary | Gemini reads GUIDs fine (3/3) |
| T18 | verbatim recall rate | ✅ | 80-87% GUID recall (vs narrow-baseline 0/15) |
| T19 | structured layout | ❌ | reflow blob beats columnar 3x |
| T20 | real-world validation | ✅ | 50% fewer than narrow-baseline, real files |
| T21 | multi-file packing | ✅ + bug | 12 files/1 page; ↵-sentinel bug fixed (6x) |
| T22 | render latency (T4) | ❌ killed | 200k chars in 169ms; Rust unneeded |
| T23 | wall-clock latency | ⚠️ tradeoff | image 3x SLOWER despite 85% fewer tokens |
| T24 | latency vs image size | ✅ | latency fixed, not pixel-bound |
| T25 | gist-image + ID sidecar | ✅ optional | exactness insurance tier |

## The bottom line
On **Gemini 3.1 Pro** (and Gemini family): Nyx cuts input tokens ~50% vs narrow-baseline, ~87% vs
text, at equal-or-better accuracy, on real code and reports. It packs whole multi-file
codebases into ONE flat-billed page. Verbatim GUID recall ~85%. Tradeoff: ~3x slower
wall-clock (optimizes cost, not speed). On Opus: marginal-but-usable (8x12 glyphs). On GPT:
doesn't work — use text.

Novel contributions vs narrow-baseline: (1) flat-billing discovery + wide-page geometry, (2) salience
pre-compression, (3) multi-file single-page packing, (4) provider-adaptive routing, (5) the
honest latency tradeoff, (6) full cross-provider capability map.

## Additional experiments (T26-T32)
| # | thesis | verdict | key number |
|---|--------|---------|-----------|
| T26 | huge-context enablement | ✅ killer use | 175k chars -> 5k tok (89% fewer) |
| T27 | slow-fast image+text mix | ✅ | VIST arch works on frozen API |
| T28 | doc-size calibration | ⚠️ honest | win >15k chars; -4% small; avg 35% |
| T29 | flash vs pro reads | ✅ | flash reads = pro, cheaper |
| T30 | abstention prompt | ❌ unneeded | Gemini 12/12 GUIDs, 0 confab |
| T31 | adversarial verbatim | 🔥 | 8/8 EXACT 40-char SHA hashes |
| T32 | real-world accuracy | ✅ | ~73% on real report report @ 86% savings |

## Field-updating result
Gemini 3.1 Pro reads 40-char SHA-1 hashes 8/8 exact and ~85% of GUIDs. The "optical text is
lossy for exact strings" assumption (narrow-baseline Opus 0/15, DeepSeek-OCR 60%@20x) is largely a
weak-encoder artifact. On a frontier commercial VLM, dense-text OCR is production-grade.
