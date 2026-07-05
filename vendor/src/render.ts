import {
  ATLAS_CELL_W,
  ATLAS_CELL_H,
  ATLAS_PIXELS,
  ATLAS_OFFSETS,
  ATLAS_WIDE_FLAGS,
  atlasRank,
} from './atlas.js';
import {
  ATLAS_GRAY_CELL_W,
  ATLAS_GRAY_CELL_H,
  ATLAS_GRAY_PIXELS,
  ATLAS_GRAY_OFFSETS,
  ATLAS_GRAY_WIDE_FLAGS,
  atlasGrayRank,
} from './atlas-gray.js';
import { encodeGrayPng, encodeRgbPng } from './png.js';


export const MAX_HEIGHT_PX = 728;

export const READABLE_CHARS_PER_IMAGE = 28080;

export const DENSE_CONTENT_CHARS_PER_IMAGE = 28080;
export const DENSE_CONTENT_COLS = 312;

export const DENSE_RENDER_STYLE: RenderStyle = { cellWBonus: 0, cellHBonus: 0, aa: true };

const DEFAULT_COLS = 312;

export const PAD_X = 4;

export const PAD_Y = 4;


export const DEFAULT_CELL_W_BONUS = 0;
export const DEFAULT_CELL_H_BONUS = 0;

export const CELL_W = ATLAS_CELL_W + DEFAULT_CELL_W_BONUS;
export const CELL_H = ATLAS_CELL_H + DEFAULT_CELL_H_BONUS;

export interface RenderedImage {
  png: Uint8Array;
  width: number;
  height: number;
  
  charsRendered: number;
  
  droppedChars: number;
  
  droppedCodepoints: Map<number, number>;
}


export interface RenderStyle {
  
  grid?: boolean;
  
  gridCols?: number;
  
  markerScale?: number;
  
  markerRed?: boolean;
  
  cellHBonus?: number;
  
  cellWBonus?: number;
  
  aa?: boolean;
  
  colorCycle?: boolean;
  
  colorByRole?: boolean;
}




function cellsFor(codepoint: number, markerScale: number = 1): number {

  if (codepoint === NL_SENTINEL_CP && markerScale > 1) return markerScale;
  const rank = atlasRank(codepoint);
  if (rank < 0) return 1;
  return ATLAS_WIDE_FLAGS[rank] === 1 ? 2 : 1;
}

const TAB_WIDTH = 4;


export function minifyForRender(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n');
}




export const NL_SENTINEL = '↵';

const NL_SENTINEL_CP = 0x21b5;


export const NL_SENTINEL_LITERAL = '⏎';
export function neutralizeSentinel(text: string): string {
  return text.indexOf(NL_SENTINEL) >= 0
    ? text.split(NL_SENTINEL).join(NL_SENTINEL_LITERAL)
    : text;
}


const GLYPH_PALETTE: [number, number, number][] = [
  [20, 20, 20],
  [20, 40, 160],
  [150, 20, 20],
  [20, 110, 40],
];


export const ROLE_PALETTE: [number, number, number][] = [
  [20, 120, 50],
  [30, 70, 180],
];
const ROLE_SLOT_USER = 1;
const ROLE_SLOT_ASSISTANT = 2;


export const SLOT_MARK_USER = String.fromCharCode(1);
export const SLOT_MARK_ASSISTANT = String.fromCharCode(2);
const SLOT_MARK_RE = new RegExp('[' + SLOT_MARK_USER + SLOT_MARK_ASSISTANT + ']', 'g');


function slotForMarkCp(cp: number | undefined): number {
  if (cp === 0x0001) return ROLE_SLOT_USER;
  if (cp === 0x0002) return ROLE_SLOT_ASSISTANT;
  return 0;
}


const SLOT_NEUTRAL = '\u0003';


export function slotCopyBody(body: string): string {
  if (body.indexOf(SLOT_MARK_USER) < 0 && body.indexOf(SLOT_MARK_ASSISTANT) < 0) return body;
  return body.replace(SLOT_MARK_RE, SLOT_NEUTRAL);
}


