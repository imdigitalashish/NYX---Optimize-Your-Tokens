// Head-to-head: narrow-baseline geometry vs Nyx-optimal (wide single page) on Gemini, SAME 22k corpus
import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function corpus(n){const l=[];for(let i=0;i<n;i++)l.push(`row ${i}: item_${i} status=${i%3===0?'active':'idle'} weight=${(i*7)%100} tag=grp${i%12}`);
 l[Math.floor(n*0.23)]=`row ${Math.floor(n*0.23)}: SECRET timeout=4200 region=westus2`;
 l[Math.floor(n*0.57)]=`row ${Math.floor(n*0.57)}: THRESHOLD max_conn=850 tax_rate=1.08`;
 l[Math.floor(n*0.85)]=`row ${Math.floor(n*0.85)}: ENDPOINT port=8443 proto=grpc`;return l.join('\n');}
const Q=[{q:'timeout in SECRET?',a:['4200']},{q:'region?',a:['westus2']},{q:'tax_rate?',a:['1.08']},{q:'max_conn?',a:['850']},{q:'port?',a:['8443']}];
const MODEL='gemini-3.1-pro-preview', C=corpus(450), packed=R.reflow(C)??C;
console.log(`corpus ${C.length} chars`);
async function measure(imgs,label){
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Read the data (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let accs=[];for(let t=0;t<3;t++){let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}accs.push(`${a}/${n}`);}
  console.log(`${label}: ${imgs.length}p [${imgs.map(i=>i.width+'x'+i.height).join(',')}] billed=${billed} density=${(C.length/billed).toFixed(1)} acc=[${accs.join(',')}]`);
  return billed;
}
// narrow-baseline: 312 cols (1568w), 22k cap, 728 tall
const narrow-baseline=await R.renderTextToPngsWithCharLimit(packed,312,22000,{aa:true},728);
const bp=await measure(narrow-baseline,'NARROW-BASELINE (1568w,728h)');
// nyx-optimal: 468 cols wide single page, 4096 tall cap
const nyx=await R.renderTextToPngsWithCharLimit(packed,468,999999,{aa:true},4096);
const bn=await measure(nyx,'NYX-OPT (wide 1pg)');
console.log(`\n>>> Nyx uses ${bn} vs narrow-baseline ${bp} tokens = ${((1-bn/bp)*100).toFixed(0)}% fewer`);
