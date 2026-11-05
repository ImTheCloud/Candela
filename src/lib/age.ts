/** The three levels of the chapter questions, with who each one suits (docs/niveluri.md). */
export type Level = 'usor' | 'mediu' | 'greu';

export const LEVELS: { id: Level; label: string; who: string }[] = [
  { id: 'usor', label: 'Ușor', who: 'Copii' },
  { id: 'mediu', label: 'Mediu', who: 'Adolescenți' },
  { id: 'greu', label: 'Greu', who: 'Adulți' },
];

export function levelLabel(lv: Level): string {
  return LEVELS.find((l) => l.id === lv)!.label;
}

/** Level keys for the board maps (plain letters, safe as Firestore field names). */
export const LEVEL_KEY: Record<Level, string> = { usor: 'a', mediu: 'b', greu: 'c' };
