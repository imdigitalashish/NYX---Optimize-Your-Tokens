import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
const MODEL='gemini-3.1-pro-preview';
const samples={
  json: {text:JSON.stringify(Array.from({length:150},(_,i)=>({id:i,name:`svc_${i}`,port:8000+i,active:i%2===0,config:{timeout:i===75?4200:1000,retries:i%5}})),null,1),
         Q:[{q:'timeout of the item with id 75?',a:['4200']},{q:'port of item id 50?',a:['8050']}]},
  yaml: {text:Array.from({length:120},(_,i)=>`service_${i}:\n  port: ${9000+i}\n  replicas: ${i%5+1}\n  region: ${i===60?'westus2':'eastus'}`).join('\n'),
         Q:[{q:'region of service_60?',a:['westus2']},{q:'port of service_30?',a:['9030']}]},
  log: {text:Array.from({length:200},(_,i)=>`2026-07-05T${String(i%24).padStart(2,'0')}:00:00 [${i%10===0?'ERROR':'INFO'}] svc_${i%12} req_${i} took ${i*7%900}ms ${i===140?'FATAL: db pool exhausted max=850':''}`).join('\n'),
       Q:[{q:'what max value in the FATAL message?',a:['850']},{q:'roughly how many log lines?',a:['200']}]},
};
console.log(`\n=== T36 diverse formats ===`);
for(const [fmt,{text,Q}] of Object.entries(samples)){
  const packed=R.reflow(R.neutralizeSentinel(text))??text;
  const imgs=await R.renderTextToPngsWithCharLimit(packed,468,24000,{aa:true},4096);
  const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
  const ib=[{type:'text',text:`Rendered ${fmt} (↵=newline):`}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\n${qq.q} Only value.`}],30);a+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${fmt}: ${text.length}ch ${imgs.length}p billed=${billed} acc=${a}/${n}`);
}
