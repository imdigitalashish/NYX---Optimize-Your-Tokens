# Nyx 10-Task Benchmark — Gemini 3.1 Pro vs Opus 4.8 (10 DISTINCT real tasks)

*Ten genuinely different work documents across three investigation types — report investigation, SLI
design, and TTO reduction — run through Nyx v2.4. Ground-truth questions verified from
episodic memory. All tokens live-measured.*

## The 10 distinct tasks
- **3 report investigation reports:** report-1 (LM misroute), report-3 (NIC link fault), report-2 (subsystem-x)
- **3 SLI design documents:** design-doc-4, design-doc-5 (77k chars!), design-doc-6
- **4 TTO reduction action-items:** doc-7 (module-a), doc-8 (module-b), doc-9 (OpenAI Tenant), doc-10 (OpenAI Stream)

Size range: 9k → 77k chars. Different topics, formats, and question types per doc.

## Per-task results

| # | Task | chars | text tok~ | Gemini tok | Gem acc | Opus tok | Opus acc |
|---|------|------:|------:|------:|:--:|------:|:--:|
| 1 | report report-1 (LM misroute) | 22655 | 6473 | **1053** | 3/3 | 2904 | 3/3 |
| 2 | report report-3 (NIC link fault) | 18762 | 5361 | **1056** | 3/3 | 2418 | 2/3 |
| 3 | report report-2 (subsystem-x) | 22090 | 6311 | **1053** | 1/3 | 2904 | 2/3 |
| 4 | SLI design-doc-4 | 35926 | 10265 | **2206** | 3/3 | 4560 | 3/3 |
| 5 | SLI design-doc-5 | 77339 | 22097 | **4389** | 2/2 | 9810 | 2/2 |
| 6 | SLI design-doc-6 | 29910 | 8546 | **2177** | 2/2 | 3801 | 2/2 |
| 7 | TTO doc-7 module-a | 9420 | 2691 | 1098 | 2/2 | 1245 | 2/2 |
| 8 | TTO doc-8 module-b | 10425 | 2979 | 1053 | 2/2 | 1383 | 2/2 |
| 9 | TTO doc-9 OpenAI Tenant | 8925 | 2550 | 1000 | 2/2 | 1176 | 2/2 |
| 10 | TTO doc-10 OpenAI Stream | 10445 | 2984 | 1053 | 2/2 | 1383 | 1/2 |

## Aggregate (10 distinct tasks, 24 questions)

| metric | Gemini 3.1 Pro | Claude Opus 4.8 |
|---|---|---|
| Total text tokens (est) | 70,257 | 70,257 |
| **Total image tokens** | **16,138** | 31,584 |
| **Savings vs text** | **77% fewer** | **55% fewer** |
| **Accuracy** | **22/24 (92%)** | **21/24 (88%)** |
| Token cost vs the other model | 1.0x | **2.0x more** |

## Findings

1. **Gemini: 77% fewer tokens than text at 92% accuracy** across diverse real docs. The big
   win is on large docs — the 77k-char SLI doc cost Gemini just **4,389 tokens** (vs 22k as
   text, an 80% cut) because of flat-tile billing.

2. **Opus: 55% fewer tokens at 88% accuracy** — works well, but costs **2.0x Gemini's tokens**
   for identical tasks. On the 77k SLI doc Opus paid **9,810 tokens** (pixel-billed, multi-page)
   vs Gemini's 4,389. The pixel-billing penalty compounds on large docs.

3. **Accuracy is high and close (92% vs 88%).** The misses were concentrated on task 3
   (report-2 — deeply-nested node/region facts buried in dense tables) and a couple of TTO
   nuances — not systematic. Both models nailed all SLI-design and most report/TTO questions.

4. **Doc type doesn't break it.** report investigation, SLI design, and TTO action-items all read
   reliably — the method generalizes across your real investigation document types.

## Bottom line

Across **10 genuinely distinct real tasks** (report + SLI + TTO, 9k–77k chars):
- **Gemini 3.1 Pro is the clear choice: 77% fewer tokens, 92% accuracy.**
- **Opus 4.8 works at 88% accuracy but costs 2x the tokens** — viable fallback, not cost-optimal.
- On large documents the gap widens sharply (Gemini's flat billing vs Opus's pixel billing).
