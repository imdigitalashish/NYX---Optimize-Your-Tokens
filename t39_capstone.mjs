import * as R from './render.bundle.mjs';
import { ask, imageBilledTokens } from './lib.mjs';
const MODEL='gemini-3.1-pro-preview';
const STOP=new Set('the a an is are was were be to of in on at for and or but with that this it its as by from has have had over and which'.split(' '));
function comp(t){return t.split('\n').map(l=>l.split(/\s+/).map(w=>{const b=w.toLowerCase().replace(/[^a-z0-9_]/g,'');if(STOP.has(b))return '';if(/[0-9]/.test(w)||w.length<=3)return w;return w.replace(/(?<!^)[aeiou]/gi,'')}).filter(Boolean).join(' ')).join('\n');}
function doc(rows){const f=[];for(let i=0;i<rows;i++)f.push(`The record ${i} for service_${i%15} in region_${i%6} shows status ${i%4===0?'error':'ok'} with value ${(i*7)%9999}`);return f.join('\n');}
console.log(`\n=== T39 CAPSTONE: nyx-tuned vs narrow-baseline vs text ===`);
console.log('chars | text | narrow-baseline | nyx-tuned | nyx-vs-narrow-baseline | nyx-vs-text');
for(const rows of [100,300,600,1200]){
  const C=doc(rows);
  const textTok=(await ask(MODEL,[{type:'text',text:C.slice(0,50)+'OK'}],1)).usage?.prompt_tokens; // tiny probe won't reflect full; estimate instead
  const textEst=Math.round(C.length/3.5);
  // narrow-baseline geometry
  const px=await R.renderTextToPngsWithCharLimit(R.reflow(R.neutralizeSentinel(C))??C,312,22000,{aa:true},728);
  const pxB=await imageBilledTokens(MODEL,px.map(i=>({png:i.png})));
  // nyx tuned: size-adaptive + auto-compress large
  const useComp=C.length>24000, src=useComp?comp(C):C, cols=C.length<15000?312:468;
  const nyx=await R.renderTextToPngsWithCharLimit(R.reflow(R.neutralizeSentinel(src))??src,cols,24000,{aa:true},4096);
  const nyxB=await imageBilledTokens(MODEL,nyx.map(i=>({png:i.png})));
  console.log(`${C.length} | ~${textEst} | ${pxB}(${px.length}p) | ${nyxB}(${nyx.length}p) | ${(100*(1-nyxB/pxB)).toFixed(0)}% | ${(100*(1-nyxB/textEst)).toFixed(0)}%`);
}