export function roleSlotSegment(tag: string, body: string, mark: string, attr = ''): string {

  const open = `<${tag}${attr}>`;
  const close = `</${tag}>`;
  return `${mark.repeat(open.length)}\n${slotCopyBody(body)}\n${mark.repeat(close.length)}`;
}


export function reflow(text: string): string | null {
  if (text.indexOf(NL_SENTINEL) >= 0) return null;
  return minifyForRender(text)
    .split('\n')
    .map(expandTabsInLine)
    .join(NL_SENTINEL);
}


export function dereflow(reflowed: string): string {
  return reflowed.split(NL_SENTINEL).join('\n');
}


export function expandTabsInLine(line: string): string {
  if (line.indexOf('\t') < 0) return line;
  let out = '';
  let col = 0;
  for (const ch of line) {
    if (ch === '\t') {
      const span = TAB_WIDTH - (col % TAB_WIDTH);
      out += '→';
      if (span > 1) out += ' '.repeat(span - 1);
      col += span;
    } else {
      out += ch;
      col += cellsFor(ch.codePointAt(0)!);
    }
  }
  return out;
}


export function measureLineCols(line: string, markerScale: number = 1): number {
  let w = 0;
  for (const ch of line) w += cellsFor(ch.codePointAt(0)!, markerScale);
  return w;
}



export function shrinkColsToContent(text: string, cols: number, markerScale: number = 1): number {

  return measureContentCols(text, cols, markerScale);
}


export function measureContentCols(text: string, maxCols: number, markerScale: number = 1): number {
  const cap = Math.max(1, maxCols | 0);
  let widest = 1;
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === '\n') {
      const w = measureLineCols(expandTabsInLine(text.slice(start, i)), markerScale);
      if (w > widest) widest = w;
      if (widest >= cap) return cap;
      start = i + 1;
    }
  }
  return Math.min(cap, widest);
}

export function wrapLines(text: string, cols: number, markerScale: number = 1): string[] {
  const out: string[] = [];
  const minified = minifyForRender(text);
  for (const rawWithTabs of minified.split('\n')) {
    const raw = expandTabsInLine(rawWithTabs);
    if (raw.length === 0) {
      out.push('');
      continue;
    }
    let cur = '';
    let curCols = 0;

    for (const ch of raw) {
      const cp = ch.codePointAt(0)!;
      const w = cellsFor(cp, markerScale);
      if (curCols + w > cols) {
        out.push(cur);
        cur = ch;
        curCols = w;
      } else {
        cur += ch;
        curCols += w;
      }
    }
    if (cur.length > 0) out.push(cur);
  }
  return out;
}

