import { formatFirstLast } from '../lib/players';

/** Round badge with the initials in "Prenume Nume" order (e.g. CP for Claudiu Popadiuc). */
export default function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const formatted = formatFirstLast(name);
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return (
    <span class="av" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.38}px`, background: 'var(--btn)', color: 'var(--on-oil)', fontFamily: 'var(--f-brand)' }} aria-hidden="true">
      {initials}
    </span>
  );
}
