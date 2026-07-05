import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
import { readFileSync } from 'fs';
const MODEL='gemini-3.1-pro-preview';
const files=[
  {path:'C:/Users/user/MicrosoftWork/ServicesSRE-Experiments/projects/zpi-harness/packages/ai/src/providers/source-code-file',
   Q:[{q:'allowed image media_type values?',a:['image/jpeg','image/png']},{q:'placeholder text for images-only message?',a:['see attached']}]},
  {path:'C:/Users/user/investigationhistory/report-1.md',
   Q:[{q:'current owner team?',a:['team-a']},{q:'confidence?',a:['0.80','0.8']},{q:'fault code?',a:['10038']}]},
];
console.log(`\n=== T20 real-world: v2(reflow+wide) vs narrow-baseline(1568) | ${MODEL} ===`);
for(const {path,Q} of files){
  const text=readFileSync(path,'utf8');
  const name=path.split('/').pop();
  async function ev(cols,cap,mh,label){
    const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(text)??text,cols,cap,{aa:true},mh);
    const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
    const ib=[{type:'text',text:'Rendered file (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
    let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
    console.log(`  ${name} ${label}: ${imgs.length}p billed=${billed} acc=${a}/${n}`);
    return billed;
  }
  const tt=(await ask(MODEL,[{type:'text',text:text+'\nOK'}],1)).usage?.prompt_tokens;
  console.log(`${name} (${text.length}ch, text=${tt}tok):`);
  const px=await ev(312,22000,728,'narrow-baseline');
  const v2=await ev(468,38000,4096,'nyx-v2');
  console.log(`  >>> nyx-v2 ${v2} vs narrow-baseline ${px} (${((1-v2/px)*100).toFixed(0)}% fewer) vs text ${tt} (${((1-v2/tt)*100).toFixed(0)}% fewer)`);
}
