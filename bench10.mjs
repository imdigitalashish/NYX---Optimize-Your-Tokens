// 10-TASK NYX BENCHMARK — real work docs from memory, Gemini + Opus, tokens + accuracy.
// Each task: a real file + ground-truth questions verified from episodic memory.
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import * as R from './render.bundle.mjs';
import { ask, b64, grade, imageBilledTokens } from './lib.mjs';

const H = homedir().replace(/\\/g,'/');
const T = `${H}/investigationhistory`;
const O = `${H}/Projects/OutageAgent/analysis`;

// 10 real tasks. Answers verified from episodic memory (ep_085..ep_099).
const TASKS = [
  { name:'report report-1 (LM misroute)', file:`${T}/report-1.md`, Q:[
    {q:'current owner team/queue?', a:['team-a']},
    {q:'the concrete hardware fault code number?', a:['10038']},
    {q:'classification confidence value?', a:['0.80','0.8']},
    {q:'was it misrouted or correctly routed to Host Networking?', a:['misrout']},
  ]},
  { name:'report report-3 (NIC link fault)', file:`${T}/report-3.md`, Q:[
    {q:'the physical cable part number (PN)?', a:['1002971321']},
    {q:'which team is the correct owner (CHIE...)?', a:['chie']},
    {q:'the NIC vendor / module type (ConnectX)?', a:['connectx-5','connectx']},
    {q:'is the fault on the NIC side or TOR side?', a:['nic']},
  ]},
  { name:'report report-2 (subsystem-x)', file:`${T}/report-2.md`, Q:[
    {q:'the RCA category (subsystem-fault-...)?', a:['subx','subfault']},
    {q:'the region of the affected node?', a:['spaincentral']},
    {q:'the owning team?', a:['team-a']},
    {q:'was BackplaneCrashes zero or nonzero?', a:['zero','0']},
  ]},
  { name:'report report-2 (claude report)', file:`${T}/claude-report-2.md`, Q:[
    {q:'what datapath component failed (subsystem-x)?', a:['subx','suby']},
    {q:'is this a real incident or a misroute?', a:['real']},
  ]},
];

// add up to 6 more from OutageAgent one-pagers (gist questions — read the finding)
const extraFiles = ['doc-7','755981689','doc-8','doc-9','759789961','760373336','761086382','doc-10'];
for (const id of extraFiles) {
  const f = `${O}/${id}/tto-reduction/one-pager.md`;
  if (existsSync(f) && TASKS.length < 10) {
    TASKS.push({ name:`TTO one-pager ${id}`, file:f, Q:[
      {q:'what report id does this analyze?', a:[id]},
      {q:'is the recommendation to shrink the window, or not? (yes/no shrink)', a:['no','not','neutral','unsafe','preserve']},
    ]});
  }
}

const MODELS = ['gemini-3.1-pro-preview','claude-opus-4.8'];
const PROFILE = {
  'gemini-3.1-pro-preview': { cols:468, cap:24000, wb:0, hb:0, mh:4096 },
  'claude-opus-4.8':        { cols:240, cap:22000, wb:3, hb:4, mh:2048 },
};

function renderFor(text, p){
  const packed = R.reflow(R.neutralizeSentinel(text)) ?? text;
  return R.renderTextToPngsWithCharLimit(packed, p.cols, p.cap, {aa:true, cellWBonus:p.wb, cellHBonus:p.hb}, p.mh);
}

const results = [];
for (const task of TASKS) {
  let text; try { text = readFileSync(task.file,'utf8'); } catch { console.error('skip',task.file); continue; }
  const textTokEst = Math.round(text.length/3.5);
  const row = { name:task.name, chars:text.length, textTokEst, per:{} };
  for (const model of MODELS) {
    const p = PROFILE[model];
    const imgs = await renderFor(text, p);
    const billed = await imageBilledTokens(model, imgs.map(i=>({png:i.png})));
    const ib = [{type:'text',text:'Rendered document (↵=newline):'}];
    for (const im of imgs) ib.push({type:'image_url',image_url:{url:`data:image/png;base64,${b64(im.png)}`}});
    let a=0,n=0;
    for (const qq of task.Q){ const r = await ask(model,[...ib,{type:'text',text:`\nQ:${qq.q}\nAnswer with only the value.`}],40); a+=grade(r.text,qq.a); n+=1; }
    row.per[model] = { pages:imgs.length, billed, acc:`${a}/${n}`, accNum:a/n };
    process.stdout.write(`.`);
  }
  results.push(row);
}
console.log('\n');
console.log(JSON.stringify(results,null,1));
import { writeFileSync } from 'node:fs';
writeFileSync('bench10_results.json', JSON.stringify(results,null,2));
