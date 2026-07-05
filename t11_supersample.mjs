import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`worker_${i} zone_${i%8} status ${i%4===0?'degraded':'healthy'} latency ${50+(i*3)%400}ms.`);
 f[Math.floor(n*0.35)]=`IMPORTANT: connection pool max size 850 timeout 4200 ms.`;
 f[Math.floor(n*0.73)]=`CRITICAL: tax rate 1.08 fallback port 8443 grpc.`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout ms?',a:['4200']},{q:'tax rate?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const MODEL=process.argv[2], C=prose(120), packed=R.reflow(C)??C;
console.log(`\n=== T11 supersample/AA | ${MODEL} | ${C.length}ch ===`);
// AA on vs off at same cell sizes — does AA (grayscale) read better than 1-bit for GPT/Gemini?
const cfgs=[
 ['1bit 5x8',{aa:false,cellWBonus:0,cellHBonus:0}],
 ['AA 5x8',{aa:true,cellWBonus:0,cellHBonus:0}],
 ['AA 6x10',{aa:true,cellWBonus:1,cellHBonus:2}],
 ['AA 8x12',{aa:true,cellWBonus:3,cellHBonus:4}],
];
for(const [name,style] of cfgs){
  const imgs=await R.renderTextToPngsWithCharLimit(packed,240,999999,style,2048);
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Rendered data (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${name}: billed=${billed} density=${(C.length/billed).toFixed(1)} acc=${a}/${n}`);
}
