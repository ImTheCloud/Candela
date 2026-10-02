const fs = require('fs');

const data = JSON.parse(fs.readFileSync('content/1-samuel/text-cornilescu.json', 'utf8'));

const entities = {
  person: new Set(["Samuel", "Samuele", "Saul", "David", "Ionatan", "Ionatane", "Eli", "Isai", "Nabal", "Achiș", "Ana", "Anei", "Abner", "Ahimelec", "Mical", "Abigail", "Abigailei", "Elcana", "Fineas", "Hofni", "Chiș", "Chis", "Goliat", "Doeg", "Abiatar", "Agag", "Nahaș", "I-Cabod", "Icabod", "Eliab", "Abinadab", "Șama", "Malchișua", "Ișvi", "Penina", "Ahinoam", "Abișai", "Ioab", "Asael", "Țeruia", "Țeruiei", "Merab", "Palti", "Paltiel", "Adriel", "Ahia", "Ahitub", "Bedan", "Ieroham", "Elihu", "Tohu", "Țuf", "Laiș", "Șimea", "Ner", "Maoch", "Maoc", "Talmai", "Abiel", "Țeror", "Becorat", "Afiah", "Ahimaaț", "Eleazar", "Ioel", "Dagon", "Sisera", "Barac", "Iefta", "Ierubaal", "Moise", "Aaron", "Iosua", "Faraon", "Caleb", "Iacov", "Abia", "Urie", "Hitiul", "Edomitul", "Edomiți", "Amoniți", "Amonitul", "Amoniților", "Filisteanul", "Filistenilor", "Filistenii", "Amaleciții", "Amaleciților", "Amalecitul", "Cheniții", "Cheniților"]),
  place: new Set(["Israel", "Israelul", "Israelului", "Iuda", "Efraim", "Beniamin", "Egipt", "Egiptului", "Galaad", "Galaadului", "Iabes", "Iabeș", "Iabeșul", "Asdod", "Așdod", "Ecron", "Ecronului", "Gaza", "Ascalon", "Gat", "Gatului", "Ghibea", "Ghibeea", "Ghilgal", "Ghilgalului", "Mițpa", "Mițpe", "Mițpei", "Silo", "Șilo", "Rama", "Nob", "Carmel", "Maon", "Zif", "Cheila", "Cheilei", "Țiclag", "Țiclagul", "Țiclagului", "Izreel", "Betleem", "Betleemul", "Bet-El", "Betel", "Betelului", "Amalec", "Moab", "Moabului", "Amon", "Havila", "Șur", "Naiot", "Heret", "Soco", "Azeca", "Azecah", "Bet-Car", "Șen", "Tabor", "Beer-Șeba", "Bezec", "Șalișa", "Șaalim", "Țelțah", "Iordan", "Iordanul", "Ofra", "Șual", "Bet-Horon", "Țeboim", "Migron", "Secu", "Ezel", "Efes-Damim", "Șaaraim", "Ierusalim", "Abel-Mehola", "Mehola", "Galim", "Aroer", "Sifmot", "Iatir", "Eștemoa", "Racal", "Horma", "Cor-Așan", "Atac", "Gheba", "Paran", "Țoba", "Ramataim-Țofim", "Sela-Hamahlecoth", "Sela-Hamahlecot", "Bet-Șemeș", "Bet-Șemeșului", "Bet-Șan", "Bet-Șanului", "Bet-Aven", "En-Ghedi", "En-Dor", "Adulam", "Ghilboa", "Horeș", "Hachila", "Boțeț", "Sene", "Micmaș", "Micmașului", "Aialon", "Șunem", "Sunem", "Afec", "Besor", "Hebron", "Muntele", "Marea", "Valea", "Chiriat-Iearim", "Locașul", "Templul", "Templului"]),
  object: new Set(["chivotul", "chivotului", "sabia", "sabie", "săbii", "săbiile", "sabiei", "sulița", "suliță", "sulițe", "suliței", "praștia", "praștie", "cortul", "cortului", "efod", "efodul", "efodului", "terafim", "terafimul", "terafimi", "terafimii", "mantaua", "manta", "mantia", "mantiei", "mantalei", "corn", "cornul", "urcior", "urciorul", "scut", "scutul", "scutului", "scutier", "scutierul", "pavăză", "pavăza", "platoșă", "platoșa", "arc", "arcul", "săgeți", "săgeată", "săgeata", "săgețile", "furculiță", "furculița", "pâine", "pâinea", "pâinile", "car", "carul", "care", "carele", "coif", "coiful", "zale", "apărători", "tureci", "traistă", "traista", "toiag", "toiagul", "Urim", "Tumim", "lădița", "lada", "umflături", "spada", "spadă"]),
  animal: new Set(["bou", "boi", "boii", "vacă", "vaci", "vacile", "vițel", "viței", "oaie", "oi", "oile", "berbec", "berbeci", "miel", "miei", "capră", "capre", "ied", "iezi", "măgar", "măgari", "măgarii", "măgăriță", "măgărițe", "măgărițele", "câine", "câini", "purice", "potârniche", "urs", "leu", "șoarece", "șoareci", "șoarecii", "pasăre", "păsări", "păsările", "vultur", "vulturi", "cămilă", "cămile", "turmă", "turma", "turme", "țap", "țapi", "pui", "puii"]),
  number: new Set(["unu", "un", "o", "doi", "două", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă", "zece", "unsprezece", "doisprezece", "douăzeci", "treizeci", "patruzeci", "cincizeci", "șaizeci", "șaptezeci", "optzeci", "nouăzeci", "sută", "sute", "mie", "mii", "zeci", "coți", "palmă", "siclu", "sicli", "efă", "sfert", "treime", "jumătate", "măsuri", "măsură"])
};

// Check if any word in the text should be highlighted but isn't
for (let ch = 1; ch <= 31; ch++) {
  const verses = data[ch.toString()];
  if (!verses) continue;
  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    
    // Custom replacements and checks can be added here
  }
}

// Generate the updated ENTITIES_DATA
let output = "const ENTITIES_DATA = {\n";
for (const cat in entities) {
  output += `  ${cat}: [\n    `;
  
  // Convert set to array and sort by length descending to match longest phrases first
  const arr = Array.from(entities[cat]).sort((a, b) => b.length - a.length);
  const chunks = [];
  for (let i = 0; i < arr.length; i += 10) {
    chunks.push(arr.slice(i, i + 10).map(s => `"${s}"`).join(", "));
  }
  output += chunks.join(",\n    ");
  output += `\n  ]${cat === 'number' ? '' : ','}\n`;
}
output += "};";
fs.writeFileSync('scripts/entities.js', output);
console.log("Entities generated in scripts/entities.js");
