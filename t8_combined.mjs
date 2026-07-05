// T8: COMBINED PIPELINE — salience(T7) + optimal-geometry(T3) + density-knee(T1).
// Question 1: does salience let a BIGGER doc fit in one readable flat-billed page?
// Question 2: head-to-head vs narrow-baseline on the SAME real-ish large doc.
import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';

function proseCorpus(n){
  const f=[];
  for(let i=0;i<n;i++) f.push(`The service named worker_${i} was deployed to the region called zone_${i%8} and currently has a status of ${i%4===0?'degraded':'healthy'} with measured latency of ${50+(i*3)%400} milliseconds averaged over the reporting period for this instance.`);
  f[Math.floor(n*0.35)]=`IMPORTANT: The database connection pool for the primary shard has a maximum size of exactly 850 connections and a timeout of 4200 milliseconds.`;
  f[Math.floor(n*0.73)]=`CRITICAL: The billing tax rate for the western region is exactly 1.08 and the fallback endpoint runs on port 8443 using grpc.`;
  return f.join('\n');
}
const STOP=new Set('the a an is are was were be been being to of in on at for and or but with that this it its as by from has have had will would can could should may might must not no over this'.split(' '));
function salience(t){return t.split('\n').map(l=>l.split(/\s+/).filter(w=>!STOP.has(w.toLowerCase().replace(/[^a-z0-9_]/g,''))).join(' ')).join('\n');}
const Q=[{q:'max connection pool size?',a:['850']},{q:'pool timeout ms?',a:['4200']},{q:'western tax rate?',a:['1.08']},{q:'fallback port?',a:['8443']},{q:'fallback protocol?',a:['grpc']}];
const MODEL=process.argv[2]||'gemini-3.1-pro-preview';

async function evalRender(imgs,label,srcChars){
  const billed=await imageBilledTokens(MODEL,imgs);
  const ib=[{type:'text',text:'Rendered data (↵=newline; stopwords may be dropped, infer meaning):'}];
  for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let accs=[];for(let t=0;t<2;t++){let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}accs.push(`${a}/${n}`);}
  console.log(`${label}: ${imgs.length}p [${imgs.map(i=>i.width+'x'+i.height).join(',')}] billed=${billed} src=${srcChars}ch acc=[${accs.join(',')}]`);
  return billed;
}

console.log(`\n=== T8 combined pipeline | ${MODEL} ===`);
// Big doc: 200 prose lines (~46k chars full)
const FULL=proseCorpus(400), COMP=salience(FULL);
console.log(`full ${FULL.length}ch, salience ${COMP.length}ch (${(100*COMP.length/FULL.length).toFixed(0)}%)`);

// A) narrow-baseline baseline: 1568w, 728h, its default
const px=await R.renderTextToPngsWithCharLimit(R.reflow(FULL)??FULL, 312, 22000, {aa:true}, 728);
const bpx=await evalRender(px,'NARROW-BASELINE (full text, 1568w)', FULL.length);
// B) Nyx T3 geometry, full text
const t3=await R.renderTextToPngsWithCharLimit(R.reflow(FULL)??FULL, 408, 999999, {aa:true}, 4096);
const bt3=await evalRender(t3,'NYX-T3 (full text, 2048w 1pg)', FULL.length);
// C) Nyx T3+T7: salience + optimal geometry
const t8=await R.renderTextToPngsWithCharLimit(R.reflow(COMP)??COMP, 408, 999999, {aa:true}, 4096);
const bt8=await evalRender(t8,'NYX-T8 (salience + 2048w 1pg)', COMP.length);

console.log(`\n>>> T8 vs narrow-baseline: ${bt8} vs ${bpx} tokens = ${((1-bt8/bpx)*100).toFixed(0)}% fewer`);
