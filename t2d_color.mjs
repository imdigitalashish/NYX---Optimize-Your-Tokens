// T2-definitive: use napi-canvas to DIRECTLY draw two colored text layers (no pixel hacks).
// Red text and blue text interleaved. Ask model to read ONLY red, then ONLY blue.
// This is the cleanest possible test of "can a frontier model separate color layers".
import { ask, b64, grade } from './lib.mjs';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.NAPI);

const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
const W=1400,H=760;
const cv=createCanvas(W,H); const ctx=cv.getContext('2d');
ctx.fillStyle='white'; ctx.fillRect(0,0,W,H);
ctx.font='13px monospace';
// Two independent layers, SAME positions (fully overlapping rows), different colors.
const redLines=['RED_SECRET=crimson_4200', ...Array.from({length:48},(_,i)=>`R${i}: alpha device metric ${i*3} region east`)];
const blueLines=['BLUE_SECRET=azure_8443', ...Array.from({length:48},(_,i)=>`B${i}: beta service latency ${i*7} zone west`)];
// interleave: red on even y, blue on odd y (tight packing, 2x density vs one layer)
for(let i=0;i<redLines.length;i++){ ctx.fillStyle='#c00000'; ctx.fillText(redLines[i], 6, 14+i*15); }
for(let i=0;i<blueLines.length;i++){ ctx.fillStyle='#0000c0'; ctx.fillText(blueLines[i], 700, 14+i*15); }
const png=cv.toBuffer('image/png');
writeFileSync('t2d.png',png);
console.log(`\n=== T2-definitive color separation | ${MODEL} | ${W}x${H} ===`);

const content=[{type:'text',text:'The image has RED text (left) and BLUE text (right).'},
 {type:'image_url',image_url:{url:`data:image/png;base64,${b64(png)}`}},
 {type:'text',text:'\nReading ONLY the red text: what is RED_SECRET? Reading ONLY the blue text: what is BLUE_SECRET?'}];
const r=await ask(MODEL,content,150);
console.log('ANSWER:\n'+r.text);
console.log('[truth: RED_SECRET=crimson_4200, BLUE_SECRET=azure_8443]');
console.log('read:',grade(r.text,['crimson_4200','azure_8443'])+'/2');
