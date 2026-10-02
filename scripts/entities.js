const ENTITIES_DATA = {
  person: [
    "Filistenilor", "Amaleciților", "Filisteanul", "Amoniților", "Filistenii", "Amaleciții", "Amalecitul", "Cheniților", "Abigailei", "Malchișua",
    "Ionatane", "Ahimelec", "Abinadab", "Ierubaal", "Edomitul", "Amonitul", "Cheniții", "Samuele", "Ionatan", "Abigail",
    "Abiatar", "I-Cabod", "Ahinoam", "Țeruiei", "Paltiel", "Ieroham", "Becorat", "Ahimaaț", "Eleazar", "Edomiți",
    "Amoniți", "Samuel", "Elcana", "Fineas", "Goliat", "Icabod", "Penina", "Abișai", "Țeruia", "Adriel",
    "Ahitub", "Talmai", "Sisera", "Faraon", "Hitiul", "David", "Nabal", "Achiș", "Abner", "Mical",
    "Hofni", "Nahaș", "Eliab", "Asael", "Merab", "Palti", "Bedan", "Elihu", "Șimea", "Maoch",
    "Abiel", "Țeror", "Afiah", "Dagon", "Barac", "Iefta", "Moise", "Aaron", "Iosua", "Caleb",
    "Iacov", "Saul", "Isai", "Anei", "Chiș", "Chis", "Doeg", "Agag", "Șama", "Ișvi",
    "Ioab", "Ahia", "Tohu", "Laiș", "Maoc", "Ioel", "Abia", "Urie", "Eli", "Ana",
    "Țuf", "Ner"
  ],
  place: [
    "Sela-Hamahlecoth", "Sela-Hamahlecot", "Ramataim-Țofim", "Chiriat-Iearim", "Bet-Șemeșului", "Ghilgalului", "Abel-Mehola", "Bet-Șanului", "Israelului", "Galaadului",
    "Țiclagului", "Efes-Damim", "Micmașului", "Egiptului", "Ecronului", "Betleemul", "Betelului", "Beer-Șeba", "Bet-Horon", "Ierusalim",
    "Bet-Șemeș", "Templului", "Israelul", "Beniamin", "Țiclagul", "Moabului", "Iordanul", "Cor-Așan", "Bet-Aven", "En-Ghedi",
    "Iabeșul", "Ascalon", "Gatului", "Ghibeea", "Ghilgal", "Cheilei", "Betleem", "Bet-Car", "Șaaraim", "Eștemoa",
    "Bet-Șan", "Ghilboa", "Hachila", "Muntele", "Locașul", "Templul", "Israel", "Efraim", "Galaad", "Ghibea",
    "Mițpei", "Carmel", "Cheila", "Țiclag", "Izreel", "Bet-El", "Amalec", "Havila", "Azecah", "Șalișa",
    "Șaalim", "Țelțah", "Iordan", "Țeboim", "Migron", "Mehola", "Sifmot", "En-Dor", "Adulam", "Micmaș",
    "Aialon", "Hebron", "Egipt", "Iabes", "Iabeș", "Asdod", "Așdod", "Ecron", "Mițpa", "Mițpe",
    "Betel", "Naiot", "Heret", "Azeca", "Tabor", "Bezec", "Galim", "Aroer", "Iatir", "Racal",
    "Horma", "Gheba", "Paran", "Horeș", "Boțeț", "Șunem", "Sunem", "Besor", "Marea", "Valea",
    "Iuda", "Gaza", "Silo", "Șilo", "Rama", "Maon", "Moab", "Amon", "Soco", "Ofra",
    "Șual", "Secu", "Ezel", "Atac", "Țoba", "Sene", "Afec", "Gat", "Nob", "Zif",
    "Șur", "Șen"
  ],
  object: [
    "chivotului", "terafimul", "terafimii", "scutierul", "furculiță", "furculița", "apărători", "umflături", "chivotul", "cortului",
    "efodului", "terafimi", "mantalei", "urciorul", "scutului", "săgețile", "săbiile", "suliței", "praștia", "praștie",
    "terafim", "mantaua", "mantiei", "scutier", "platoșă", "platoșa", "săgeată", "săgeata", "pâinile", "traistă",
    "traista", "toiagul", "sabiei", "sulița", "suliță", "sulițe", "cortul", "efodul", "mantia", "cornul",
    "urcior", "scutul", "pavăză", "pavăza", "săgeți", "pâinea", "carele", "coiful", "tureci", "lădița",
    "sabia", "sabie", "săbii", "manta", "arcul", "pâine", "carul", "toiag", "Tumim", "spada",
    "spadă", "efod", "corn", "scut", "care", "coif", "zale", "Urim", "lada", "arc",
    "car"
  ],
  animal: [
    "măgărițele", "potârniche", "măgăriță", "măgărițe", "șoarecii", "păsările", "berbeci", "măgarii", "șoarece", "șoareci",
    "vulturi", "vacile", "berbec", "măgari", "purice", "pasăre", "păsări", "vultur", "cămilă", "cămile",
    "vițel", "viței", "capră", "capre", "măgar", "câine", "câini", "turmă", "turma", "turme",
    "boii", "vacă", "vaci", "oaie", "oile", "miel", "miei", "iezi", "țapi", "puii",
    "bou", "boi", "ied", "urs", "leu", "țap", "pui", "oi"
  ],
  number: [
    "doisprezece", "unsprezece", "patruzeci", "cincizeci", "șaptezeci", "douăzeci", "treizeci", "nouăzeci", "jumătate", "șaizeci",
    "optzeci", "treime", "măsuri", "măsură", "patru", "cinci", "șapte", "palmă", "siclu", "sicli",
    "sfert", "două", "trei", "șase", "nouă", "zece", "sută", "sute", "zeci", "coți",
    "unu", "doi", "opt", "mie", "mii", "efă", "un", "o"
  ]
};