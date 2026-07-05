import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
const MODEL='gemini-3.1-pro-preview';
function mkdoc(seed){const f=[];for(let i=0;i<250;i++)f.push(`rec_${seed}_${i}: svc_${i%12} zone_${i%7} val ${(i*seed*7)%9999} status ${i%3===0?'err':'ok'}`);
 f[60]=`CONFIG_${seed}: limit=${800+seed*10} timeout=${4000+seed*100}`;f[180]=`RATE_${seed}: factor=${(1+seed*0.03).toFixed(2)} port=${8400+seed}`;return {text:f.join('\n'),Q:[{q:`CONFIG_${seed} limit?`,a:[`${800+seed*10}`]},{q:`CONFIG_${seed} timeout?`,a:[`${4000+seed*100}`]},{q:`RATE_${seed} port?`,a:[`${8400+seed}`]}]};}
console.log(`\n=== T28 statistical validation (5 docs x 3 trials) ===`);
let pxTok=[],nyxTok=[],pxAcc=[],nyxAcc=[];
for(let s=1;s<=5;s++){
  const {text,Q}=mkdoc(s), packed=R.reflow(R.neutralizeSentinel(text))??text;
  const pxImgs=await R.renderTextToPngsWithCharLimit(packed,312,22000,{aa:true},728);
  const nyxImgs=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
  const pxB=await imageBilledTokens(MODEL,pxImgs.map(i=>({png:i.png})));
  const nyxB=await imageBilledTokens(MODEL,nyxImgs.map(i=>({png:i.png})));
  pxTok.push(pxB);nyxTok.push(nyxB);
  const mkib=imgs=>{const ib=[{type:'text',text:'Data(↵=nl):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});return ib;};
  for(let t=0;t<3;t++){
    let pa=0,na=0,n=0;for(const qq of Q){
      const rp=await ask(MODEL,[...mkib(pxImgs),{type:'text',text:`\n${qq.q} Only value.`}],30);
      const rn=await ask(MODEL,[...mkib(nyxImgs),{type:'text',text:`\n${qq.q} Only value.`}],30);
      pa+=grade(rp.text,qq.a);na+=grade(rn.text,qq.a);n+=qq.a.length;
    }
    pxAcc.push(pa/n);nyxAcc.push(na/n);
  }
  process.stdout.write(`doc${s} `);
}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log(`\nnarrow-baseline:  avg ${avg(pxTok).toFixed(0)} tok, acc ${(100*avg(pxAcc)).toFixed(0)}%`);
console.log(`nyx-v2:  avg ${avg(nyxTok).toFixed(0)} tok, acc ${(100*avg(nyxAcc)).toFixed(0)}%`);
console.log(`nyx saves ${(100*(1-avg(nyxTok)/avg(pxTok))).toFixed(0)}% tokens vs narrow-baseline, accuracy delta ${(100*(avg(nyxAcc)-avg(pxAcc))).toFixed(0)}pp`);
