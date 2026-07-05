---
name: nyx
description: Use when the user asks to work in "nyx" mode, "token-saving mode", or asks to analyze/read/review large files, codebases, logs, or reports while minimizing token usage. Nyx renders bulky text as dense PNG images that the agent reads instead of raw text, cutting input tokens ~45% on dense reports and ~80% on source code. Lossy for exact identifiers — use only for comprehension/reasoning over bulk, and only on capable vision models (claude-opus-4.8, gemini-3.1-pro-preview).
---

# Nyx — read bulk as images to save tokens

## When to use
Activate when the user says things like:
- "using nyx, …" / "nyx mode" / "token-saving mode"
- "read/analyze/review these large files (or this log/report) cheaply"
- any large-context comprehension task where saving input tokens matters

Do NOT use Nyx when the user needs byte-exact values (exact GUIDs, SHAs, hashes,
secrets, precise long numbers). Imaged text is lossy — those can be misread. For
byte-exact work, Read the file as text normally.

## Preconditions
- Current model should be `gemini-3.1-pro-preview` (best) or `claude-opus-4.8`. On weaker
  models, imaged text reads poorly — warn the user and prefer normal text reads.
- Nyx's renderer is `render.mjs`, located in **this skill's own directory** (the same
  folder as this SKILL.md). Resolve that folder's absolute path and call it `NYX`.
  (If installed as a plugin, a copy also exists at the plugin root — either works.)

## Procedure

1. **Identify the target files.** Resolve the file paths the user wants analyzed
   (expand globs yourself into a concrete list). Prefer large files (>6k chars);
   Nyx auto-skips smaller ones.

2. **Render them to images.** Run, from the working directory:
   ```
   node "$NYX/render.mjs" --out .nyx-cache <file1> <file2> ...
   ```
   This writes dense PNG pages into `.nyx-cache/` and prints a MANIFEST telling you
   exactly which page image(s) correspond to which source file, plus each file's
   char/line counts.

3. **Read the manifest.** For every file marked `imaged`, note its page list. For
   files marked `SKIPPED`, Read them normally as text (they were too small to help).

4. **Read the page images.** Use your built-in Read tool to open each
   `.nyx-cache/nyx_pNNN.png` page — Read handles PNGs as images. These pages ARE the
   file contents, rendered densely (the ↵ glyph marks original line breaks in packed
   pages). Reason over them to answer the user's question.

   **CRITICAL — do NOT crop, zoom, enlarge, re-render, or create new image files from
   these pages.** The pages are rendered at the correct resolution for the vision
   encoder; cropping them wastes large amounts of tokens and time and defeats Nyx's
   entire purpose. Read each page ONCE, as-is. If a page is genuinely unreadable for a
   value you need, do a single plain text Read of the original file for that one value —
   never a crop/zoom loop.

5. **Answer.** Base your analysis on what you read from the images. Cite file names
   and approximate line locations from the manifest.

6. **Byte-exact fallback.** If at any point you need an exact identifier, hash, or
   precise value that must be correct, Read that one original file as text — do not
   guess it from the image.

## What Nyx does under the hood (so you trust the pages)
- Files < 6000 chars are skipped (imaging them wastes tokens) and should be read as text.
- Sparse content (source code, short lines) is reflow-packed at 12000 chars/page.
- Dense content (reports, tables, long lines) is rendered one line per row for legibility.
- Pages are 1568px wide, sized to fit the vision encoder's resample cap.

## Report to the user (optional but encouraged)
After finishing, you may note how many files were imaged vs skipped, and that Nyx
traded some verbatim precision for a large input-token saving.
