import fs from 'fs';
const patch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = process.cwd() + '/content';
let n=0;
for (const [id, tail] of Object.entries(patch)) {
  const [pre, ch] = id.split('.'); const book = pre === '1sa' ? '1-samuel' : '2-samuel';
  const f = `${root}/${book}/intrebari/ch${String(ch).padStart(2,'0')}.json`;
  const j = JSON.parse(fs.readFileSync(f,'utf8')); const q=j.questions.find(x=>x.id===id);
  if(!q){console.error('missing',id);continue}
  const m=q.q.match(/^[^:?]*: /);
  q.q=(m?m[0]:'')+tail; fs.writeFileSync(f,JSON.stringify(j,null,1)+'\n'); n++;
}
console.log('patched',n);
