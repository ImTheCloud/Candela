// Each player gets the exam of their age group, computed from the birth year (age reached this year).
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
