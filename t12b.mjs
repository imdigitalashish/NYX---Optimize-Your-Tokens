import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const sharp=require('C:/Users/ASHISH~1/AppData/Local/Temp/narrow-baseline/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js');
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`worker_${i} zone_${i%8} status ${i%4===0?'degraded':'healthy'} latency ${50+(i*3)%400}ms.`);
 f[Math.floor(n*0.35)]=`IMPORTANT: connection pool max size 850 timeout 4200 ms.`;
 f[Math.floor(n*0.73)]=`CRITICAL: tax rate 1.08 fallback port 8443 grpc.`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout ms?',a:['4200']},{q:'tax rate?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const MODEL='gemini-3.1-pro-preview', C=prose(800), packed=R.reflow(C)??C; // ~50k chars
console.log(`\n=== T12b big-corpus downscale density | ${C.length}ch ===`);
// render wide at native, then downscale whole page. Smaller image but still 1 flat-billed page.
const base=(await R.renderTextToPngsWithCharLimit(packed,468,999999,{aa:true},4096))[0];
console.log('native:',base.width+'x'+base.height);
for(const f of [1.0,0.8,0.65,0.55]){
  const w=Math.round(base.width*f),h=Math.round(base.height*f);
  const png=new Uint8Array(await sharp(Buffer.from(base.png)).resize(w,h,{kernel:'lanczos3'}).png().toBuffer());
  const billed=await imageBilledTokens(MODEL,[{png}]);
  const ib=[{type:'text',text:'Rendered data (↵=newline):'},{type:'image_url',image_url:{url:`data:image/png;base64,${b64(png)}`}}];
  let accs=[];for(let t=0;t<2;t++){let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}accs.push(`${a}/${n}`);}
  console.log(`scale ${f} (${w}x${h}): billed=${billed} density=${(C.length/billed).toFixed(1)} acc=[${accs.join(',')}]`);
}
