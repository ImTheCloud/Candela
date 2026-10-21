/** Round badge with the initials, always dark brown. */
export default function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return (
    <span class="av" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.38}px`, background: '#4a3426' }} aria-hidden="true">
      {initials}
    </span>
  );
}
