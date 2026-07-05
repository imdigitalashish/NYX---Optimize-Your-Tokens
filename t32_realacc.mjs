import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
import { readFileSync } from 'fs';
const MODEL='gemini-3.1-pro-preview';
const text=readFileSync('C:/Users/user/investigationhistory/report-1.md','utf8');
const Q=[
 {q:'current owner team/queue?',a:['team-a']},
 {q:'previous owner?',a:['oneflleetnode','onefleetnode','livemigration']},
 {q:'severity?',a:['sev3','3']},
 {q:'classification confidence value?',a:['0.80','0.8']},
 {q:'exact SubscriptionId GUID?',a:['1ced54cc-6302-4b85-a902-7ffb1ed57b1f']},
 {q:'concrete fault code number?',a:['10038']},
 {q:'container 46dec6db resolved to which cluster?',a:['ch1prdapp07']},
 {q:'node for source NodeId 869d0a63?',a:['sat12prdapp35']},
 {q:'misrouted or correct routing?',a:['misrout']},
 {q:'monitor/alert name?',a:['getlmfailureatsubleveldata']},
];
const packed=R.reflow(R.neutralizeSentinel(text))??text;
const imgs=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
const ib=[{type:'text',text:'report investigation report (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
console.log(`\n=== T32 rigorous real accuracy | ${text.length}ch, ${imgs.length}p, ${billed}tok ===`);
let correct=0;const results=[];
for(const qq of Q){
  const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly the value.`}],40);
  const ok=grade(r.text,qq.a)>0;if(ok)correct++;
  results.push(`${ok?'✓':'✗'} ${qq.q.slice(0,30)}`);
}
console.log(results.join('\n'));
console.log(`\nACCURACY: ${correct}/${Q.length} (${(100*correct/Q.length).toFixed(0)}%) at ${billed} tokens (1 page)`);
