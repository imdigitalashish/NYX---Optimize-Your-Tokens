import { writeFileSync } from 'fs';
const W=820,H=520,M={l:80,r:180,t:60,b:70};
const pw=W-M.l-M.r,ph=H-M.t-M.b;
// data: Mpx vs billed tokens for 3 providers
const data={
 'Gemini 3.1':{c:'#1a73e8',pts:[[0.59,1089],[1.14,1078],[4.19,1089],[8.39,1081],[16.78,1089],[25.17,1080]]},
 'Opus 4.8':{c:'#d93025',pts:[[0.59,787],[1.14,1459],[1.57,2075],[4.19,4764],[8.39,4235],[25.17,4707]]},
 'GPT-5.4':{c:'#188038',pts:[[0.59,692],[1.14,1353],[1.57,1844],[4.19,2805],[8.39,2340],[25.17,2692]]},
};
const xmax=26,ymax=5000;
const X=v=>M.l+v/xmax*pw, Y=v=>M.t+(1-v/ymax)*ph;
let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="13"><rect width="${W}" height="${H}" fill="#fff"/>`;
s+=`<text x="${W/2}" y="30" text-anchor="middle" font-size="17" font-weight="bold">Image billing by size — the discovery that beats narrow-baseline</text>`;
for(let y=0;y<=5000;y+=1000){const py=Y(y);s+=`<line x1="${M.l}" y1="${py}" x2="${M.l+pw}" y2="${py}" stroke="#eee"/><text x="${M.l-8}" y="${py+4}" text-anchor="end" fill="#666">${y}</text>`;}
for(let x=0;x<=25;x+=5){const px=X(x);s+=`<text x="${px}" y="${M.t+ph+20}" text-anchor="middle" fill="#666">${x}</text>`;}
s+=`<text x="${M.l+pw/2}" y="${H-15}" text-anchor="middle" font-weight="bold">Image size (megapixels)</text>`;
s+=`<text x="20" y="${M.t+ph/2}" text-anchor="middle" font-weight="bold" transform="rotate(-90 20 ${M.t+ph/2})">Billed tokens</text>`;
let ly=M.t+15;
for(const[name,{c,pts}]of Object.entries(data)){
  let d='';pts.forEach((p,i)=>{d+=(i?'L':'M')+X(p[0])+' '+Y(p[1])+' '});
  s+=`<path d="${d}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
  for(const p of pts)s+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3" fill="${c}"/>`;
  s+=`<circle cx="${M.l+pw+18}" cy="${ly}" r="5" fill="${c}"/><text x="${M.l+pw+30}" y="${ly+4}">${name}</text>`;ly+=22;
}
s+=`<text x="${M.l+pw+18}" y="${ly+12}" font-size="11" fill="#1a73e8">Gemini: FLAT ~1080</text>`;
s+=`<text x="${M.l+pw+18}" y="${ly+28}" font-size="11" fill="#666">= pack big, pay once</text>`;
s+='</svg>';
writeFileSync('billing_curves.svg',s);
console.log('wrote billing_curves.svg');
