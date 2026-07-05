import * as R from './render.bundle.mjs';
import { ask, b64, grade } from './lib.mjs';
function guid(){const h='0123456789abcdef';let s='';for(const n of [8,4,4,4,12]){for(let i=0;i<n;i++)s+=h[Math.floor(Math.random()*16)];s+='-'}return s.slice(0,-1);}
const ids=Array.from({length:15},()=>guid());
const lines=[];for(let i=0;i<200;i++)lines.push(`log ${i}: op_${i%12} node_${i%8} bytes ${i*97%9999} ok`);
ids.forEach((id,i)=>{lines[10+i*12]=`RESOURCE_${i} id=${id} active`;});
const text=lines.join('\n');
const MODEL='gemini-3.1-pro-preview';
console.log(`\n=== T18 verbatim GUID recall rate | ${text.length}ch, ${ids.length} GUIDs ===`);
const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(text)??text,468,38000,{aa:true},4096);
const ib=[{type:'text',text:'Data (↵=newline). Find the exact id for the named RESOURCE:'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
let correct=0;
for(let i=0;i<ids.length;i++){
  const r=await ask(MODEL,[...ib,{type:'text',text:`\nWhat is the exact id of RESOURCE_${i}? Only the GUID.`}],40);
  const ok=r.text.toLowerCase().includes(ids[i].toLowerCase());
  if(ok)correct++;
}
console.log(`${imgs.length}p, exact GUID recall: ${correct}/${ids.length} (${(100*correct/ids.length).toFixed(0)}%)`);