function splitWrappedLinesIntoReadablePages(
  lines: string[],
  maxLines: number,
  maxChars: number = READABLE_CHARS_PER_IMAGE,
): string[][] {
  const pages: string[][] = [];
  let cur: string[] = [];
  let curChars = 0;
  const lineLimit = Math.max(1, maxLines | 0);
  const charLimit = Math.max(1, maxChars | 0);

  for (const line of lines) {
    const lineChars = line.length + (cur.length > 0 ? 1 : 0);
    if (
      cur.length > 0 &&
      (cur.length >= lineLimit || curChars + lineChars > charLimit)
    ) {
      pages.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(line);
    curChars += line.length + (cur.length > 1 ? 1 : 0);
  }
  if (cur.length > 0) pages.push(cur);
  return pages.length > 0 ? pages : [[]];
}

function readableLinesPerColumn(cols: number): number {
  return Math.max(1, Math.floor(READABLE_CHARS_PER_IMAGE / Math.max(1, cols)));
}


function blitGlyph(
  fb: Uint8Array,
  fbW: number,
  x: number,
  y: number,
  codepoint: number,
  markerMask: Uint8Array | null = null,
): number {
  const rank = atlasRank(codepoint);
  if (rank < 0) return 0;
  const wide = ATLAS_WIDE_FLAGS[rank] === 1;
  const srcW = wide ? 2 * ATLAS_CELL_W : ATLAS_CELL_W;

  const srcOff = ATLAS_OFFSETS[rank]!;
  for (let gy = 0; gy < ATLAS_CELL_H; gy++) {
    const dstRow = (y + gy) * fbW + x;
    const bitRowStart = srcOff + gy * srcW;
    for (let gx = 0; gx < srcW; gx++) {
      const bitIdx = bitRowStart + gx;
      const byte = ATLAS_PIXELS[bitIdx >>> 3]!;
      const bit = (byte >>> (7 - (bitIdx & 7))) & 1;
      if (bit) {
        fb[dstRow + gx] = 255;
        if (markerMask) markerMask[dstRow + gx] = 1;
      }
    }
  }
  return wide ? 2 : 1;
}


function blitGlyphGray(
  fb: Uint8Array,
  fbW: number,
  x: number,
  y: number,
  codepoint: number,
): number {
  const rank = atlasGrayRank(codepoint);
  if (rank < 0) return 0;
  const wide = ATLAS_GRAY_WIDE_FLAGS[rank] === 1;
  const srcW = wide ? 2 * ATLAS_GRAY_CELL_W : ATLAS_GRAY_CELL_W;

  const srcOff = ATLAS_GRAY_OFFSETS[rank]!;
  for (let gy = 0; gy < ATLAS_GRAY_CELL_H; gy++) {
    const dstRow = (y + gy) * fbW + x;
    const srcRow = srcOff + gy * srcW;
    for (let gx = 0; gx < srcW; gx++) {
      const coverage = ATLAS_GRAY_PIXELS[srcRow + gx]!;
      if (coverage > 0) {
        const idx = dstRow + gx;
        if (coverage > fb[idx]!) fb[idx] = coverage;
      }
    }
  }
  return wide ? 2 : 1;
}


function blitGlyphScaled(
  fb: Uint8Array,
  markerMask: Uint8Array | null,
  fbW: number,
  fbH: number,
  x: number,
  y: number,
  codepoint: number,
  scaleX: number,
): number {
  const rank = atlasRank(codepoint);
  if (rank < 0) return 0;
  const wide = ATLAS_WIDE_FLAGS[rank] === 1;
  const srcW = wide ? 2 * ATLAS_CELL_W : ATLAS_CELL_W;
  const srcOff = ATLAS_OFFSETS[rank]!;
  for (let gy = 0; gy < ATLAS_CELL_H; gy++) {
    const py = y + gy;
    if (py >= fbH) break;
    const bitRowStart = srcOff + gy * srcW;
    for (let gx = 0; gx < srcW; gx++) {
      const bitIdx = bitRowStart + gx;
      const byte = ATLAS_PIXELS[bitIdx >>> 3]!;
      if (((byte >>> (7 - (bitIdx & 7))) & 1) === 0) continue;
      for (let sx = 0; sx < scaleX; sx++) {
        const px = x + gx * scaleX + sx;
        if (px >= fbW) break;
        const idx = py * fbW + px;
        fb[idx] = 255;
        if (markerMask) markerMask[idx] = 1;
      }
    }
  }
  return wide ? 2 * scaleX : scaleX;
}

const GRID_INK = 25;


function drawGrid(
  fb: Uint8Array,
  fbW: number,
  fbH: number,
  rows: number,
  gridCols: number,
  cellH: number,
  cellW: number,
  glyphH: number = ATLAS_CELL_H,
): void {
  for (let row = 0; row < rows; row++) {
    const y = PAD_Y + row * cellH + (glyphH - 1);
    if (y >= fbH) break;
    const rowStart = y * fbW;
    for (let x = 0; x < fbW; x++) {
      if (fb[rowStart + x] === 0) fb[rowStart + x] = GRID_INK;
    }
  }
  if (gridCols > 0) {
    for (let col = gridCols; ; col += gridCols) {
      const x = PAD_X + col * cellW;
      if (x >= fbW - PAD_X) break;
      for (let y = 0; y < fbH; y++) {
        const idx = y * fbW + x;
        if (fb[idx] === 0) fb[idx] = GRID_INK;
      }
    }
  }
}


export async function renderChunkToPng(
  text: string,
  cols: number = DEFAULT_COLS,
  style: RenderStyle = {},
  maxHeightPx: number = MAX_HEIGHT_PX,
  slotText?: string,
): Promise<RenderedImage> {
  const useAA = style.aa === true;
  const atlasH = useAA ? ATLAS_GRAY_CELL_H : ATLAS_CELL_H;
  const atlasW = useAA ? ATLAS_GRAY_CELL_W : ATLAS_CELL_W;
  const markerScale = Math.max(1, Math.floor(style.markerScale ?? 1));
  const cellH = atlasH + Math.max(0, Math.floor(style.cellHBonus ?? DEFAULT_CELL_H_BONUS));
  const cellW = Math.max(1, atlasW + Math.floor(style.cellWBonus ?? DEFAULT_CELL_W_BONUS));
  const lines = wrapLines(text, cols, markerScale);

  const slotLines: string[] | null =
    style.colorByRole === true && slotText !== undefined
      ? wrapLines(slotText, cols, markerScale)
      : null;

  const maxLines = Math.max(1, Math.floor((maxHeightPx - 2 * PAD_Y) / cellH));
  const fitLines = lines.slice(0, maxLines);
  const fitSlotLines = slotLines ? slotLines.slice(0, maxLines) : null;


  let charsRendered: number;
  if (fitLines.length === lines.length) {
    let n = 0;
    for (const _ of text) n++;
    charsRendered = n;
  } else {

    let n = 0;
    for (let i = 0; i < fitLines.length; i++) {
      for (const _ of fitLines[i]!) n++;
    }
    n += Math.max(0, fitLines.length - 1);
    charsRendered = n;
  }


  const width = 2 * PAD_X + cols * cellW + Math.max(0, atlasW - cellW);
  const height = 2 * PAD_Y + fitLines.length * cellH;


  const fb = new Uint8Array(width * height);

  const markerMask: Uint8Array | null =
    style.markerRed ? new Uint8Array(width * height) : null;

  const useColorCycle = style.colorCycle === true;
  const useColorByRole = style.colorByRole === true;
  const colorMask: Uint8Array | null =
    (useColorCycle || useColorByRole) ? new Uint8Array(width * height) : null;

  let droppedChars = 0;
  const droppedCodepoints = new Map<number, number>();
  let glyphIndex = 0;
  for (let row = 0; row < fitLines.length; row++) {
    const line = fitLines[row]!;
    const baseY = PAD_Y + row * cellH;
    let col = 0;

    const slotRow: string[] | null =
      fitSlotLines ? Array.from(fitSlotLines[row] ?? '') : null;
    let charIdx = 0;
    for (const ch of line) {
      if (col >= cols) break;
      const codepoint = ch.codePointAt(0)!;
      const baseX = PAD_X + col * cellW;
      const isMarker = codepoint === NL_SENTINEL_CP;
      const colorSlot = useColorByRole
        ? (slotRow ? slotForMarkCp(slotRow[charIdx]?.codePointAt(0)) : 0)
        : (glyphIndex % GLYPH_PALETTE.length) + 1;
      let advance: number;
      if (isMarker && markerScale > 1) {
        advance = blitGlyphScaled(fb, markerMask, width, height, baseX, baseY, codepoint, markerScale);
        if (colorMask) {
          for (let gy = 0; gy < atlasH; gy++) {
            const py = baseY + gy;
            if (py >= height) break;
            for (let gx = 0; gx < advance * cellW; gx++) {
              const px = baseX + gx;
              if (px >= width) break;
              const idx = py * width + px;
              if (fb[idx]! > 0) colorMask[idx] = colorSlot;
            }
          }
        }
      } else if (useAA) {
        advance = blitGlyphGray(fb, width, baseX, baseY, codepoint);
        if (colorMask && advance > 0) {
          const srcW = advance * atlasW;
          for (let gy = 0; gy < atlasH; gy++) {
            const py = baseY + gy;
            if (py >= height) break;
            for (let gx = 0; gx < srcW; gx++) {
              const px = baseX + gx;
              if (px >= width) break;
              const idx = py * width + px;
              if (fb[idx]! > 0) colorMask[idx] = colorSlot;
            }
          }
        }
      } else {
        advance = blitGlyph(fb, width, baseX, baseY, codepoint, isMarker ? markerMask : null);
        if (colorMask && advance > 0) {
          const srcW = advance * atlasW;
          for (let gy = 0; gy < atlasH; gy++) {
            const py = baseY + gy;
            if (py >= height) break;
            for (let gx = 0; gx < srcW; gx++) {
              const px = baseX + gx;
              if (px >= width) break;
              const idx = py * width + px;
              if (fb[idx]! > 0) colorMask[idx] = colorSlot;
            }
          }
        }
      }
      glyphIndex++;
      charIdx++;
      if (advance === 0) {
        droppedChars++;
        droppedCodepoints.set(codepoint, (droppedCodepoints.get(codepoint) ?? 0) + 1);
        col += 1;
      } else {
        col += advance;
      }
    }
  }

  if (style.grid) {
    drawGrid(fb, width, height, fitLines.length, Math.max(0, Math.floor(style.gridCols ?? 0)), cellH, cellW, atlasH);
  }


  for (let i = 0; i < fb.length; i++) fb[i] = 255 - fb[i]!;

  let png: Uint8Array;
  if (colorMask) {

    const palette = useColorByRole ? ROLE_PALETTE : GLYPH_PALETTE;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < fb.length; i++) {
      const g = fb[i]!;
      const slot = colorMask[i]!;
      if (slot > 0) {
        const coverage = 255 - g;
        const [pr, pg, pb] = palette[(slot - 1) % palette.length]!;

        rgb[i * 3]     = Math.round(255 - coverage * (255 - pr!) / 255);
        rgb[i * 3 + 1] = Math.round(255 - coverage * (255 - pg!) / 255);
        rgb[i * 3 + 2] = Math.round(255 - coverage * (255 - pb!) / 255);
      } else {
        rgb[i * 3]     = g;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = g;
      }
    }
    png = await encodeRgbPng(rgb, width, height);
  } else if (markerMask) {

    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < fb.length; i++) {
      const g = fb[i]!;
      if (markerMask[i] === 1 && g < 128) {
        rgb[i * 3] = 220;
        rgb[i * 3 + 1] = 0;
        rgb[i * 3 + 2] = 0;
      } else {
        rgb[i * 3] = g;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = g;
      }
    }
    png = await encodeRgbPng(rgb, width, height);
  } else {
    png = await encodeGrayPng(fb, width, height);
  }
  return { png, width, height, charsRendered, droppedChars, droppedCodepoints };
}


