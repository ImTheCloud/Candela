const fs = require('fs');
const path = require('path');

const qData = {
  "27": {
    "easy": [
      { t: "tf", ref: "27:1", q: "David s-a gândit în inima lui că va pieri într-o zi ucis de mâna lui Saul.", a: true },
      { t: "one", ref: "27:3", q: "Câte neveste avea David cu el la Gat?", opts: ["Una", "Două", "Trei"], a: 1 },
      { t: "tf", ref: "27:4", q: "Când Saul a aflat că David a fugit la Gat, a continuat să-l caute.", a: false }
    ],
    "hard": [
      { t: "one", ref: "27:6", q: "Cărui regat i-a aparținut Țiclagul de atunci încolo?", opts: ["Lui Iuda", "Lui Israel", "Filistenilor"], a: 0 },
      { t: "tf", ref: "27:11", q: "David aducea bărbați și femei vii la Gat ca să fie robi.", a: false }
    ]
  },
  "5": {
    "easy": [
      { t: "one", ref: "5:4", q: "Ce părți din Dagon erau tăiate pe prag?", opts: ["Capul și picioarele", "Capul și cele două mâini", "Mâinile și picioarele"], a: 1 },
      { t: "tf", ref: "5:5", q: "Preoții lui Dagon calcă pe pragul casei lui Dagon din Asdod până în ziua de azi.", a: false },
      { t: "one", ref: "5:9", q: "Ce fel de spuzeală au avut oamenii din Gat?", opts: ["Spuzeală de lepră", "Spuzeală de bube la șezut", "O iritație pe față"], a: 1 }
    ],
    "hard": [
      { t: "tf", ref: "5:11", q: "În tot Ecronul era o groază de moarte.", a: true },
      { t: "fill", ref: "5:12", q: "Oamenii care nu mureau erau loviți cu bube la șezut, și țipetele cetății se înălțau până la ___.", a: ["cer"] }
    ]
  },
  "7": {
    "easy": [
      { t: "tf", ref: "7:2", q: "Chivotul a stat în Chiriat-Iearim doar zece ani.", a: false },
      { t: "one", ref: "7:3", q: "Pe cine le-a cerut Samuel israeliților să slujească?", opts: ["Numai Domnului", "Lui Dumnezeu și lui Baal", "Îngerilor"], a: 0 },
      { t: "tf", ref: "7:8", q: "Israeliții i-au cerut lui Samuel să nu înceteze să strige către Domnul.", a: true }
    ],
    "hard": [
      { t: "fill", ref: "7:13", q: "Mâna Domnului a fost împotriva filistenilor în tot timpul vieții lui ___.", a: ["Samuel"] },
      { t: "multi", ref: "7:16", q: "În ce cetăți se ducea Samuel în fiecare an să judece pe Israel?", opts: ["Betel", "Ghilgal", "Mițpa"], a: [0, 1, 2] }
    ]
  },
  "6": {
    "easy": [
      { t: "one", ref: "6:5", q: "Cui trebuiau să dea slavă filistenii?", opts: ["Lui Dagon", "Dumnezeului lui Israel", "Împăratului lor"], a: 1 },
      { t: "tf", ref: "6:9", q: "Dacă vacile se duceau spre Bet-Șemeș, însemna că Domnul a făcut acel mare rău filistenilor.", a: true },
      { t: "one", ref: "6:12", q: "Cum mergeau vacile spre Bet-Șemeș?", opts: ["Liniștit", "Mugind", "Sărind"], a: 1 }
    ],
    "hard": [
      { t: "tf", ref: "6:18", q: "Piatra cea mare din câmpul lui Iosua adeverește și astăzi unde au pus chivotul.", a: true },
      { t: "fill", ref: "6:20", q: "Oamenii din Bet-Șemeș au zis: „Cine poate sta înaintea Domnului, înaintea acestui Dumnezeu ___?”", a: ["sfânt"] }
    ]
  },
  "8": {
    "easy": [
      { t: "one", ref: "8:1", q: "Când a pus Samuel pe fiii săi judecători?", opts: ["Când a îmbătrânit", "Când era tânăr", "După biruința de la Mițpa"], a: 0 },
      { t: "tf", ref: "8:3", q: "Fiii lui Samuel au călcat pe urmele lui și au fost drepți.", a: false },
      { t: "one", ref: "8:7", q: "Pe cine a zis Domnul că a lepădat poporul?", opts: ["Pe Samuel", "Pe Domnul", "Pe judecători"], a: 1 }
    ],
    "hard": [
      { t: "tf", ref: "8:10", q: "Samuel a ascuns cuvintele Domnului de popor.", a: false },
      { t: "fill", ref: "8:22", q: "Samuel a zis bărbaților lui Israel: „Duceți-vă fiecare în ___ lui.”", a: ["cetatea"] }
    ]
  },
  "11": {
    "easy": [
      { t: "tf", ref: "11:3", q: "Bătrânii din Iabes au cerut un răgaz de zece zile.", a: false },
      { t: "one", ref: "11:5", q: "De unde se întorcea Saul când a auzit de Iabes?", opts: ["De la luptă", "De la câmp, în urma boilor", "Din călătorie"], a: 1 },
      { t: "fill", ref: "11:6", q: "Cum a auzit Saul aceste lucruri, ___ lui Dumnezeu a venit peste el.", a: ["Duhul"] }
    ],
    "hard": [
      { t: "tf", ref: "11:11", q: "Saul a pătruns în tabăra amoniților în straja nopții.", a: false },
      { t: "one", ref: "11:14", q: "Unde a chemat Samuel poporul ca să întărească împărăția?", opts: ["La Ierusalim", "La Ghilgal", "La Rama"], a: 1 }
    ]
  },
  "3": {
    "easy": [
      { t: "one", ref: "3:1", q: "Cum erau vedeniile în vremea aceea?", opts: ["Dese", "Rare și nu erau dese", "Peste tot"], a: 1 },
      { t: "tf", ref: "3:2", q: "Eli avea ochii tulburi și nu mai putea să vadă bine.", a: true },
      { t: "tf", ref: "3:6", q: "După a doua chemare, Samuel a știut imediat că e Domnul.", a: false }
    ],
    "hard": [
      { t: "fill", ref: "3:18", q: "Samuel i-a istorisit tot, fără să-i ___ nimic.", a: ["ascundă"] },
      { t: "multi", ref: "3:19", q: "Ce făcea Domnul pentru Samuel care creștea?", opts: ["Era cu el", "L-a făcut preot mare", "N-a lăsat să cadă la pământ niciunul din cuvintele sale"], a: [0, 2] }
    ]
  },
  "21": {
    "easy": [
      { t: "one", ref: "21:1", q: "Cum a venit David la Ahimelec la Nob?", opts: ["Cu o oaste", "Singur", "Cu Samuel"], a: 1 },
      { t: "tf", ref: "21:5", q: "David i-a spus lui Ahimelec că oamenii lui sunt curați.", a: true },
      { t: "tf", ref: "21:7", q: "Doeg era un israelit, căpetenia preoților.", a: false }
    ],
    "hard": [
      { t: "fill", ref: "21:12", q: "David a pus la ___ cuvintele acestea și s-a temut mult de Achiș.", a: ["inimă"] },
      { t: "one", ref: "21:15", q: "Ce a întrebat Achiș când l-a văzut pe David făcând pe nebunul?", opts: ["Vreți să mă omoare?", "Îmi lipsesc oare nebunii?", "Cine este acesta?"], a: 1 }
    ]
  },
  "4": {
    "easy": [
      { t: "tf", ref: "4:3", q: "Bătrânii lui Israel au știut din prima că Domnul i-a lăsat să fie bătuți.", a: true },
      { t: "one", ref: "4:5", q: "Cum au reacționat israeliții la venirea chivotului?", opts: ["Au plâns", "Au scos strigăte de bucurie", "Au fugit"], a: 1 },
      { t: "tf", ref: "4:7", q: "Filistenii au zis că nu a mai fost așa ceva până atunci.", a: true }
    ],
    "hard": [
      { t: "fill", ref: "4:14", q: "Eli, auzind aceste strigăte, a zis: „Ce înseamnă ___ aceasta?”", a: ["zarva"] },
      { t: "one", ref: "4:20", q: "Ce i-au spus femeile nurorii lui Eli înainte să moară?", opts: ["Nu te teme, căci ai născut un fiu!", "Ridică-te!", "Roagă-te!"], a: 0 }
    ]
  },
  "28": {
    "easy": [
      { t: "one", ref: "28:1", q: "Cine i-a spus lui David: „Vei veni cu mine la oștire”?", opts: ["Saul", "Achiș", "Ionatan"], a: 1 },
      { t: "tf", ref: "28:4", q: "Saul a strâns tot Israelul și a tăbărât la Ghilboa.", a: true },
      { t: "fill", ref: "28:12", q: "Când a văzut pe Samuel, femeia a scos un ___ mare.", a: ["țipăt"] }
    ],
    "hard": [
      { t: "one", ref: "28:15", q: "De ce l-a chemat Saul pe Samuel?", opts: ["Ca să-l certe", "Să-i arate ce să facă", "Să se roage pentru el"], a: 1 },
      { t: "multi", ref: "28:23", q: "Cine a stăruit de Saul să mănânce?", opts: ["Slujitorii lui", "Ionatan", "Femeia"], a: [0, 2] }
    ]
  },
  "13": {
    "easy": [
      { t: "tf", ref: "13:3", q: "Saul a sunat cu trâmbița prin toată țara ca să audă evreii.", a: true },
      { t: "one", ref: "13:4", q: "Unde a fost adunat poporul la Saul?", opts: ["La Ghilgal", "La Rama", "La Ierusalim"], a: 0 },
      { t: "tf", ref: "13:11", q: "Samuel a venit exact când poporul se aduna lângă Saul.", a: false }
    ],
    "hard": [
      { t: "one", ref: "13:19", q: "Cine împiedica pe evrei să-și facă săbii?", opts: ["Domnul", "Filistenii", "Amaleciții"], a: 1 },
      { t: "fill", ref: "13:22", q: "Doar Saul și fiul său ___ aveau sabie și suliță.", a: ["Ionatan"] }
    ]
  },
  "1": {
    "easy": [
      { t: "tf", ref: "1:4", q: "Când aducea jertfa, Elcana dădea părți lui Penina și copiilor ei.", a: true },
      { t: "one", ref: "1:12", q: "La ce se uita Eli cu băgare de seamă când Ana se ruga?", opts: ["La mâinile ei", "La gura ei", "La ochii ei"], a: 1 },
      { t: "fill", ref: "1:14", q: "Eli i-a zis: „Până când vei fi beată? Du-te de te ___.”", a: ["trezește"] }
    ],
    "hard": [
      { t: "tf", ref: "1:19", q: "După rugăciune, fața Anei n-a mai fost aceeași.", a: true },
      { t: "one", ref: "1:28", q: "Pentru cât timp l-a închinat Ana pe Samuel Domnului?", opts: ["Pentru 10 ani", "Toată viața lui", "Până la tinerețe"], a: 1 }
    ]
  },
  "16": {
    "easy": [
      { t: "tf", ref: "16:2", q: "Samuel l-a întrebat pe Domnul cum să meargă fără să-l omoare Saul.", a: true },
      { t: "one", ref: "16:3", q: "Ce i-a spus Domnul lui Samuel să ia cu el?", opts: ["Un vițel pentru jertfă", "O oaie", "Un țap"], a: 0 },
      { t: "tf", ref: "16:8", q: "Abinadab a fost alesul Domnului.", a: false }
    ],
    "hard": [
      { t: "fill", ref: "16:18", q: "Un slujitor a zis că David știe să cânte, este viteaz, războinic, vorbește bine și ___ este cu el.", a: ["Domnul"] },
      { t: "one", ref: "16:21", q: "Ce slujbă a primit David de la Saul inițial?", opts: ["Purtător de arme (străjer)", "Paharnic", "Bucătar"], a: 0 }
    ]
  },
  "18": {
    "easy": [
      { t: "tf", ref: "18:3", q: "Ionatan a făcut legământ cu David, pentru că îl iubea ca pe sufletul lui.", a: true },
      { t: "one", ref: "18:9", q: "Cum îl privea Saul pe David din ziua aceea?", opts: ["Cu ochi răi", "Cu bucurie", "Cu mândrie"], a: 0 },
      { t: "tf", ref: "18:12", q: "Saul nu se temea de David, pentru că era mai puternic ca el.", a: false }
    ],
    "hard": [
      { t: "fill", ref: "18:14", q: "David propășea în toate căile lui, și ___ era cu el.", a: ["Domnul"] },
      { t: "one", ref: "18:22", q: "Ce le-a poruncit Saul slujitorilor săi să-i spună lui David în taină?", opts: ["Să fugă", "Că împăratul e binevoitor și să-i fie ginere", "Să renunțe la Mical"], a: 1 }
    ]
  },
  "19": {
    "easy": [
      { t: "tf", ref: "19:6", q: "Când a auzit glasul lui Ionatan, Saul a jurat că David va muri.", a: false },
      { t: "one", ref: "19:12", q: "Pe unde l-a coborât Mical pe David ca să fugă?", opts: ["Pe fereastră", "Prin ușa din spate", "Prin acoperiș"], a: 0 },
      { t: "fill", ref: "19:15", q: "Saul a trimis din nou oameni să-l vadă pe David, zicând: „Aduceți-l la mine în ___, ca să-l omor.”", a: ["pat"] }
    ],
    "hard": [
      { t: "tf", ref: "19:20", q: "Când trimișii lui Saul au văzut prorocii, Duhul lui Dumnezeu a venit și peste ei.", a: true },
      { t: "multi", ref: "19:23", q: "Peste cine a venit Duhul lui Dumnezeu pe drumul spre Naiot?", opts: ["Peste Ionatan", "Peste Saul", "Peste Abner"], a: [1] }
    ]
  },
  "26": {
    "easy": [
      { t: "tf", ref: "26:14", q: "David a strigat către Abner, mustrându-l.", a: true }
    ],
    "hard": [
      { t: "fill", ref: "26:24", q: "Cum a fost viața ta de scumpă azi înaintea mea, așa să fie și viața mea de scumpă înaintea ___.", a: ["Domnului"] }
    ]
  }
};

const dir = path.join(process.cwd(), 'content', '1-samuel', 'intrebari');

for (const chStr in qData) {
  const ch = parseInt(chStr);
  let file = 'ch';
  if (ch < 10) file += '0' + ch;
  else file += ch;
  file += '.json';
  const filePath = path.join(dir, file);
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check if they are already added to prevent duplicates on rerun
    // simple check based on length, or just add them blindly if we trust the run once
    // A better way is to check the first question text
    const firstQText = qData[chStr].easy[0].q;
    const exists = data.easy.some(q => q.q === firstQText);
    
    if (!exists) {
        data.easy.push(...qData[chStr].easy);
        data.hard.push(...qData[chStr].hard);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 1) + '\n', 'utf8');
        console.log(`Updated ${file}: +${qData[chStr].easy.length} easy, +${qData[chStr].hard.length} hard`);
    } else {
        console.log(`Skipped ${file} - questions seem to exist already.`);
    }
  }
}
