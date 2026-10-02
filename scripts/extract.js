const fs = require('fs');

const data = JSON.parse(fs.readFileSync('content/1-samuel/text-cornilescu.json', 'utf8'));

const capWords = {};
const allWords = new Set();

for (const ch in data) {
  for (const verse of data[ch]) {
    const words = verse.match(/\b[A-ZĂÎÂȘȚa-zăîâșț-]+\b/g) || [];
    words.forEach(w => allWords.add(w.toLowerCase()));

    const caps = verse.match(/\b[A-ZĂÎÂȘȚ][a-zăîâșț-]*\b/g) || [];
    caps.forEach(w => {
      capWords[w] = (capWords[w] || 0) + 1;
    });
  }
}

const sortedCaps = Object.entries(capWords).sort((a, b) => b[1] - a[1]);

// Detect numbers, animals, objects.
const potentialAnimals = Array.from(allWords).filter(w => /^(bou|boi|vaca|vaci|vițel|viței|oaie|oi|berbec|berbeci|miel|miei|capra|capre|ied|iezi|măgar|măgari|măgăriță|măgărițe|câine|purice|potârniche|urs|leu|șoarece|șoareci|pasăre|păsări|vultur|cămilă|cămile)\b/i.test(w));
const potentialNumbers = Array.from(allWords).filter(w => /^(unu|doi|trei|patru|cinci|șase|șapte|opt|nouă|zece|unsprezece|doisprezece|douăzeci|treizeci|patruzeci|cincizeci|șaizeci|șaptezeci|optzeci|nouăzeci|sută|sute|mie|mii|zeci)$/i.test(w));
const potentialObjects = Array.from(allWords).filter(w => /^(chivotul|sabia|sulița|praștia|cortul|efod|terafim|mantaua|mantia|corn|cornul|urcior|scut|pavăză|platoșă|arc|săgeți)/i.test(w));

console.log("--- ANIMALS ---");
console.log(potentialAnimals.join(', '));
console.log("\n--- NUMBERS ---");
console.log(potentialNumbers.join(', '));
console.log("\n--- OBJECTS ---");
console.log(potentialObjects.join(', '));
console.log("\n--- TOP CAPS (Potential Names/Places) ---");
console.log(sortedCaps.slice(0, 150).map(x => `${x[0]}: ${x[1]}`).join('\n'));
