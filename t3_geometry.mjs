// T3: PROVIDER-TUNED GEOMETRY. Measure the REAL billed-tokens(width,height) function for
// each provider by sending blank images of varied sizes and reading prompt_tokens.
// Then find the geometry that maximizes chars/token for EACH provider (they differ wildly).
import { ask, b64 } from './lib.mjs';
import { encodeGrayPng } from './png.bundle.mjs';

async function blankPng(w,h){ const px=new Uint8Array(w*h).fill(255); return await encodeGrayPng(px,w,h); }
async function billed(model,w,h){
  const png=await blankPng(w,h);
  const base=await ask(model,[{type:'text',text:'x'}],1);
  const wi=await ask(model,[{type:'text',text:'x'},{type:'image_url',image_url:{url:`data:image/png;base64,${b64(png)}`}}],1);
  if(!base.usage||!wi.usage) return null;
  return wi.usage.prompt_tokens-base.usage.prompt_tokens;
}

const MODELS=(process.argv[2]||'gemini-3.1-pro-preview,claude-opus-4.8,gpt-5.4').split(',');
// probe a grid of geometries
const SIZES=[[1568,728],[2048,2048],[3072,2048],[4096,2048],[4096,4096],[6144,4096]];
for(const model of MODELS){
  console.log(`\n=== ${model} : billed tokens by geometry ===`);
  console.log('WxH | Mpx | billedTok | tok/Mpx');
  for(const [w,h] of SIZES){
    const t=await billed(model,w,h);
    if(t===null){console.log(`${w}x${h} | FAIL`);continue;}
    const mpx=(w*h/1e6).toFixed(2);
    console.log(`${w}x${h} | ${mpx} | ${t} | ${(t/(w*h/1e6)).toFixed(0)}`);
  }
}
