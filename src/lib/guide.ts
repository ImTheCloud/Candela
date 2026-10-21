// Build-time only: the guide of each book (story, people, places, journeys).
export interface Guide {
  frize: { g: string; t: string; c: string; d: [string, number][] }[];
  personaje: { n: string; d: string; c: string }[];
  locuri: { n: string; d: string; c: string; lat: number; lng: number }[];
  trasee: { n: string; c: string; i: string; s: { p: string; t: string; d: string; v: string; c: number }[] }[];
}

const guides = import.meta.glob<Guide>('../../content/*/carte.json', { import: 'default', eager: true });

export function getGuide(book: string): Guide | undefined {
  return guides[`../../content/${book}/carte.json`];
}
