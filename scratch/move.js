const fs = require('fs');
const file = 'content/1-samuel/intrebari/ch22.json';
const d = JSON.parse(fs.readFileSync(file, 'utf8'));

// Find the question in easy
const idx = d.easy.findIndex(q => q.q.includes('David a plecat de acolo și a scăpat în peștera'));
if (idx !== -1) {
  const q = d.easy.splice(idx, 1)[0];
  d.hard.push(q);
  fs.writeFileSync(file, JSON.stringify(d, null, 1));
  console.log('Moved!');
}
