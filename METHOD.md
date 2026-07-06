# The Nyx Method (v2) — provider-adaptive optical text compression

Synthesized from 13 experiments (T1-T13). This is the method.

## The core discoveries
1. **Image-token billing is provider-specific** (T3, measured live):
   - Gemini 3.1 Pro: FLAT ~1080 tok from 0.6 to 25 Mpx. Size is free.
   - Opus 4.8 / GPT: scale ~px/750 up to ~1.15 Mpx, then cap.
2. **Vision-encoder OCR ability is the binding constraint, not font/geometry** (T9-T13):
   - Gemini reads dense 5x8 glyphs (density ~36 char/tok ceiling at ~38k chars/page).
   - Opus reads only at 8x12+ (density ~7.4).
   - GPT effectively cannot OCR synthetic renders (dead).
3. **Salience masking works on frozen APIs** (T7, from VIST): drop stopwords pre-render.
4. **Font engineering is a dead end** (T10, T13): Spleen 5x8 is already near-optimal
   legibility-per-pixel; real fonts and micro-atlases don't beat it.

## The adaptive method (per provider)
- **Gemini 3.1 Pro** -> ONE ~2048-2348px-wide page, native 5x8 AA, up to ~38k chars/page,
  salience-compress if larger. Result: ~49% fewer tokens than the narrow baseline, ~88% vs text.
- **Opus 4.8** -> 8x12 AA cells, ~22k chars/page, minimal pixels. Result: makes it WORK
  (dense 5x8 = 1/5 garbage on Opus; Nyx 8x12 = 5/5). Density ~7.4.
- **GPT / others / unknown** -> DO NOT image. Pass through as text (optical fails).

## The frozen boundary
Optical text compression is strongest on Gemini 3.1 Pro; Opus 4.8 works at lower savings.
On GPT it fails. This is set by provider vision encoders; no rendering trick changes it.
