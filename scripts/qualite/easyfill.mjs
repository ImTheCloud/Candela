import fs from 'fs';
const root=process.cwd() + '/content';
const write=process.argv[2]==='write';
const nw=(s)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const WORD=/[\p{L}][\p{L}\-]*[\p{L}]|[\p{L}]/gu;
const STOP=new Set(`cine unde cand cum ceva inaintea venit ajuns raspuns spus zis facut mers dat luat avut vazut ridicat pus adus trimis aflat auzit intors stat zicand zicea numit chemat ochii fiul lanturi acesta acestui acesta aceasta acestea acestui acestei acestor acesti aceia aceea acelea atunci pentru caci fiindca dupa inainte intre peste toate toti toata aceasta oricine nimeni inapoi impreuna fiecare acolo aici inca numai chiar tocmai atata caruia carora adica deoarece totusi oarecare altfel astfel atat cand unde cum daca insa dara ori nici sau fara spre sub prin dintre dintr cateva cativa catre langa pana decat acum apoi deci iata fiecare niste vreun vreo alta alte altul altii alti altele sunt este erau eram esti fost fiind fiindca voi vom vor veti sale sale tale mele nostru noastra voastra vostru noastre voastre lumea ceea celor celui celei cele celelalte ceilalti ceea ceva cineva multi multe mult multa putin putina mai bine rau aceste acestia acelasi aceeasi tuturor totul tot fieare oricare oricum oricat chiar macar abia imediat curand mereu totdeauna odata iarasi iarasi nimic nimeni nicio niciun niciodata inapoi`.split(/\s+/));
const EASY=new Set(`domnul domnului dumnezeu dumnezeul dumnezeului israel israelului israelitii israelitilor filistenii filistenilor filisteni chivotul chivotului imparatul imparatului imparat imparati poporul poporului popor preotul preotului preoti preotii jertfa jertfe jertfele altar altarul rugaciune rugaciunea sabia sabie sulita cetatea cetate cetatii casa casei cortul templul mormant mormantul vrajmasii vrajmasul vrajmas pacat pace razboi lupta oaste oastea ostasi pamantul pamant muntele muntelui apa cuvantul cuvantul cuvant glasul glas inima sufletul copilul copii fiul fiii fiu fiica nevasta femeia barbatul omul oamenii oameni fratele fratii frate tatal mama slujitorii slujitor sluga robul robii prorocul proroc prorocii vedenie vis noaptea ziua dimineata seara cantare cantarea laudat bucurie bucurat plans plangea plans fugit fugi uns uns uns uns ungere cununa tronul scaunul pastor oile oi turma boi boii masa mancare painea paine vin untdelemn untdelemnul aur argint`.split(/\s+/));
// corpus frequency
const freq={};
const texts={};
for(const b of ['1-samuel','2-samuel']){texts[b]=JSON.parse(fs.readFileSync(`${root}/${b}/text-cornilescu.json`));for(const vs of Object.values(texts[b]))for(const v of vs)for(const w of v.match(WORD)||[])freq[nw(w)]=(freq[nw(w)]||0)+1}
function parse(ref){const out=[];let ch=0;for(const part of ref.split(/[,;]/).map(s=>s.trim()).filter(Boolean)){const m=part.match(/^(?:(\d+):)?(\d+)(?:-(?:(\d+):)?(\d+))?$/);if(m[1])ch=+m[1];const from=+m[2],toCh=m[3]?+m[3]:ch,to=m[4]?+m[4]:from;out.push({ch,from,toCh,to});ch=toCh}return out}
function verses(ref,text){const o=[];for(const r of parse(ref))for(let c=r.ch;c<=r.toCh;c++){const vs=text[c];const f=c===r.ch?r.from:1,l=c===r.toCh?r.to:vs.length;for(let v=f;v<=l;v++)o.push(vs[v-1])}return o}
const RANK={sub12:0,'12-13':0,'14-15':0,'16-17':1,'18+':2};
let changed=0,total=0;const samples=[];
for(const b of ['1-samuel','2-samuel'])for(const f of fs.readdirSync(`${root}/${b}/intrebari`)){
  const p=`${root}/${b}/intrebari/${f}`;const j=JSON.parse(fs.readFileSync(p));let ch=false;
  const used={};
  for(const q of j.questions){
    if(q.t!=='fill')continue;total++;
    const joined=verses(q.ref,texts[b]).join(' ');
    const toks=[...joined.matchAll(WORD)].map(m=>({w:m[0],i:m.index,n:nw(m[0])}));
    const count={};for(const t of toks)count[t.n]=(count[t.n]||0)+1;
    const cands=toks.map((t,k)=>{
      if(count[t.n]!==1||t.w.length<4||STOP.has(t.n))return null;
      if(t.w.includes('-')&&(!/^[A-ZĂÂÎȘȚ]/.test(t.w)||t.w.split('-').some(x=>x.length<3)))return null;
      const mid=t.i>0&&/^[A-ZĂÂÎȘȚ]/.test(t.w)&&!/[.!?„"‘“:]\s*$/.test(joined.slice(Math.max(0,t.i-3),t.i));
      let s=Math.min(freq[t.n]||0,400);
      if(EASY.has(t.n))s*=3;
      if(mid)s*=2;
      if(/^(trei|patru|cinci|sase|sapte|opt|noua|zece|doua|doi|[a-z]+zeci|suta|mie)$/.test(t.n))s*=0.3;
      if(t.w.length<5)s*=0.6;
      if((freq[t.n]||0)<4&&!mid)s*=0.2;
      return {...t,s,tier:(EASY.has(t.n)||mid)?1:2};
    }).filter(Boolean).sort((a,b)=>a.tier-b.tier||b.s-a.s);
    if(!cands.length)continue;
    const key=q.ref+'|'+q.age;used[key]??=0;
    let r=Math.min(RANK[q.age]+used[key],cands.length-1);
    // rank only if the candidate is still a common word
    while(r>0&&(cands[r].s<6||cands[r].tier>cands[0].tier))r--;
    const c=cands[r];used[key]++;
    const nq=joined.slice(0,c.i)+'___'+joined.slice(c.i+c.w.length);
    if(nq!==q.q||q.a[0]!==c.w){
      if(samples.length<25&&Math.random()<0.03)samples.push(q.age+' '+c.w+' <- '+q.a[0]+' | '+nq.slice(0,110));
      if(write){q.q=nq;q.a=[c.w];ch=true}changed++;
    }
  }
  if(write&&ch)fs.writeFileSync(p,JSON.stringify(j,null,1)+'\n');
}
console.log({total,changed});console.log(samples.join('\n'));
