import { signal } from '@preact/signals';
import type { AgeGroup } from './age';
import { AGE_GROUPS } from './age';
import { localGet, localSet } from './store';

/** The level the player last picked, kept for every chapter. Nobody is asked their age. */
const saved = localGet<string | null>('level', null);
export const DEFAULT_LEVEL: AgeGroup = '14-15';
export const level = signal<AgeGroup>(AGE_GROUPS.some((g) => g.id === saved) ? (saved as AgeGroup) : DEFAULT_LEVEL);

export function setLevel(next: AgeGroup) {
  level.value = next;
  localSet('level', next);
}
