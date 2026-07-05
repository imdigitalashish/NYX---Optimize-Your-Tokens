#!/usr/bin/env node
/**
 * Nyx render.mjs v2 — provider-adaptive optical text compression.
 *
 * Backed by 14 live experiments (see research branch). Key findings applied:
 *  - Gemini 3.1 Pro bills image tokens FLAT (~1080) up to 25 Mpx -> pack ONE wide page,
 *    up to ~38k chars, density ceiling ~36 char/token. ~49% fewer tokens than the old
 *    1568px geometry, ~88% fewer than text.
 *  - Opus 4.8 bills ~px/750 and needs bigger glyphs -> 8x12 cells, ~22k chars/page.
 *  - GPT & unknown models can't reliably OCR synthetic renders -> pass through as text.
 *  - Optional pre-render compression (stopwords + vowel-drop) halves chars, keeps facts,
 *    lets big docs fit one page (accuracy improves, tokens drop).
 *
 * Usage:
 *   node render.mjs [--out DIR] [--provider gemini|opus|auto] [--compress] <files...>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderTextToPngsWithCharLimit, reflow, DENSE_CONTENT_COLS } from './vendor/nyx-render.bundle.js';

// ---- provider profiles (from measured billing + readability) ----
const PROFILES = {
  gemini: { cols: 468, maxCharsPerPage: 38000, cellWBonus: 0, cellHBonus: 0, maxHeightPx: 4096, alwaysReflow: true, note: 'flat billing: one wide dense page' },
  opus:   { cols: 240, maxCharsPerPage: 22000, cellWBonus: 3, cellHBonus: 4, maxHeightPx: 2048, note: 'pixel billing: bigger glyphs, minimal pixels' },
};
const MIN_CHARS = 6000;
const SPARSE_LINE_THRESHOLD = 60;

// ---- optional pre-render compression (T7/T14) ----
const STOP = new Set('the a an is are was were be been being to of in on at for and or but with that this it its as by from has have had will would can could should may might must not no over currently'.split(' '));
function compressText(text) {
  return text.split('\n').map((line) => {
    return line.split(/\s+/).map((w) => {
      const bare = w.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (STOP.has(bare)) return '';                       // drop stopwords
      if (/[0-9]/.test(w) || w.length <= 3) return w;      // keep numbers, short/IDs verbatim
      return w.replace(/(?<!^)[aeiou]/gi, '');             // drop non-initial vowels
    }).filter(Boolean).join(' ');
  }).join('\n');
}

function parseArgs(argv) {
  const files = []; let out = '.nyx-cache', provider = 'gemini', compress = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--provider') provider = argv[++i];
    else if (a === '--compress') compress = true;
    else files.push(a);
  }
  return { files, out, provider, compress };
}

function avgLineLen(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.length ? lines.reduce((a, l) => a + l.length, 0) / lines.length : 0;
}

async function renderFile(text, profile, compress) {
  const sparse = avgLineLen(text) < SPARSE_LINE_THRESHOLD;
  let src = text;
  if (compress) src = compressText(text);
  // Reflow-packing fits content into fewer flat-billed pages. On Gemini (flat billing +
  // ~36 char/tok ceiling) ALWAYS reflow — packing is strictly better. On Opus (pixel
  // billing, needs legible rows) only reflow sparse content; keep dense one-line-per-row.
  const doReflow = profile.alwaysReflow || sparse;
  const packed = doReflow ? (reflow(src) ?? src) : src;
  const style = { aa: true, cellWBonus: profile.cellWBonus, cellHBonus: profile.cellHBonus };
  const imgs = await renderTextToPngsWithCharLimit(packed, profile.cols, profile.maxCharsPerPage, style, profile.maxHeightPx);
  return { sparse, imgs, compressedChars: src.length };
}

async function main() {
  const { files, out, provider, compress } = parseArgs(process.argv.slice(2));
  if (!files.length) { console.error('nyx: no files. Usage: node render.mjs [--provider gemini|opus] [--compress] <files...>'); process.exit(2); }

  if (provider === 'gpt' || provider === 'text' || provider === 'none') {
    console.log('=== NYX: provider does not reliably read optical renders — read files as TEXT ===');
    for (const f of files) console.log(`• ${f} -> Read as text`);
    process.exit(0);
  }
  const profile = PROFILES[provider] || PROFILES.gemini;
  if (!existsSync(out)) mkdirSync(out, { recursive: true });

  const manifest = []; let pageIdx = 0;
  for (const f of files) {
    let text; try { text = readFileSync(resolve(f), 'utf8'); } catch (e) { manifest.push({ file: f, status: 'error', detail: String(e?.message || e) }); continue; }
    const lineCount = text.split('\n').length;
    if (text.length < MIN_CHARS) { manifest.push({ file: f, status: 'skipped_small', chars: text.length, lines: lineCount }); continue; }
    const { sparse, imgs, compressedChars } = await renderFile(text, profile, compress);
    const pages = [];
    for (const im of imgs) { const name = `nyx_p${String(++pageIdx).padStart(3, '0')}.png`; writeFileSync(resolve(out, name), im.png); pages.push(name); }
    manifest.push({ file: f, status: 'imaged', mode: sparse ? 'sparse(reflow)' : 'dense(one-line)', chars: text.length, compressedChars, lines: lineCount, pages, provider });
  }

  console.log(`=== NYX MANIFEST (provider=${provider}${compress ? ', compressed' : ''}) ===`);
  console.log(`output dir: ${resolve(out)}  |  profile: ${profile.note}`);
  for (const m of manifest) {
    if (m.status === 'imaged') { console.log(`\n• ${m.file} [${m.mode}] ${m.chars}ch${compress ? ` -> ${m.compressedChars}ch compressed` : ''}, ${m.lines} lines`); console.log(`  Read page image(s): ${m.pages.join(', ')}`); }
    else if (m.status === 'skipped_small') console.log(`\n• ${m.file} [SKIPPED — ${m.chars}ch < ${MIN_CHARS}] -> Read as text`);
    else console.log(`\n• ${m.file} [ERROR: ${m.detail}]`);
  }
  console.log('\nNOTE: recognition-only (lossy). For exact identifiers, Read the original file as text.');
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
main().catch((e) => { console.error('nyx: fatal', e); process.exit(1); });
