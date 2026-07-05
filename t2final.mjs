// T2-final: correct manual decode + compose 3 gray layers into RGB channels.
import * as R from './render.bundle.mjs';
import { encodeRgbPng } from './png.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';
import { inflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function decodeGray(png){
  let off=8,W=0,H=0,idat=[];
  while(off<png.length){
    const len=(png[off]<<24|png[off+1]<<16|png[off+2]<<8|png[off+3])>>>0;
    const type=String.fromCharCode(png[off+4],png[off+5],png[off+6],png[off+7]);
    const data=png.subarray(off+8,off+8+len);
    if(type==='IHDR'){W=(data[0]<<24|data[1]<<16|data[2]<<8|data[3])>>>0;H=(data[4]<<24|data[5]<<16|data[6]<<8|data[7])>>>0;}
    if(type==='IDAT')idat.push(Buffer.from(data));
    if(type==='IEND')break;
    off+=12+len;
  }
  const raw=inflateSync(Buffer.concat(idat));
  const px=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)px[y*W+x]=raw[y*(W+1)+1+x]; // filter 0
  return {W,H,px};
}
async function composeRGB(layers){
  const W=Math.max(...layers.map(l=>l.W)),H=Math.max(...layers.map(l=>l.H));
  const rgb=new Uint8Array(W*H*3).fill(255);
  layers.forEach((L,ci)=>{ for(let y=0;y<L.H;y++)for(let x=0;x<L.W;x++){
    const v=L.px[y*L.W+x]; if(v>200)continue; // white bg, skip
    const idx=(y*W+x)*3;
    // this layer's text -> pure channel color: zero the OTHER channels
    for(let k=0;k<3;k++) if(k!==ci) rgb[idx+k]=0;
  }});
  return await encodeRgbPng(rgb,W,H);
}

const MODEL=process.argv[2]||'gemini-3.1-pro-preview';
const lr="RED_SECRET=crimson_4200\n"+Array.from({length:15},(_,i)=>`red data row ${i} alpha ${i*3}`).join('\n');
const lg="GREEN_SECRET=emerald_8443\n"+Array.from({length:15},(_,i)=>`green data row ${i} beta ${i*5}`).join('\n');
const lb="BLUE_SECRET=azure_westus2\n"+Array.from({length:15},(_,i)=>`blue data row ${i} gamma ${i*7}`).join('\n');
console.log(`\n=== T2-final color-channel packing | ${MODEL} ===`);
const pages=await Promise.all([lr,lg,lb].map(t=>R.renderTextToPngs(t)));
const grays=pages.map(p=>decodeGray(p[0].png));
const rgbPng=await composeRGB(grays);
writeFileSync('t2final.png',rgbPng);
console.log('composed',grays[0].W+'x'+grays[0].H,rgbPng.length,'bytes | ink counts:',grays.map(g=>g.px.filter(v=>v<200).length));

const content=[{type:'text',text:'This image has three overlapping text layers: one in pure RED, one pure GREEN, one pure BLUE, on white.'},
 {type:'image_url',image_url:{url:`data:image/png;base64,${b64(rgbPng)}`}},
 {type:'text',text:'\nRead the RED text: RED_SECRET=? Read the GREEN text: GREEN_SECRET=? Read the BLUE text: BLUE_SECRET=?'}];
const r=await ask(MODEL,content,200);
console.log('ANSWER:\n'+r.text);
console.log('[truth: crimson_4200 / emerald_8443 / azure_westus2]');
console.log('read:',grade(r.text,['crimson_4200','emerald_8443','azure_westus2'])+'/3');
