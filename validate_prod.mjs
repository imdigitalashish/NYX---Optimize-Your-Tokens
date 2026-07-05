import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
// use the production tool to render
execSync('node "C:/Users/user/MicrosoftWork/nyx/render.mjs" --out ./_pval --provider gemini "C:/Users/user/investigationhistory/report-1.md"',{stdio:'ignore'});
const {readdirSync}=await import('fs');
const pages=readdirSync('./_pval').filter(f=>f.endsWith('.png')).sort();
const imgs=pages.map(p=>({png:new Uint8Array(readFileSync('./_pval/'+p))}));
const billed=await imageBilledTokens('gemini-3.1-pro-preview',imgs);
const ib=[{type:'text',text:'Rendered report investigation report (↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
const Q=[{q:'current owner team?',a:['team-a']},{q:'confidence value?',a:['0.80','0.8']},{q:'SubscriptionId GUID?',a:['1ced54cc']},{q:'fault code?',a:['10038']},{q:'container 46dec6db cluster?',a:['ch1prdapp07']}];
let a=0,n=0;for(const qq of Q){const r=await ask('gemini-3.1-pro-preview',[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
console.log(`PRODUCTION render: ${pages.length} page(s), billed=${billed} tokens, accuracy=${a}/${n}`);
import {rmSync} from 'fs'; rmSync('./_pval',{recursive:true,force:true});
