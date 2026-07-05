import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
function codebase(files){
  let s='';
  for(let f=0;f<files;f++){
    s+=`\n===== module_${f}.js =====\n`;
    for(let i=0;i<40;i++)s+=`function handler_${f}_${i}(req){ return process_${i%5}(req.data_${i}, config_${f}); }\n`;
    if(f===Math.floor(files*0.4))s+=`const SECRET_KEY = "sk_live_max850_timeout4200_z";\n`;
    if(f===Math.floor(files*0.8))s+=`const BILLING = { tax: 1.08, port: 8443, proto: "grpc" };\n`;
  }
  return s;
}
const MODEL='gemini-3.1-pro-preview', C=codebase(60);
const textTokEst=Math.round(C.length/3.5);
console.log(`\n=== T26 huge context | ${C.length}ch (~${textTokEst} text tokens) ===`);
const Q=[{q:'what is in SECRET_KEY (the string)?',a:['max850','sk_live']},{q:'BILLING tax value?',a:['1.08']},{q:'BILLING port?',a:['8443']}];
const packed=R.reflow(R.neutralizeSentinel(C))??C;
const imgs=await R.renderTextToPngsWithCharLimit(packed,468,38000,{aa:true},4096);
const billed=await imageBilledTokens(MODEL,imgs.map(i=>({png:i.png})));
const ib=[{type:'text',text:'A codebase, many modules (===== markers, ↵=newline):'}];for(const im of imgs)ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
let a=0,n=0;for(const qq of Q){const r=await ask(MODEL,[...ib,{type:'text',text:`\nQ:${qq.q}\nOnly value.`}],40);a+=grade(r.text,qq.a);n+=qq.a.length;}
console.log(`${imgs.length}p billed=${billed} (${(100*(1-billed/textTokEst)).toFixed(0)}% fewer than text est) acc=${a}/${n}`);
