import { AGE_GROUPS, ageShort } from '../lib/age';
import { level, setLevel } from '../lib/level';

/** The five levels as chips. The last pick is kept and used for every chapter. */
export default function LevelPicker({ label = 'Nivel' }: { label?: string }) {
  return (
    <div class="lv-chips" role="radiogroup" aria-label={label}>
      {AGE_GROUPS.map((g) => (
        <button type="button" role="radio" aria-checked={level.value === g.id} class="lv-chip" onClick={() => setLevel(g.id)}>
          {ageShort(g.id)}
        </button>
      ))}
    </div>
  );
}
