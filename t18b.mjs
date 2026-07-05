import * as R from './render.bundle.mjs';
import { ask, b64, imageBilledTokens } from './lib.mjs';
function guid(){const h='0123456789abcdef';let s='';for(const n of [8,4,4,4,12]){for(let i=0;i<n;i++)s+=h[Math.floor(Math.random()*16)];s+='-'}return s.slice(0,-1);}
const ids=Array.from({length:15},()=>guid());
const lines=[];for(let i=0;i<200;i++)lines.push(`log ${i}: op_${i%12} node_${i%8} bytes ${i*97%9999} ok`);
ids.forEach((id,i)=>{lines[10+i*12]=`RESOURCE_${i} id=${id} active`;});
const text=lines.join('\n'), MODEL='gemini-3.1-pro-preview', packed=R.reflow(text)??text;
console.log(`\n=== T18b verbatim vs density | ${ids.length} GUIDs ===`);
// vary chars/page (density) - lower = bigger glyphs = better verbatim?
for(const cap of [10000,20000,38000]){
  const imgs=await R.renderTextToPngsWithCharLimit(packed,468,cap,{aa:true},4096);
  const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
  const ib=[{type:'text',text:'Data (↵=newline). Exact id for named RESOURCE:'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let c=0;for(let i=0;i<ids.length;i++){const r=await ask(MODEL,[...ib,{type:'text',text:`\nExact id of RESOURCE_${i}? Only GUID.`}],40);if(r.text.toLowerCase().includes(ids[i].toLowerCase()))c++;}
  console.log(`cap${cap}: ${imgs.length}p billed=${billed} verbatim=${c}/${ids.length} (${(100*c/ids.length).toFixed(0)}%)`);
}
