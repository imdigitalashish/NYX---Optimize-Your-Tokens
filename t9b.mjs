import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`worker_${i} zone_${i%8} status ${i%4===0?'degraded':'healthy'} latency ${50+(i*3)%400}ms.`);
 f[Math.floor(n*0.35)]=`IMPORTANT: connection pool max size 850 timeout 4200 ms.`;
 f[Math.floor(n*0.73)]=`CRITICAL: tax rate 1.08 fallback port 8443 grpc.`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout ms?',a:['4200']},{q:'tax rate?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const MODEL=process.argv[2], C=prose(120);
console.log(`\n=== T9b ${MODEL} | ${C.length}ch | cell-size sweep ===`);
for(const [wb,hb] of [[0,0],[2,2],[4,4],[6,6]]){
  const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(C)??C,240,999999,{aa:true,cellWBonus:wb,cellHBonus:hb},2048);
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Rendered data (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`cell +${wb}x+${hb} (${5+wb}x${8+hb}px): ${imgs.length}p billed=${billed} density=${(C.length/billed).toFixed(1)} acc=${a}/${n}`);
}
