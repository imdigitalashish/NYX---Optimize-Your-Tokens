import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function prose(n){const f=[];for(let i=0;i<n;i++)f.push(`The service worker_${i} was deployed to the region zone_${i%8} and it currently has a status of ${i%4===0?'degraded':'healthy'} with a latency of ${50+(i*3)%400} milliseconds.`);
 f[Math.floor(n*0.35)]=`IMPORTANT: The primary shard connection pool has a maximum size of 850 and a timeout of 4200 ms.`;
 f[Math.floor(n*0.73)]=`CRITICAL: The western region tax rate is 1.08 and the fallback port is 8443 using grpc.`;return f.join('\n');}
const Q=[{q:'pool max size?',a:['850']},{q:'timeout ms?',a:['4200']},{q:'tax rate?',a:['1.08']},{q:'port?',a:['8443']},{q:'protocol?',a:['grpc']}];
const MODEL='gemini-3.1-pro-preview';
const STOP=new Set('the a an is are was were be been to of in on at for and or but with that this it its as by from has have had will would over currently and it a'.split(' '));
const compressors={
  none: t=>t,
  stopwords: t=>t.split('\n').map(l=>l.split(/\s+/).filter(w=>!STOP.has(w.toLowerCase().replace(/[^a-z0-9_]/g,''))).join(' ')).join('\n'),
  dropvowels: t=>t.split('\n').map(l=>l.split(/\s+/).map(w=>/[0-9]/.test(w)||w.length<=3?w:w.replace(/(?<!^)[aeiou]/gi,'')).join(' ')).join('\n'),
  both: t=>{const s=t.split('\n').map(l=>l.split(/\s+/).filter(w=>!STOP.has(w.toLowerCase().replace(/[^a-z0-9_]/g,''))).join(' ')).join('\n');return s.split('\n').map(l=>l.split(/\s+/).map(w=>/[0-9]/.test(w)||w.length<=3?w:w.replace(/(?<!^)[aeiou]/gi,'')).join(' ')).join('\n');},
};
const FULL=prose(300);
console.log(`\n=== T14 compression variants | ${MODEL} | full ${FULL.length}ch ===`);
for(const [name,fn] of Object.entries(compressors)){
  const C=fn(FULL);
  const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(C)??C,468,38000,{aa:true},4096);
  const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
  const ib=[{type:'text',text:'Rendered data (↵=newline; text may be compressed/abbreviated, infer meaning):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let accs=[];for(let t=0;t<2;t++){let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}accs.push(`${a}/${n}`);}
  console.log(`${name}: ${C.length}ch (${(100*C.length/FULL.length).toFixed(0)}%) ${imgs.length}p billed=${billed} acc=[${accs.join(',')}]`);
}
