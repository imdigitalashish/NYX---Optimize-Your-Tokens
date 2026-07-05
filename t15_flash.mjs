import { ask, b64, imageBilledTokens, grade } from './lib.mjs';
import { encodeGrayPng } from './png.bundle.mjs';
import * as R from './render.bundle.mjs';
async function blank(w,h){return await encodeGrayPng(new Uint8Array(w*h).fill(255),w,h);}
const MODEL=process.argv[2]||'gemini-3.5-flash';
console.log(`\n=== T15 billing + readability | ${MODEL} ===`);
// billing curve
for(const [w,h] of [[768,768],[1568,728],[2048,2048],[4096,4096]]){
  const base=await ask(MODEL,[{type:'text',text:'x'}],1);
  const wi=await ask(MODEL,[{type:'text',text:'x'},{type:'image_url',image_url:{url:`data:image/png;base64,${b64(await blank(w,h))}`}}],1);
  const t=(base.usage&&wi.usage)?wi.usage.prompt_tokens-base.usage.prompt_tokens:'FAIL';
  console.log(`${w}x${h} (${(w*h/1e6).toFixed(1)}Mpx): ${t} tok`);
}
// readability at density
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`worker_${i} zone_${i%8} status ${i%4===0?'degraded':'healthy'} latency ${50+(i*3)%400}ms`);
 f[Math.floor(n*0.35)]=`IMPORTANT: pool max size 850 timeout 4200 ms`;f[Math.floor(n*0.73)]=`CRITICAL: tax 1.08 port 8443 grpc`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout?',a:['4200']},{q:'tax?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const C=prose(400),packed=R.reflow(C)??C;
const imgs=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
const ib=[{type:'text',text:'Data (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
console.log(`readability: ${C.length}ch ${imgs.length}p billed=${billed} density=${(C.length/billed).toFixed(1)} acc=${a}/${n}`);
