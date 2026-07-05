// Nyx research harness. Measures (chars/billed-token density) AND (accuracy) AND (latency)
// for any render strategy, live against real vision models.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
export const TOKEN = JSON.parse(readFileSync(homedir()+'/.pi/agent/auth.json','utf8'))['github-copilot'].access;
export const URL='https://api.githubcopilot.com/chat/completions';
export const HEAD={'Authorization':`Bearer ${TOKEN}`,'Content-Type':'application/json','Copilot-Integration-Id':'vscode-chat','Editor-Version':'vscode/1.99.0','Copilot-Vision-Request':'true'};
export function b64(b){let s='';const c=0x8000;for(let i=0;i<b.length;i+=c)s+=String.fromCharCode(...b.subarray(i,i+c));return btoa(s);}

export async function ask(model, content, maxtok=250){
  for(let a=0;a<5;a++){
    try{
      const r=await fetch(URL,{method:'POST',headers:HEAD,body:JSON.stringify({model,max_completion_tokens:maxtok,messages:[{role:'user',content}]})});
      const t=await r.text();let j;try{j=JSON.parse(t)}catch{await new Promise(s=>setTimeout(s,2000));continue}
      if(j.error){await new Promise(s=>setTimeout(s,2000));continue}
      return {text:(j.choices?.[0]?.message?.content||'').trim(), usage:j.usage};
    }catch{await new Promise(s=>setTimeout(s,2500))}
  }
  return {text:'', usage:null};
}

// billed image tokens = prompt_tokens(image+tiny prompt) - prompt_tokens(tiny prompt alone)
export async function imageBilledTokens(model, imgs){
  const base = await ask(model, [{type:'text',text:'x'}], 1);
  const content=[{type:'text',text:'x'}];
  for(const im of imgs) content.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
  const withImg = await ask(model, content, 1);
  if(!base.usage||!withImg.usage) return null;
  return withImg.usage.prompt_tokens - base.usage.prompt_tokens;
}

export function grade(answer, truths){ return truths.filter(t=>answer.toLowerCase().includes(t.toLowerCase())).length; }
