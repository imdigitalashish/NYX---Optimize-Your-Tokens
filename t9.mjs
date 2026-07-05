import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`worker_${i} zone_${i%8} status ${i%4===0?'degraded':'healthy'} latency ${50+(i*3)%400}ms.`);
 f[Math.floor(n*0.35)]=`IMPORTANT: connection pool max size 850 timeout 4200 ms.`;
 f[Math.floor(n*0.73)]=`CRITICAL: tax rate 1.08 fallback port 8443 grpc.`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout ms?',a:['4200']},{q:'tax rate?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const MODEL=process.argv[2], C=prose(80); // small ~4k, LOW density, big glyphs
console.log(`\n=== T9 ${MODEL} | ${C.length}ch, low density, styles ===`);
// try: bitmap 5x8, AA gray, and AA gray with bigger cells (cellHBonus)
const styles=[['bitmap',{aa:false}],['AA-gray',{aa:true}],['AA-big',{aa:true,cellWBonus:2,cellHBonus:2}]];
for(const [name,style] of styles){
  const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(C)??C,240,4000,style,728);
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Rendered data (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${name}: ${imgs.length}p [${imgs.map(i=>i.width+'x'+i.height).join(',')}] billed=${billed} acc=${a}/${n}`);
}
