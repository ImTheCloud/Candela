const TONES = ['#4a3426', '#8a5a36', '#5e8a3a', '#b23a2e', '#7a6a9a', '#3f7f86'];

/** Round badge with the initials, in a colour picked from the name. */
export default function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tone = TONES[h % TONES.length];
  return (
    <span class="av" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.38}px`, background: tone }} aria-hidden="true">
      {initials}
    </span>
  );
}