export async function renderTextToPngsReflow(
  text: string,
  cols: number = DEFAULT_COLS,
  style: RenderStyle = {},
): Promise<RenderedImage[]> {
  const packed = reflow(text);
  return renderTextToPngs(packed ?? text, cols, style);
}


export async function renderTextToPngsWithCharLimit(
  text: string,
  cols: number = DEFAULT_COLS,
  maxCharsPerImage: number = READABLE_CHARS_PER_IMAGE,
  style: RenderStyle = {},
  maxHeightPx: number = MAX_HEIGHT_PX,
  slotText?: string,
): Promise<RenderedImage[]> {
  const markerScale = Math.max(1, Math.floor(style.markerScale ?? 1));
  const cellH = ATLAS_CELL_H + Math.max(0, Math.floor(style.cellHBonus ?? DEFAULT_CELL_H_BONUS));
  const lines = wrapLines(text, cols, markerScale);

  const slotLines: string[] | null =
    style.colorByRole === true && slotText !== undefined
      ? wrapLines(slotText, cols, markerScale)
      : null;
  const hardLinesPerImg = Math.max(1, Math.floor((maxHeightPx - 2 * PAD_Y) / cellH));

  const linesPerImg = Math.min(hardLinesPerImg, Math.max(1, Math.floor(maxCharsPerImage / cols)));

  const images: RenderedImage[] = [];
  let slotCursor = 0;
  for (const page of splitWrappedLinesIntoReadablePages(lines, linesPerImg, maxCharsPerImage)) {
    const chunk = page.join('\n');
    const slotChunk = slotLines
      ? slotLines.slice(slotCursor, slotCursor + page.length).join('\n')
      : undefined;
    slotCursor += page.length;
    images.push(await renderChunkToPng(chunk, cols, style, maxHeightPx, slotChunk));
  }
  return images;
}

