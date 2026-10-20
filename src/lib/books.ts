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

// Cornilescu text, one array of verses per chapter. A book without a file yet has no reader.
const texts = import.meta.glob<Record<string, string[]>>('../../content/*/text-cornilescu.json', { import: 'default', eager: true });

export function getText(slug: string): Record<string, string[]> | undefined {
  return texts[`../../content/${slug}/text-cornilescu.json`];
}
