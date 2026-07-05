// T3b: THE BIG ONE. Gemini bills ~1080 tok FLAT up to 25Mpx. If it can READ text in a
// huge image, density explodes. Render the SAME corpus at narrow-baseline geometry (1568 wide)
// vs BIG geometry (wider canvas, more chars/page) and compare density + accuracy.
import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';

function corpus(n){
  const l=[];
  for(let i=0;i<n;i++) l.push(`row ${i}: item_${i} status=${i%3===0?'active':'idle'} weight=${(i*7)%100} tag=grp${i%12} extra=payload_${i}`);
  l[Math.floor(n*0.23)]=`row ${Math.floor(n*0.23)}: SECRET timeout=4200 region=westus2 retries=7`;
  l[Math.floor(n*0.57)]=`row ${Math.floor(n*0.57)}: THRESHOLD max_conn=850 tax_rate=1.08 mode=strict`;
  l[Math.floor(n*0.85)]=`row ${Math.floor(n*0.85)}: ENDPOINT host=api.internal port=8443 proto=grpc`;
  return l.join('\n');
}
const Q=[{q:'timeout in SECRET row?',a:['4200']},{q:'region in SECRET?',a:['westus2']},{q:'tax_rate in THRESHOLD?',a:['1.08']},{q:'max_conn in THRESHOLD?',a:['850']},{q:'port in ENDPOINT?',a:['8443']}];

const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
const C=corpus(1500); // big corpus ~100k chars
console.log(`\n=== T3b big-geometry density | ${MODEL} | corpus ${C.length} chars ===`);
const packed=R.reflow(C)??C;

// configs: [cols, maxCharsPerPage, label]. Wider cols = wider image = more chars/page.
const CONFIGS=[
  [312, 22000, 'narrow-baseline-safe (1568w, 22k/pg)'],
  [312, 90000, 'tall (1568w, 90k/pg)'],
  [624, 90000, 'wide2x (3136w, 90k/pg)'],
  [936, 180000,'wide3x (4704w, 180k/pg)'],
];
for(const [cols,cap,label] of CONFIGS){
  const imgs=await R.renderTextToPngsWithCharLimit(packed, cols, cap, {aa:true}, 4096);
  const billed=await imageBilledTokens(MODEL, imgs);
  if(!billed){console.log(`${label}: FAIL`);continue;}
  const dims=imgs.map(i=>`${i.width}x${i.height}`).join(',');
  const density=(C.length/billed).toFixed(1);
  const ib=[{type:'text',text:'Read the rendered data (↵ = line break):'}];
  for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  let acc=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly the value.`}],40);acc+=grade(r.text,qq.a);n+=qq.a.length;}
  console.log(`${label}: ${imgs.length}p [${dims}] billed=${billed} density=${density} char/tok acc=${acc}/${n}`);
}
