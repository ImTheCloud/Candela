// Build-time only: importing this in an island would ship every chapter to the browser.
const texts = import.meta.glob<Record<string, string[]>>('../../content/*/text-cornilescu.json', { import: 'default', eager: true });

/** Cornilescu text of a book, one array of verses per chapter. */
export function getText(slug: string): Record<string, string[]> | undefined {
  return texts[`../../content/${slug}/text-cornilescu.json`];
}
