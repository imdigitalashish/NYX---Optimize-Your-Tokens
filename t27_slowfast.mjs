import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
// old context (image): lots of history with a fact. recent (text): a follow-up referring to it.
const oldCtx=Array.from({length:200},(_,i)=>`turn ${i}: user asked about feature_${i%15}, assistant explained config_${i%8}`).join('\n')
  +'\nKEY DECISION: the team chose PostgreSQL over MongoDB because of ACID requirements and the max_connections was set to 850.';
const recentText='Recent conversation:\nUser: remind me what database we chose and the connection limit?';
const MODEL='gemini-3.1-pro-preview';
console.log(`\n=== T27 slow-fast: old=image + recent=text ===`);
const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(R.neutralizeSentinel(oldCtx))??oldCtx,468,38000,{aa:true},4096);
const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
const content=[{type:'text',text:'Older conversation history (rendered as image, ↵=newline):'}];
for(const im of imgs)content.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
content.push({type:'text',text:'\n'+recentText+'\n\nAnswer using BOTH the image history and recent text: which database and what connection limit?'});
const r=await ask(MODEL,content,80);
console.log('answer:',r.text.slice(0,150).replace(/\n/g,' '));
console.log(`db correct: ${grade(r.text,['postgres'])>0?'✓':'✗'}, limit correct: ${grade(r.text,['850'])>0?'✓':'✗'} | billed=${billed}`);
