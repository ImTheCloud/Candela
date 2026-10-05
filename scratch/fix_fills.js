const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'content', '1-samuel', 'intrebari');

const fixes = [
  { file: 'ch05.json', a: ['rămână', 'apasă'], keepIdx: 1 },
  { file: 'ch05.json', a: ['omoare', 'poporul'], keepIdx: 0 },
  { file: 'ch06.json', a: ['dreapta', 'stânga'], keepIdx: 1 },
  { file: 'ch06.json', a: ['țâță', 'jug'], keepIdx: 1 },
  { file: 'ch08.json', a: ['fruntea', 'războaiele'], keepIdx: 1 },
  { file: 'ch09.json', a: ['vază', 'întâmple'], keepIdx: 0 },
  { file: 'ch09.json', a: ['îndurare', 'strigătul'], keepIdx: 0 },
  { file: 'ch10.json', a: ['turte', 'burduf'], keepIdx: 1 },
  { file: 'ch13.json', a: ['treizeci', 'doi'], keepIdx: 0 },
  { file: 'ch15.json', a: ['copii', 'mama'], keepIdx: 1 },
  { file: 'ch22.json', a: ['mine', 'nimic'], keepIdx: 1 },
  { file: 'ch29.json', a: ['miile', 'zecile'], keepIdx: 1 },
  { file: 'ch29.json', a: ['fântâna', 'Izreel'], keepIdx: 1 },
  { file: 'ch29.json', a: ['înger', 'Dumnezeu'], keepIdx: 0 },
  { file: 'ch30.json', a: ['ajunge', 'izbăvi'], keepIdx: 1 },
  { file: 'ch30.json', a: ['jucând', 'mari'], keepIdx: 0 },
  { file: 'ch31.json', a: ['vale', 'Iordan'], keepIdx: 1 },
  { file: 'ch31.json', a: ['capul', 'armele'], keepIdx: 0 },
  { file: 'ch31.json', a: ['stejarul', 'șapte'], keepIdx: 0 }
];

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(dir, file);
    let modified = false;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const check = (arr) => {
      arr.forEach(q => {
        if (q.t === 'fill' && q.a && q.a.length === 2) {
          const match = fixes.find(f => f.file === file && f.a[0] === q.a[0] && f.a[1] === q.a[1]);
          if (match) {
            const keepWord = q.a[match.keepIdx];
            const replaceWord = q.a[match.keepIdx === 0 ? 1 : 0];
            
            // Reconstruct the question string
            let parts = q.q.split('___');
            if (parts.length === 3) {
              if (match.keepIdx === 1) {
                // Keep the second blank. The first blank becomes replaceWord.
                q.q = parts[0] + replaceWord + parts[1] + '___' + parts[2];
              } else {
                // Keep the first blank. The second blank becomes replaceWord.
                q.q = parts[0] + '___' + parts[1] + replaceWord + parts[2];
              }
              q.a = [keepWord];
              modified = true;
            }
          }
        }
      });
    };
    
    if (data.easy) check(data.easy);
    if (data.hard) check(data.hard);
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 1) + '\n', 'utf8');
      console.log('Fixed', file);
    }
  }
});
