import * as R from './render.bundle.mjs';
import { ask, b64 } from './lib.mjs';
function hash(len){const h='0123456789abcdef';let s='';for(let i=0;i<len;i++)s+=h[Math.floor(Math.random()*16)];return s;}
const hashes=Array.from({length:8},()=>hash(40)); // SHA-1 length
const lines=[];for(let i=0;i<200;i++)lines.push(`commit ${i}: author dev_${i%12} files ${i%20}`);
hashes.forEach((h,i)=>{lines[10+i*22]=`BUILD_${i} sha=${h}`;});
const text=lines.join('\n'), MODEL='gemini-3.1-pro-preview', packed=R.reflow(R.neutralizeSentinel(text))??text;
const imgs=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
const ib=[{type:'text',text:'Data(↵=nl):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
console.log(`\n=== T31 adversarial verbatim: 40-char SHA-1 hashes | ${hashes.length} hashes ===`);
let full=0,partial=0;
for(let i=0;i<hashes.length;i++){
  const r=await ask(MODEL,[...ib,{type:'text',text:`\nExact sha of BUILD_${i}? Only the hash.`}],50);
  const ans=(r.text.match(/[0-9a-f]{20,40}/i)||[''])[0].toLowerCase();
  if(ans===hashes[i])full++;
  else{let match=0;for(let k=0;k<40&&k<ans.length;k++)if(ans[k]===hashes[i][k])match++;if(match>=36)partial++;}
}
console.log(`exact 40/40 chars: ${full}/${hashes.length}, near(>=36/40): ${partial}/${hashes.length}`);
