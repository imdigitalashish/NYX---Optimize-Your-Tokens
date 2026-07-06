# Nyx 10-Task Benchmark Report — Gemini 3.1 Pro vs Claude Opus 4.8

*Ten real work documents (report investigation reports + TTO investigation one-pagers from prior
sessions), run through the Nyx v2.4 provider-adaptive renderer. Ground-truth questions
verified from episodic memory. All tokens live-measured; accuracy graded against known facts.*

## Setup
- **Tasks:** 4 real report investigation reports (report-1, report-3, report-2 x2) + 6 real TTO
  reduction one-pagers. All authored in prior investigation sessions.
- **Method:** each doc rendered with Nyx (Gemini profile: wide flat-billed page; Opus profile:
  8x12 glyphs), then asked 2-4 ground-truth questions per doc.
- **Measured:** image tokens billed (live), accuracy vs known answers, pages.

## Per-task results

| # | Task | chars | text tok~ | Gemini tok | Gem acc | Opus tok | Opus acc |
|---|------|------:|------:|------:|:--:|------:|:--:|
| 1 | report report-1 (LM misroute) | 22655 | 6473 | **1053** | 4/4 | 2904 | 4/4 |
| 2 | report report-3 (NIC link fault) | 18762 | 5361 | **1056** | 4/4 | 2418 | 4/4 |
| 3 | report report-2 (subsystem-x) | 22090 | 6311 | **1053** | 4/4 | 2904 | 4/4 |
| 4 | report report-2 (claude report) | 12818 | 3662 | **1060** | 2/2 | 1659 | 2/2 |
| 5 | TTO one-pager doc-7 | 9463 | 2704 | 1098 | 2/2 | 1245 | 2/2 |
| 6 | TTO one-pager 755981689 | 12536 | 3582 | 1080 | 2/2 | 1590 | 2/2 |
| 7 | TTO one-pager doc-8 | 7602 | 2172 | 1080 | 2/2 | 969 | 2/2 |
| 8 | TTO one-pager doc-9 | 7926 | 2265 | 1080 | 1/2 | 1038 | 1/2 |
| 9 | TTO one-pager 759789961 | 8527 | 2436 | 1024 | 2/2 | 1107 | 2/2 |
| 10 | TTO one-pager 760373336 | 9310 | 2660 | 1000 | 1/2 | 1176 | 1/2 |

## Aggregate

| metric | Gemini 3.1 Pro | Claude Opus 4.8 |
|---|---|---|
| Total image tokens (10 tasks) | **10,584** | 17,010 |
| Total text tokens (est) | 37,626 | 37,626 |
| **Token savings vs text** | **72% fewer** | **55% fewer** |
| Average accuracy | **90%** | **90%** |
| Tokens vs the other model | 1.0x (baseline) | **1.6x more** |

## Findings

1. **Both models saved a lot of tokens at equal accuracy (90%).** The method works on both —
   this corrects earlier pessimism about Opus (with the 8x12 glyph profile it reads reliably).

2. **Gemini is far cheaper: 72% vs 55% token savings, and 1.6x fewer tokens than Opus** for
   identical tasks. This is the flat-billing advantage — Gemini bills ~1053-1098 tokens per
   doc regardless of size, while Opus scales with pixels (2418-2904 on the big report reports).

3. **Accuracy was identical (90%) on both models.** The 2 misses (tasks 8, 10) were the same
   on both — a "does it recommend shrinking the window" nuance the docs phrase indirectly, not
   a rendering failure. On the report reports (dense, identifier-heavy), both hit 4/4.

4. **Big docs favor Gemini most.** On the three 18-22k report reports, Opus paid 2418-2904 tokens
   (2-3 pages, pixel-billed) vs Gemini's flat ~1053 (1 page). On small one-pagers the gap
   narrows (Opus even slightly cheaper on the 7.6k doc, since few pixels).

## Bottom line

On 10 real investigation documents:
- **Gemini 3.1 Pro: 72% fewer tokens than text, 90% accuracy** — the clear winner.
- **Opus 4.8: 55% fewer tokens than text, 90% accuracy** — works well too, but costs 1.6x
  Gemini's tokens because of pixel-based image billing.
- Use **Gemini for cost-optimal Nyx**; Opus is a viable fallback at equal accuracy but higher
  token cost. Both are real wins over sending these docs as text.
