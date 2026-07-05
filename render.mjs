import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { renderTextToPngs, renderTextToPngsWithCharLimit, reflow, DENSE_CONTENT_COLS } from './vendor/nyx-render.bundle.js';

const MIN_CHARS = 6000;
const SPARSE_LINE_THRESHOLD = 60;
const REFLOW_PAGE_CAP = 28080;

function parseArgs(argv) {
  const files = [];
  let out = '.nyx-cache';
  let minChars = MIN_CHARS;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--min-chars') minChars = parseInt(argv[++i], 10) || MIN_CHARS;
    else files.push(a);
  }
  return { files, out, minChars };
}

function avgLineLen(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (!lines.length) return 0;
  return lines.reduce((a, l) => a + l.length, 0) / lines.length;
}

async function renderFile(text) {
  const sparse = avgLineLen(text) < SPARSE_LINE_THRESHOLD;
  const imgs = sparse
    ? await renderTextToPngsWithCharLimit(reflow(text) ?? text, DENSE_CONTENT_COLS, REFLOW_PAGE_CAP)
    : await renderTextToPngs(text);
  return { sparse, imgs };
}

async function main() {
  const { files, out, minChars } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error('nyx: no files given. Usage: node render.mjs [--out DIR] <files...>');
    process.exit(2);
  }
  if (!existsSync(out)) mkdirSync(out, { recursive: true });

  const manifest = [];
  let pageIdx = 0;
  for (const f of files) {
    const abs = resolve(f);
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch (e) {
      manifest.push({ file: f, status: 'error', detail: String(e?.message || e) });
      continue;
    }
    const lineCount = text.split('\n').length;
    if (text.length < minChars) {
      manifest.push({ file: f, status: 'skipped_small', chars: text.length, lines: lineCount, note: 'kept as text; too small to save tokens — Read it directly' });
      continue;
    }
    const { sparse, imgs } = await renderFile(text);
    const pages = [];
    for (const im of imgs) {
      const name = `nyx_p${String(++pageIdx).padStart(3, '0')}.png`;
      writeFileSync(resolve(out, name), im.png);
      pages.push({ page: name, width: im.width, height: im.height, droppedChars: im.droppedChars });
    }
    manifest.push({
      file: f,
      status: 'imaged',
      mode: sparse ? 'sparse(reflow-packed)' : 'dense(one-line-per-row)',
      chars: text.length,
      lines: lineCount,
      pages: pages.map((p) => p.page),
      outDir: out,
    });
  }

  console.log('=== NYX MANIFEST ===');
  console.log(`output dir: ${resolve(out)}`);
  for (const m of manifest) {
    if (m.status === 'imaged') {
      console.log(`\n• ${m.file}  [${m.mode}]  ${m.chars} chars, ${m.lines} lines`);
      console.log(`  Read these page image(s): ${m.pages.join(', ')}`);
    } else if (m.status === 'skipped_small') {
      console.log(`\n• ${m.file}  [SKIPPED — ${m.chars} chars < ${minChars}]  → Read the file directly as text`);
    } else {
      console.log(`\n• ${m.file}  [ERROR: ${m.detail}]`);
    }
  }
  console.log('\nNOTE: images are recognition-only (lossy). For exact identifiers');
  console.log('(GUIDs, SHAs, error codes, precise numbers), Read the original file as text.');

  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error('nyx: fatal', e);
  process.exit(1);
});
