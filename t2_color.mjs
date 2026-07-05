// T2: COLOR-CHANNEL PACKING (robust version using napi-canvas to decode)
import * as R from './render.bundle.mjs';
import { encodeRgbPng } from './png.bundle.mjs';
import { ask, b64, grade } from './lib.mjs';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { Image, createCanvas } = require(process.env.NAPI);

function pngToGray(png){
  const img = new Image(); img.src = Buffer.from(png);
  const w=img.width,h=img.height;
  const cv=createCanvas(w,h); const ctx=cv.getContext('2d');
  ctx.drawImage(img,0,0);
  const d=ctx.getImageData(0,0,w,h).data; // RGBA
  const gray=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) gray[i]=d[i*4]; // R channel ~ luminance for gray png
  return {width:w,height:h,px:gray};
}
async function composeRGB(layers){
  const w=Math.max(...layers.map(l=>l.width)), h=Math.max(...layers.map(l=>l.height));
  const rgb=new Uint8Array(w*h*3).fill(255);
  layers.forEach((L,ci)=>{ for(let y=0;y<L.height;y++)for(let x=0;x<L.width;x++){ const v=L.px[y*L.width+x]; const idx=(y*w+x)*3+ci; rgb[idx]=Math.min(rgb[idx],v);} });
  return await encodeRgbPng(rgb,w,h);
}

const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
const layerR="RED CHANNEL\n"+Array.from({length:40},(_,i)=>`r${i}: alpha_${i}=${i*3}`).join('\n')+"\nRED_SECRET=crimson_4200";
const layerG="GREEN CHANNEL\n"+Array.from({length:40},(_,i)=>`g${i}: beta_${i}=${i*5}`).join('\n')+"\nGREEN_SECRET=emerald_8443";
const layerB="BLUE CHANNEL\n"+Array.from({length:40},(_,i)=>`b${i}: gamma_${i}=${i*7}`).join('\n')+"\nBLUE_SECRET=azure_westus2";

console.log(`\n=== T2 color-channel packing | ${MODEL} ===`);
const pages=await Promise.all([layerR,layerG,layerB].map(t=>R.renderTextToPngs(t)));
const grays=pages.map(p=>pngToGray(p[0].png));
const rgbPng=await composeRGB(grays);
writeFileSync('t2_rgb.png',rgbPng);
console.log('composed',grays[0].width+'x'+grays[0].height,'bytes',rgbPng.length);

const content=[{type:'text',text:'This image encodes THREE independent text layers in the RED, GREEN and BLUE color channels (each layer is dark text tinted in its channel color).'},
 {type:'image_url',image_url:{url:`data:image/png;base64,${b64(rgbPng)}`}},
 {type:'text',text:'\nQ1: RED_SECRET value? Q2: GREEN_SECRET value? Q3: BLUE_SECRET value?'}];
const r=await ask(MODEL,content,200);
console.log('ANSWER:\n'+r.text);
console.log('\n[truth: crimson_4200 / emerald_8443 / azure_westus2]');
console.log('channels read:',grade(r.text,['crimson_4200','emerald_8443','azure_westus2'])+'/3');
