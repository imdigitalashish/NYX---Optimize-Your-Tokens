import * as R from './render.bundle.mjs';
function bigtext(chars){let s='';while(s.length<chars)s+='the quick brown fox jumps 0123456789 over lazy dog ';return s.slice(0,chars);}
console.log('\n=== T22 render latency ===');
for(const chars of [10000,50000,100000,200000]){
  const t=bigtext(chars), packed=R.neutralizeSentinel(t);
  const t0=performance.now();
  const imgs=await R.renderTextToPngsWithCharLimit(R.reflow(packed)??packed,468,38000,{aa:true},4096);
  const ms=performance.now()-t0;
  const bytes=imgs.reduce((a,i)=>a+i.png.length,0);
  console.log(`${chars}ch: ${imgs.length}p, ${ms.toFixed(0)}ms, ${(bytes/1024).toFixed(0)}KB PNG`);
}
