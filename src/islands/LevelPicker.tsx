import { AGE_GROUPS, ageShort, type AgeGroup } from '../lib/age';
import { level, setLevel } from '../lib/level';

export interface LevelPickerProps<T extends AgeGroup | 'all' = AgeGroup> {
  label?: string;
  value?: T;
  onChange?: (val: T) => void;
  includeAll?: boolean;
  allLabel?: string;
  groups?: { id: AgeGroup; label: string }[];
  class?: string;
}

/** The age choices as chips. The last pick is kept and used for every chapter; also used to filter leaderboards and profiles. */
export default function LevelPicker<T extends AgeGroup | 'all' = AgeGroup>({
  label = 'Grupa de vârstă',
  value,
  onChange,
  includeAll = false,
  allLabel = 'Toate',
  groups = AGE_GROUPS,
  class: className = '',
}: LevelPickerProps<T>) {
  const current = (value ?? level.value) as T;
  const select = (next: T) => {
    if (onChange) {
      onChange(next);
    } else {
      setLevel(next as AgeGroup);
    }
  };

  const items: { id: T; label: string }[] = groups.map((g) => ({
    id: g.id as T,
    label: ageShort(g.id),
  }));

  if (includeAll) {
    items.push({ id: 'all' as T, label: allLabel });
  }

  const isSix = items.length === 6;

  return (
    <div
      class={`lv-chips${isSix ? ' six' : ''}${className ? ` ${className}` : ''}`}
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
            onClick={() => select(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
