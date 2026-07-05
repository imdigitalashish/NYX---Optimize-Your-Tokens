import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function corpus(n){const l=[];for(let i=0;i<n;i++)l.push(`row ${i}: item_${i} status=${i%3===0?'active':'idle'} weight=${(i*7)%100} tag=grp${i%12}`);
 l[Math.floor(n*0.23)]=`row ${Math.floor(n*0.23)}: SECRET timeout=4200 region=westus2`;
 l[Math.floor(n*0.57)]=`row ${Math.floor(n*0.57)}: THRESHOLD max_conn=850 tax_rate=1.08`;
 l[Math.floor(n*0.85)]=`row ${Math.floor(n*0.85)}: ENDPOINT port=8443 proto=grpc`;return l.join('\n');}
const Q=[{q:'timeout in SECRET?',a:['4200']},{q:'region in SECRET?',a:['westus2']},{q:'tax_rate?',a:['1.08']},{q:'max_conn?',a:['850']},{q:'port in ENDPOINT?',a:['8443']}];
const MODEL='gemini-3.1-pro-preview';
// find single-page char count that stays readable. Vary corpus size, force 1 page, big canvas.
for(const rows of [300,450,600,800,1000]){
  const C=corpus(rows), packed=R.reflow(C)??C;
  // single page, wide enough to hold all on one image at 4096 tall cap
  const imgs=await R.renderTextToPngsWithCharLimit(packed, 468, 999999, {aa:true}, 4096);
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Read the data (↵=newline):'}];
  for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let acc=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);acc+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${C.length}ch ${imgs.length}p [${imgs.map(i=>i.width+'x'+i.height).join(',')}] billed=${billed} density=${(C.length/billed).toFixed(1)} acc=${acc}/${n}`);
}
