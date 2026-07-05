import * as R from './render.bundle.mjs';
import { ask, imageBilledTokens, grade, b64 } from './lib.mjs';
function makeCorpus(){const l=[];for(let i=0;i<600;i++)l.push(`row ${i}: item_${i} status=${i%3===0?'active':'idle'} weight=${(i*7)%100} tag=grp${i%12}`);l[137]='row 137: SECRET timeout=4200 region=westus2 retries=7 owner=platform-team';l[342]='row 342: THRESHOLD max_conn=850 tax_rate=1.08 mode=strict fallback=queue';l[501]='row 501: ENDPOINT host=api.internal.example port=8443 proto=grpc ttl=300';return l.join('\n');}
const Q=[{q:'timeout in SECRET row?',a:['4200']},{q:'region in SECRET row?',a:['westus2']},{q:'tax_rate in THRESHOLD?',a:['1.08']},{q:'max_conn in THRESHOLD?',a:['850']},{q:'port in ENDPOINT?',a:['8443']},{q:'total rows nearest hundred?',a:['600']}];
const CORPUS=makeCorpus(), MODEL='gemini-3.1-pro-preview', packed=R.reflow(CORPUS)??CORPUS;
for(const cap of [18000,22000,28080]){
  let accs=[];
  for(let trial=0;trial<3;trial++){
    const imgs=await R.renderTextToPngsWithCharLimit(packed,R.DENSE_CONTENT_COLS,cap);
    const ib=[{type:'text',text:'Read the rendered data (↵ marks line breaks):'}];
    for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
    let acc=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly the value.`}],60);acc+=grade(r.text,qq.a);n+=qq.a.length;}
    accs.push(`${acc}/${n}`);
  }
  console.log(`cap ${cap}: trials [${accs.join(', ')}]`);
}
