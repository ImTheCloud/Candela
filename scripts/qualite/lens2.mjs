import fs from 'fs';
const out=[];
for(const b of ['1-samuel','2-samuel'])for(const f of fs.readdirSync(`content/${b}/intrebari`)){
  const j=JSON.parse(fs.readFileSync(`content/${b}/intrebari/${f}`));
  for(const q of j.questions){
    if(!['14-15','16-17','18+'].includes(q.age))continue;
    if(q.t!=='one'&&q.t!=='multi')continue;
    const L=q.opts.map(o=>o.length);
    const right=q.t==='one'?[q.a]:q.a;
    const wrongI=L.map((_,i)=>i).filter(i=>!right.includes(i));
    if(!right.length||!wrongI.length)continue;
    const avgR=right.reduce((s,i)=>s+L[i],0)/right.length;
    const avgW=wrongI.reduce((s,i)=>s+L[i],0)/wrongI.length;
    const maxW=Math.max(...wrongI.map(i=>L[i]));
    // flag: every wrong option clearly shorter than the shortest right one, or every wrong clearly longer than the longest right
    const minR=Math.min(...right.map(i=>L[i])),maxR=Math.max(...right.map(i=>L[i]));
    const minW=Math.min(...wrongI.map(i=>L[i]));
    const shortW = maxW < minR*0.72 && minR-maxW>9;
    const longW = minW > maxR*1.38 && minW-maxR>9;
    const longR = minR > maxW*1.38 && minR-maxW>9;
    if(shortW||longW||longR) out.push({id:q.id,t:q.t,age:q.age,f:`${b.slice(0,1)}S${f.slice(2,4)}`,kind:shortW?'wrongShort':longW?'wrongLong':'rightLong',q:q.q,opts:q.opts,a:q.a});
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out,null,1));
const c={};for(const o of out){const k=o.t+' '+o.kind;c[k]=(c[k]||0)+1}
console.log(out.length,c);
