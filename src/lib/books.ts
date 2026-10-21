export interface Book {
  slug: string;
  name: string;
  chapters: number;
  summary: string;
  /** Short title of each chapter, shown on the chapter tiles and menus. */
  titles: string[];
}

export const BOOKS: Book[] = [
  {
    slug: '1-samuel',
    name: '1 Samuel',
    chapters: 31,
    summary: 'De la nașterea lui Samuel la moartea lui Saul pe muntele Ghilboa.',
    titles: [
      "Nașterea lui Samuel",
      "Cântarea Anei / Fiii lui Eli",
      "Chemarea lui Samuel",
      "Chivotul luat de filisteni",
      "Chivotul în Asdod",
      "Chivotul se întoarce",
      "Biruința de la Mițpa",
      "Israel cere un împărat",
      "Saul și măgărițele",
      "Saul uns împărat",
      "Biruința asupra lui Nahaș",
      "Cuvântarea lui Samuel",
      "Jertfa lui Saul la Ghilgal",
      "Isprava lui Ionatan",
      "Saul lepădat de Domnul",
      "David uns de Samuel",
      "David și Goliat",
      "Ionatan și David",
      "Saul îl urmărește pe David",
      "Legământul cu Ionatan",
      "David la Nob și la Gat",
      "Peștera Adulam",
      "David la Cheila și în pustie",
      "David îl cruță pe Saul",
      "Nabal și Abigail",
      "A doua cruțare a lui Saul",
      "David la Achiș",
      "Saul la En-Dor",
      "David trimis înapoi",
      "Țiclagul ars",
      "Moartea lui Saul",
    ],
  },
  {
    slug: '2-samuel',
    name: '2 Samuel',
    chapters: 24,
    summary: 'Domnia lui David peste Iuda, apoi peste tot Israelul.',
    titles: [
      "Cântarea Arcului",
      "David, împărat la Hebron",
      "Moartea lui Abner",
      "Uciderea lui Iș-Boșet",
      "David ia cetățuia Sionului",
      "Chivotul adus la Ierusalim",
      "Legământul cu David",
      "Biruințele lui David",
      "Mefiboșet la masa împăratului",
      "Războiul cu fiii lui Amon",
      "David și Bat-Șeba",
      "Natan și pilda mielușelei",
      "Amnon și Tamar",
      "Femeia din Tecoa",
      "Răscoala lui Absalom",
      "Țiba și Șimei",
      "Sfatul lui Hușai",
      "Moartea lui Absalom",
      "Întoarcerea împăratului",
      "Răscoala lui Șeba",
      "Gabaoniții și uriașii",
      "Cântarea lui David",
      "Vitejii lui David",
      "Numărătoarea poporului",
    ],
  },
];

/** The book shown on the home page until the player picks the other one. */
export const DEFAULT_BOOK = '2-samuel';

/** Home of a book: the default one lives at "/". */
export function bookHome(slug: string): string {
  return slug === DEFAULT_BOOK ? '/' : `/${slug}`;
}

export function getBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
