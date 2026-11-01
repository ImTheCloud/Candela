import { signal } from '@preact/signals';
import { LEVELS, type Level } from './age';
import { localGet, localSet } from './store';

/** The level the player last picked, kept for every chapter. Nobody is asked their age. */
const saved = localGet<string | null>('level', null);
export const DEFAULT_LEVEL: Level = 'mediu';
export const level = signal<Level>(LEVELS.some((l) => l.id === saved) ? (saved as Level) : DEFAULT_LEVEL);

/** Which scores the chapter tiles show: the best of all levels, or those of one level. Set by the tabs of the board. */
const savedView = localGet<string | null>('scoreView', 'all');
export const scoreView = signal<Level | 'all'>(
  savedView === 'all' || LEVELS.some((l) => l.id === savedView)
    ? (savedView as Level | 'all')
    : 'all'
);

export function setScoreView(next: Level | 'all') {
  scoreView.value = next;
  localSet('scoreView', next);
}

export function setLevel(next: Level) {
  level.value = next;
  localSet('level', next);
}
