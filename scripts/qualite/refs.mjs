import fs from 'fs';
const root=process.cwd() + '/content';
const write=process.argv[2]==='write';
const nw=(s)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const STOP=new Set('acesta aceasta pentru care dupa inainte intre peste toti toate care cand unde catre dintre mai fost este erau sunt avea avut lui lor sale fara spre prin sub'.split(' '));
const toks=(s)=>nw(s).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!STOP.has(w));
const sup=(opt,verse)=>{const t=toks(opt);if(!t.length)return 0;const v=toks(verse).map(x=>x.slice(0,5));return t.filter(w=>v.includes(w.slice(0,5))).length/t.length};
let fixed=0,checked=0;const ex=[];
for(const b of ['1-samuel','2-samuel']){
  const text=JSON.parse(fs.readFileSync(`${root}/${b}/text-cornilescu.json`));
  for(const f of fs.readdirSync(`${root}/${b}/intrebari`)){
    const p=`${root}/${b}/intrebari/${f}`;const j=JSON.parse(fs.readFileSync(p));let ch=false;const vs=text[j.ch];
    for(const q of j.questions){
      if(q.t!=='one'&&q.t!=='multi'&&!(q.t==='tf'&&q.a===true))continue;
      const m=q.ref.match(/^(\d+):(\d+)(?:-(\d+))?$/);if(!m||+m[1]!==j.ch)continue;
      let from=+m[2],to=m[3]?+m[3]:from;
      const right=q.t==='tf'?[q.q.replace(/^În capitolul „[^”]*”: /,'')]:(q.t==='one'?[q.a]:q.a).map(i=>q.opts[i]);
      checked++;
      let nf=from,nt=to;
      for(const o of right){
        const inRange=Math.max(...Array.from({length:to-from+1},(_,k)=>sup(o,vs[from-1+k]||'')));
        if(inRange>=0.4)continue;
        // look for a verse that supports it better
        let best=-1,bs=0;for(let v=Math.max(1,from-3);v<=Math.min(vs.length,to+3);v++){const s=sup(o,vs[v-1]);if(s>bs){bs=s;best=v}}
        if(best>0&&bs>=0.34&&bs>inRange+0.15){nf=Math.min(nf,best);nt=Math.max(nt,best)}
      }
      if((nf!==from||nt!==to)&&nt-nf<=4){
        const ref=nf===nt?`${j.ch}:${nf}`:`${j.ch}:${nf}-${nt}`;
        if(ex.length<14)ex.push(`${q.id} ${q.ref} -> ${ref} | ${q.q} | ${right.join(' / ')}`);
        if(write){q.ref=ref;ch=true}fixed++;
      }
    }
    if(write&&ch)fs.writeFileSync(p,JSON.stringify(j,null,1)+'\n');
  }
}
console.log({checked,fixed});console.log(ex.join('\n'));
