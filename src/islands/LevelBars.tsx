import type { Level } from '../lib/age';

const COUNT: Record<Level | 'all', number> = { usor: 1, mediu: 2, greu: 3, all: 3 };

/** The difficulty of a level as three bars, one more lit for each step up. */
export default function LevelBars({ level }: { level: Level | 'all' }) {
  return (
    <span class="lvbars" aria-hidden="true">
      {[1, 2, 3].map((n) => <i class={n <= COUNT[level] ? 'on' : ''} />)}
    </span>
  );
}
