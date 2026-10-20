export interface Book {
  slug: string;
  name: string;
  chapters: number;
  summary: string;
}

export const BOOKS: Book[] = [
  {
    slug: '1-samuel',
    name: '1 Samuel',
    chapters: 31,
    summary: 'De la nașterea lui Samuel la moartea lui Saul pe muntele Ghilboa.',
  },
  {
    slug: '2-samuel',
    name: '2 Samuel',
    chapters: 24,
    summary: 'Domnia lui David peste Iuda, apoi peste tot Israelul.',
  },
];

export function getBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