export async function renderTextToPngs(
  text: string,
  cols: number = DEFAULT_COLS,
  style: RenderStyle = {},
  maxHeightPx: number = MAX_HEIGHT_PX,
  slotText?: string,
): Promise<RenderedImage[]> {
  return renderTextToPngsWithCharLimit(text, cols, READABLE_CHARS_PER_IMAGE, style, maxHeightPx, slotText);
}



const GUTTER_CELLS = 4;

const MAX_WIDTH_PX = 1568;

const GUTTER_DIVIDER_INK = 64;
const GUTTER_DIVIDER_INSET_PX = 2;


export function multiColWidth(cols: number, numCols: number): number {
  const n = Math.max(1, numCols | 0);
  return 2 * PAD_X + n * cols * CELL_W + (n - 1) * GUTTER_CELLS * CELL_W;
}


export function maxFittingCols(cols: number): number {
  let n = 1;
  while (multiColWidth(cols, n + 1) <= MAX_WIDTH_PX) n++;
  return n;
}

async function renderMultiColChunkFromLines(
  lines: string[],
  cols: number,
  numCols: number,
  charsCovered: number,
  linesPerCol: number,
): Promise<RenderedImage> {
  const width = multiColWidth(cols, numCols);

  const rowsPerCol = Math.max(1, linesPerCol | 0);
  const usedRows = Math.min(lines.length, rowsPerCol);
  const height = 2 * PAD_Y + usedRows * CELL_H;

  const fb = new Uint8Array(width * height);
  let droppedChars = 0;
  const droppedCodepoints = new Map<number, number>();

  const colStride = cols * CELL_W + GUTTER_CELLS * CELL_W;
  for (let c = 0; c < numCols; c++) {
    const colBaseX = PAD_X + c * colStride;
    const colStart = c * rowsPerCol;
    if (colStart >= lines.length) break;
    const colEnd = Math.min(colStart + rowsPerCol, lines.length);
    for (let r = 0; r < colEnd - colStart; r++) {
      const line = lines[colStart + r]!;
      const baseY = PAD_Y + r * CELL_H;
      let col = 0;
      for (const ch of line) {
        if (col >= cols) break;
        const codepoint = ch.codePointAt(0)!;
        const baseX = colBaseX + col * CELL_W;
        const advance = blitGlyph(fb, width, baseX, baseY, codepoint);
        if (advance === 0) {
          droppedChars++;
          droppedCodepoints.set(codepoint, (droppedCodepoints.get(codepoint) ?? 0) + 1);
          col += 1;
        } else {
          col += advance;
        }
      }
    }
  }


  if (numCols >= 2) {
    const gutterPxPerSide = GUTTER_CELLS * CELL_W;
    const yStart = GUTTER_DIVIDER_INSET_PX;
    const yEnd = height - GUTTER_DIVIDER_INSET_PX;
    for (let c = 0; c < numCols - 1; c++) {
      const colEndX = PAD_X + c * colStride + cols * CELL_W;
      const dividerX = colEndX + Math.floor(gutterPxPerSide / 2);
      for (let y = yStart; y < yEnd; y++) {
        const idx = y * width + dividerX;
        if (fb[idx] === 0) fb[idx] = GUTTER_DIVIDER_INK;
      }
    }
  }

  for (let i = 0; i < fb.length; i++) fb[i] = 255 - fb[i]!

  const png = await encodeGrayPng(fb, width, height);
  return {
    png,
    width,
    height,
    charsRendered: charsCovered,
    droppedChars,
    droppedCodepoints,
  };
}


