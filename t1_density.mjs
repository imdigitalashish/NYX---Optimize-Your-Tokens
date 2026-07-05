// T1: How dense can we pack before frontier models lose accuracy?
// narrow-baseline uses ~28080 chars/page (5x8 glyphs at 1568x728). We push PAST that by cramming
// more chars into the same billed page (API downsamples -> smaller effective glyphs),
// measuring density (chars/token) and accuracy at each level.
import * as R from './render.bundle.mjs';
import { ask, imageBilledTokens, grade, b64 } from './lib.mjs';

// Corpus with gradeable embedded facts (gist + verbatim mix)
function makeCorpus(){
  const lines=[];
  for(let i=0;i<600;i++) lines.push(`row ${i}: item_${i} status=${i%3===0?'active':'idle'} weight=${(i*7)%100} tag=grp${i%12}`);
  lines[137]='row 137: SECRET timeout=4200 region=westus2 retries=7 owner=platform-team';
  lines[342]='row 342: THRESHOLD max_conn=850 tax_rate=1.08 mode=strict fallback=queue';
  lines[501]='row 501: ENDPOINT host=api.internal.example port=8443 proto=grpc ttl=300';
  return lines.join('\n');
}
const Q=[
 {q:'what is the timeout value in the SECRET row?',a:['4200']},
 {q:'what region in the SECRET row?',a:['westus2']},
 {q:'what tax_rate in the THRESHOLD row?',a:['1.08']},
 {q:'what max_conn in the THRESHOLD row?',a:['850']},
 {q:'what port in the ENDPOINT row?',a:['8443']},
 {q:'how many total rows are there roughly (nearest hundred)?',a:['600']},
];

const CORPUS=makeCorpus();
const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
// chars-per-page levels: narrow-baseline default 28080, then push denser
const LEVELS=[10000, 14000, 18000, 22000, 28080];

console.log(`\n=== T1 density sweep | ${MODEL} | corpus ${CORPUS.length} chars ===`);
console.log('cap/page | pages | billedTok | chars/tok | acc');
const packed = R.reflow(CORPUS) ?? CORPUS;
for(const cap of LEVELS){
  const imgs = await R.renderTextToPngsWithCharLimit(packed, R.DENSE_CONTENT_COLS, cap);
  const billed = await imageBilledTokens(MODEL, imgs);
  if(!billed){ console.log(`${cap} | ${imgs.length} | FAILED`); continue; }
  const density = (CORPUS.length/billed).toFixed(1);
  // accuracy (2 trials avg)
  let acc=0,n=0;
  const ib=[{type:'text',text:'Read the rendered data (↵ marks line breaks):'}];
  for(const im of imgs) ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  for(const qq of Q){
    let h=0; for(let t=0;t<2;t++){ const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ: ${qq.q}\nAnswer with only the value.`}],60); h+=grade(r.text,qq.a);} 
    acc+=h/2; n+=qq.a.length;
  }
  console.log(`${cap} | ${imgs.length}p | ${billed} | ${density} char/tok | ${acc}/${n} (${(100*acc/n).toFixed(0)}%)`);
}
