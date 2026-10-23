import fs from 'fs';
const ids=new Set(fs.readFileSync(process.argv[2],'utf8').split('\n').map(l=>l.split(' | ')[0]).filter(Boolean));
for(const b of ['1-samuel','2-samuel'])for(const f of fs.readdirSync(`content/${b}/intrebari`)){const j=JSON.parse(fs.readFileSync(`content/${b}/intrebari/${f}`));for(const q of j.questions)if(ids.has(q.id)){
 const o=q.opts?q.opts.map((x,i)=>((q.t==='one'?q.a===i:q.a.includes(i))?'*':'')+x).join(' | '):(q.t==='tf'?String(q.a):'');
 console.log(q.id+' ['+q.ref+'] '+q.q+' || '+o)}}