export async function renderTextToPngsMultiCol(
  text: string,
  cols: number = DEFAULT_COLS,
  numCols: number = 2,
): Promise<RenderedImage[]> {
  if (numCols <= 1) return renderTextToPngs(text, cols);
  if (multiColWidth(cols, numCols) > MAX_WIDTH_PX) {

    numCols = maxFittingCols(cols);
    if (numCols <= 1) return renderTextToPngs(text, cols);
  }

  const lines = wrapLines(text, cols);
  const hardLinesPerImg = Math.max(1, Math.floor((MAX_HEIGHT_PX - 2 * PAD_Y) / CELL_H));
  const linesPerImg = Math.min(hardLinesPerImg, readableLinesPerColumn(cols));
  const linesPerImage = linesPerImg * numCols;


  let totalChars = 0;
  for (const _ of text) totalChars++;

  const images: RenderedImage[] = [];
  let coveredChars = 0;
  const pages = splitWrappedLinesIntoReadablePages(
    lines,
    linesPerImage,
    READABLE_CHARS_PER_IMAGE * Math.max(1, numCols | 0),
  );
  for (let i = 0; i < pages.length; i++) {
    const slice = pages[i]!;
    const isLast = i === pages.length - 1;
    let chars: number;
    if (isLast) {
      chars = Math.max(0, totalChars - coveredChars);
    } else {
      let n = 0;
      for (const ln of slice) for (const _ of ln) n++;
      n += Math.max(0, slice.length - 1);
      chars = n;
    }
    coveredChars += chars;
    images.push(await renderMultiColChunkFromLines(slice, cols, numCols, chars, linesPerImg));
  }
  return images;
}


