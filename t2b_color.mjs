// T2b: fixed composition — 3 layers as saturated pure colors on WHITE.
// R-layer text = pure red (255,0,0), G-layer = green, B-layer = blue, on white bg.
// This is the most legible possible channel encoding. If the model still can't read
// a named color's text, channel-packing is dead for these encoders.
import * as R from './render.bundle.mjs';
import { encodeRgbPng } from './png.bundle.mjs';
import { ask, b64, grade } from './lib.mjs';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { Image, createCanvas } = require(process.env.NAPI);

function pngToInk(png){ // returns per-pixel ink amount (0=white bg, 255=full ink)
  const img=new Image(); img.src=Buffer.from(png);
  const w=img.width,h=img.height,cv=createCanvas(w,h),ctx=cv.getContext('2d');
  ctx.drawImage(img,0,0); const d=ctx.getImageData(0,0,w,h).data;
  const ink=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) ink[i]=255-d[i*4]; // dark pixel -> high ink
  return {width:w,height:h,ink};
}
async function composeColors(layers){
  const w=Math.max(...layers.map(l=>l.width)),h=Math.max(...layers.map(l=>l.height));
  const rgb=new Uint8Array(w*h*3).fill(255); // white
  layers.forEach((L,ci)=>{ for(let y=0;y<L.height;y++)for(let x=0;x<L.width;x++){
    const a=L.ink[y*L.width+x]/255; if(a<0.15)continue;
    const idx=(y*w+x)*3;
    // paint this layer's color: darken the OTHER two channels so text shows as pure color
    for(let k=0;k<3;k++){ if(k!==ci) rgb[idx+k]=Math.min(rgb[idx+k], Math.round(255*(1-a))); }
  }});
  return await encodeRgbPng(rgb,w,h);
}

const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
const lr="RED_SECRET=crimson_4200\n"+Array.from({length:20},(_,i)=>`red line ${i} data alpha`).join('\n');
const lg="GREEN_SECRET=emerald_8443\n"+Array.from({length:20},(_,i)=>`green line ${i} data beta`).join('\n');
const lb="BLUE_SECRET=azure_westus2\n"+Array.from({length:20},(_,i)=>`blue line ${i} data gamma`).join('\n');
console.log(`\n=== T2b saturated-color packing | ${MODEL} ===`);
const pages=await Promise.all([lr,lg,lb].map(t=>R.renderTextToPngs(t)));
const inks=pages.map(p=>pngToInk(p[0].png));
const png=await composeColors(inks);
writeFileSync('t2b_rgb.png',png);
console.log('composed',inks[0].width+'x'+inks[0].height,'bytes',png.length);
const content=[{type:'text',text:'This image contains three overlapping text layers in RED, GREEN, and BLUE ink on white.'},
 {type:'image_url',image_url:{url:`data:image/png;base64,${b64(png)}`}},
 {type:'text',text:'\nReading ONLY the red-colored text: what is RED_SECRET? Only green text: GREEN_SECRET? Only blue text: BLUE_SECRET?'}];
const r=await ask(MODEL,content,200);
console.log('ANSWER:\n'+r.text);
console.log('[truth: crimson_4200 / emerald_8443 / azure_westus2]');
console.log('read:',grade(r.text,['crimson_4200','emerald_8443','azure_westus2'])+'/3');
