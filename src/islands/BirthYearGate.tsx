import { useEffect, useState } from 'preact/hooks';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import { players, setChildBirthYear, type Player } from '../lib/players';
import { errorText, profileError, profileLoaded, setBirthYear, user } from '../lib/session';

/**
 * Asks once for every birth year that is missing (the account and each child), before anything else.
 * Accounts brought over from v1 have none, and the questions depend on it.
 */
export default function BirthYearGate() {
  const u = user.value;
  if (!u || !profileLoaded.value || profileError.value) return null;
  if (location.pathname.startsWith('/cont/')) return null;
  const missing = players.value.filter((p) => !p.birthYear);
  if (missing.length === 0) return null;
  return <Dialog missing={missing} self={u.uid} />;
}

function Dialog({ missing, self }: { missing: Player[]; self: string }) {
  const [years, setYears] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // nothing else on the page can be used until the years are in
  useEffect(() => {
    const behind = [...document.querySelectorAll<HTMLElement>('body > header, body > main')];
    document.body.style.overflow = 'hidden';
    behind.forEach((el) => { el.inert = true; });
    return () => {
      document.body.style.overflow = '';
      behind.forEach((el) => { el.inert = false; });
    };
  }, []);

  async function save(e: Event) {
    e.preventDefault();
    const bad = missing.find((p) => !validBirthYear(Number(years[p.key])));
    if (bad) return setError(`Scrie anul nașterii pentru ${label(bad, self)}, cu patru cifre (de exemplu ${bad.child ? 2014 : 1990}).`);
    setBusy(true);
    setError('');
    try {
      for (const p of missing) {
        const y = Number(years[p.key]);
        if (p.key === self) await setBirthYear(y);
        else await setChildBirthYear(p.key, y);
      }
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div class="modal-back">
      <form class="modal card stack" role="dialog" aria-modal="true" aria-labelledby="by-title" onSubmit={save}>
        <div class="stack" style="--gap: 8px">
          <h2 id="by-title">Încă un pas</h2>
          <p>
            Întrebările de la examen sunt diferite pentru fiecare vârstă (sub 12 ani, 12–13, 14–15, 16–17 și 18–99).{' '}
            {missing.length > 1
              ? 'Ca fiecare să primească exact întrebările categoriei lui, avem nevoie de anul nașterii al fiecăruia.'
              : missing[0].child
                ? `Ca ${missing[0].name.split(' ')[0]} să primească exact întrebările categoriei lui, avem nevoie de anul nașterii.`
                : 'Ca să primești exact întrebările categoriei tale, avem nevoie de anul nașterii.'}
          </p>
          <p class="small muted">Nu-l arătăm nimănui. În clasament apare doar categoria de vârstă.</p>
        </div>
        {missing.map((p) => {
          const v = years[p.key] ?? '';
          const y = Number(v);
          return (
            <div class="field" key={p.key}>
              <label for={`by-${p.key}`}>{missing.length > 1 || p.child ? `Anul nașterii · ${label(p, self)}` : 'Anul tău de naștere'}</label>
              <input id={`by-${p.key}`} class="input" inputMode="numeric" autocomplete={p.key === self ? 'bday-year' : 'off'} maxLength={4}
                placeholder={p.child ? 'de exemplu 2014' : 'de exemplu 1990'} value={v}
                onInput={(e) => setYears({ ...years, [p.key]: e.currentTarget.value.replace(/\D/g, '') })} />
              {validBirthYear(y) && <p class="small muted">Categoria: <strong>{ageLabel(ageGroup(y))}</strong></p>}
            </div>
          );
        })}
        {error && <p class="notice notice-bad" role="alert">{error}</p>}
        <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se salvează…' : 'Continuă'}</button>
      </form>
    </div>
  );
}

function label(p: Player, self: string): string {
  return p.key === self ? `${p.name.split(' ')[0]} (tu)` : p.name.split(' ')[0];
}
