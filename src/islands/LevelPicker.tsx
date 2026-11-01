import { LEVELS, type Level } from '../lib/age';
import { level, setLevel } from '../lib/level';

export interface LevelPickerProps<T extends Level | 'all' = Level> {
  label?: string;
  value?: T;
  onChange?: (val: T) => void;
  includeAll?: boolean;
  allLabel?: string;
  groups?: { id: Level; label: string; who?: string }[];
  class?: string;
}

/** The level choices as chips. The last pick is kept and used for every chapter; also used to filter leaderboards and profiles. */
export default function LevelPicker<T extends Level | 'all' = Level>({
  label = 'Nivelul',
  value,
  onChange,
  includeAll = false,
  allLabel = 'Toate',
  groups = LEVELS,
  class: className = '',
}: LevelPickerProps<T>) {
  const current = (value ?? level.value) as T;
  const select = (next: T) => {
    if (onChange) {
      onChange(next);
    } else {
      setLevel(next as Level);
    }
  };

  const items: { id: T; label: string; who?: string }[] = groups.map((g) => ({
    id: g.id as T,
    label: g.label,
    who: g.who,
  }));

  if (includeAll) {
    items.push({ id: 'all' as T, label: allLabel });
  }

  return (
    <div
      class={`lv-chips${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-label={label}
    >
      {items.map((it) => {
        const checked = current === it.id;
        return (
          <button
            key={String(it.id)}
            type="button"
            role="radio"
            aria-checked={checked}
            class="lv-chip"
            onClick={(e) => {
              e.preventDefault();
              select(it.id);
            }}
          >
            {it.who ? (
              <>
                <span class="lv-who">{it.who}</span>
                <span class="lv-sub">{it.label}</span>
              </>
            ) : (
              it.label
            )}
          </button>
        );
      })}
    </div>
  );
}