export async function renderTextToPngsReflowMultiCol(
  text: string,
  cols: number = DEFAULT_COLS,
  numCols: number = 2,
): Promise<RenderedImage[]> {
  const packed = reflow(text);
  return renderTextToPngsMultiCol(packed ?? text, cols, numCols);
}

export interface RenderDensePagesOptions {
  
  readonly cols?: number;
  
  readonly shrink?: boolean;
  
  readonly multiCol?: number | 'auto';
  
  readonly reflow?: boolean;
  
  readonly maxCharsPerImage?: number;
  
  readonly style?: RenderStyle;
  
  readonly maxHeightPx?: number;
}


export async function renderDensePages(
  text: string,
  opts: RenderDensePagesOptions = {},
): Promise<RenderedImage[]> {
  const source = opts.reflow ? reflow(text) ?? text : text;
  const maxCols = Math.max(1, (opts.cols ?? DENSE_CONTENT_COLS) | 0);
  const cols = opts.shrink === false ? maxCols : measureContentCols(source, maxCols);
  const requestedCols =
    opts.multiCol === undefined || opts.multiCol === 'auto'
      ? Math.max(1, maxFittingCols(cols))
      : Math.max(1, opts.multiCol | 0);
  const numCols = cols < maxCols ? 1 : requestedCols;
  const style = opts.style ?? DENSE_RENDER_STYLE;
  const maxChars = opts.maxCharsPerImage ?? DENSE_CONTENT_CHARS_PER_IMAGE;
  const maxHeightPx = opts.maxHeightPx ?? MAX_HEIGHT_PX;
  return numCols > 1
    ? renderTextToPngsMultiCol(source, cols, numCols)
    : renderTextToPngsWithCharLimit(source, cols, maxChars, style, maxHeightPx);
}
