import * as R from './render.bundle.mjs';
import { imageBilledTokens } from './lib.mjs';
const MODEL='gemini-3.1-pro-preview';
function doc(rows){const f=[];for(let i=0;i<rows;i++)f.push(`rec_${i}: svc_${i%12} zone_${i%7} val ${(i*7)%9999} status ${i%3===0?'err':'ok'} extra payload_${i}`);return f.join('\n');}
console.log(`\n=== T28b nyx advantage vs doc size ===`);
console.log('chars | narrow-baseline(1568) | nyx(2348) | saving');
for(const rows of [100,250,500,1000,2000]){
  const t=doc(rows), packed=R.reflow(R.neutralizeSentinel(t))??t;
  const px=await R.renderTextToPngsWithCharLimit(packed,312,22000,{aa:true},728);
  const nyx=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
  const pxB=await imageBilledTokens(MODEL,px.map(i=>({png:i.png})));
  const nyxB=await imageBilledTokens(MODEL,nyx.map(i=>({png:i.png})));
  console.log(`${t.length} | ${pxB} (${px.length}p) | ${nyxB} (${nyx.length}p) | ${(100*(1-nyxB/pxB)).toFixed(0)}%`);
}
