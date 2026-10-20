import { useState } from 'preact/hooks';

type Theme = 'auto' | 'light' | 'dark';
const OPTIONS: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Automat' },
  { id: 'light', label: 'Luminos' },
  { id: 'dark', label: 'Întunecat' },
];

function stored(): Theme {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>(stored);

  function pick(t: Theme) {
    setTheme(t);
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', t);
    } catch {}
  }

  return (
    <div class="segmented" role="radiogroup" aria-label="Aspect">
      {OPTIONS.map((o) => (
        <button type="button" role="radio" aria-checked={theme === o.id} onClick={() => pick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
