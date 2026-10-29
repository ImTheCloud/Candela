// The real exams of the contest are written per age group; the questions of the site have three levels instead.
export type AgeGroup = 'sub12' | '12-13' | '14-15' | '16-17' | '18+';

export const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: 'sub12', label: 'Sub 12 ani' },
  { id: '12-13', label: '12-13 ani' },
  { id: '14-15', label: '14-15 ani' },
  { id: '16-17', label: '16-17 ani' },
  { id: '18+', label: '18-99 ani' },
];

export function ageGroup(birthYear: number, year = new Date().getFullYear()): AgeGroup {
  const age = year - birthYear;
  if (age < 12) return 'sub12';
  if (age < 14) return '12-13';
  if (age < 16) return '14-15';
  if (age < 18) return '16-17';
  return '18+';
}

export function ageLabel(group: AgeGroup): string {
  return AGE_GROUPS.find((g) => g.id === group)!.label;
}

/** The label without "ani", for tight spaces ("12–13", "sub 12"). */
export function ageShort(group: AgeGroup): string {
  return ageLabel(group).replace(/ ani$/, '').replace('Sub 12', 'sub 12');
}

export function validBirthYear(y: number, year = new Date().getFullYear()): boolean {
  return Number.isInteger(y) && y >= year - 100 && y <= year - 3;
}

/** The three levels of the chapter questions, with who each one suits (docs/niveluri.md). */
export type Level = 'usor' | 'mediu' | 'greu';

export const LEVELS: { id: Level; label: string; who: string }[] = [
  { id: 'usor', label: 'Ușor', who: 'copii' },
  { id: 'mediu', label: 'Mediu', who: 'adolescenți' },
  { id: 'greu', label: 'Greu', who: 'adulți' },
];

export function levelLabel(lv: Level): string {
  return LEVELS.find((l) => l.id === lv)!.label;
}

/** What a question shows as its level: a level for chapter questions, an age group for the real exams. */
export function questionLevel(age: Level | AgeGroup): string {
  return LEVELS.find((l) => l.id === age)?.label ?? ageLabel(age as AgeGroup);
}

/** Level keys for the board maps (plain letters, safe as Firestore field names). */
export const LEVEL_KEY: Record<Level, string> = { usor: 'a', mediu: 'b', greu: 'c' };
