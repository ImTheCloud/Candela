import fs from 'fs';
const patch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = process.cwd() + '/content';
const by={};
for (const [id, q] of Object.entries(patch)) { const [pre, ch] = id.split('.'); const book = pre === '1sa' ? '1-samuel' : '2-samuel'; (by[`${root}/${book}/intrebari/ch${String(ch).padStart(2,'0')}.json`] ??= []).push([id,q]); }
let n=0;
for (const [f,list] of Object.entries(by)) { const j=JSON.parse(fs.readFileSync(f,'utf8')); for (const [id,t] of list){const q=j.questions.find(x=>x.id===id); if(!q){console.error('missing',id);continue} q.q=t;n++} fs.writeFileSync(f,JSON.stringify(j,null,1)+'\n'); }
console.log('patched',n);
