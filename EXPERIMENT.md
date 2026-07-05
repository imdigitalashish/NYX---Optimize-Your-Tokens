# Nyx hill-climb log (git-checkpointed, revert-on-regression)

Score = mean over corpus of per-item [50 neutral + savings_bonus − accuracy_loss_penalty].
50 = safe text passthrough. >50 = net win. Model: claude-opus-4.8. 2-trial image accuracy.

| iter | change | score | action |
|------|--------|------:|--------|
| 0 | naive: reflow everything ≥6k chars, no gate | −18.75 | baseline |
| 1 | legibility cap 9000 chars/page | 10.73 | ✓ KEEP |
| 2 | anti-aliased grayscale glyphs | 0.00 | ✗ revert |
| 3 | **content-adaptive reflow** (sparse=pack, dense=one-line/row) | 55.45 | ✓ KEEP (breakthrough) |
| 4 | **+ reflow page cap 12000** | ~73.65* | ✓ KEEP (champion) |
| 5 | + cap dense content too | regress (16 pages) | ✗ revert |
| 6 | multi-column packing for sparse | 64.75 | ✗ revert |
| 7 | reflow cap 9000 | 66.15 | ✗ revert |
| 8 | reflow cap 15000 | 68.30 | ✗ revert |
| 9 | strip markdown + collapse spaces | 45.28 | ✗ revert |
| 10 | strip separator rows only | 61.33 | ✗ revert |
| 11 | renderDensePages shrink=true | 51.43 | ✗ revert |

*iter4 reproduced at 66.15 / 70.45 / 73.65 across 3 runs (mean ~70, ±variance).

## Winning strategy (iter4)
- Skip content < 6000 chars (imaging small content loses on fixed image-token floor).
- Measure avg non-empty line length:
  - **sparse** (<60 ch/line, e.g. source code) → reflow-pack + 12000 chars/page cap.
  - **dense** (≥60 ch/line, e.g. reports, tables, prose) → NO reflow, one line per row.
- Result: Task 1 (dense doc) 7/7 accuracy @ 46% savings; large code 4.5/5 @ 82% savings;
  small code 4/4 @ 84% savings.

## Key lessons
1. The single biggest lever was **content-adaptive reflow** (iter3): reflow helps sparse
   code but DESTROYS dense reports (crams 22k chars → 1 unreadable page → 0/7 accuracy).
2. Over-compression is the main accuracy killer, not glyph rendering. AA, multi-col,
   markdown-stripping, width-shrink all failed to beat plain adaptive reflow + page cap.
3. Scores have ~±10-15 pt run-to-run variance (model nondeterminism); 2-trial averaging
   and reproducing the champion across runs is necessary to avoid chasing noise.
