import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
// doc with several exact GUIDs/hashes embedded. Test: dense render alone vs dense + a
// separate LARGE-glyph 'verbatim band' listing the exact IDs.
function doc(){
  const lines=[];
  const ids=['a3f9c012-4b7e-4d21-9c83-1f2e5a6b7c8d','7e21bd44-0a9f-4c33-b6e1-9d8c7a6b5e4f','SHA-c0ffee1234567890abcdef'];
  for(let i=0;i<200;i++)lines.push(`event ${i}: service_${i%10} region_${i%6} count ${i*3} status ok latency ${50+i%300}ms`);
  lines[45]=`RESOURCE alpha id=${ids[0]} owner platform`;
  lines[120]=`RESOURCE beta id=${ids[1]} owner network`;
  lines[180]=`COMMIT hash=${ids[2]} branch main`;
  return {text:lines.join('\n'), ids};
}
const {text,ids}=doc();
const Q=[{q:'exact id of RESOURCE alpha?',a:[ids[0]]},{q:'exact id of RESOURCE beta?',a:[ids[1]]},{q:'exact COMMIT hash?',a:[ids[2]]}];
const MODEL='gemini-3.1-pro-preview';
console.log(`\n=== T17 hybrid fidelity (verbatim band) | ${text.length}ch ===`);
async function evimgs(imgs,label){
  const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
  const ib=[{type:'text',text:'Data (↵=newline). Exact IDs may be listed separately at the end:'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly the exact value.`}],60);a+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${label}: ${imgs.length}p billed=${billed} verbatim-acc=${a}/${n}`);
}
// A) dense only
const dense=await R.renderTextToPngsWithCharLimit(R.reflow(text)??text,468,38000,{aa:true},4096);
await evimgs(dense,'dense-only');
// B) dense + verbatim band (the 3 IDs rendered LARGE at bottom as a separate page)
const band='EXACT IDENTIFIERS:\n'+ids.map((id,i)=>`[${i}] ${id}`).join('\n');
const bandImgs=await R.renderTextToPngsWithCharLimit(band,240,999999,{aa:true,cellWBonus:4,cellHBonus:4},2048);
await evimgs([...dense,...bandImgs],'dense+verbatim-band');
