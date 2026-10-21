import { useEffect, useState } from 'preact/hooks';
import { AGE_GROUPS, ageGroup, ageLabel, validBirthYear, type AgeGroup } from '../lib/age';
import { player, setGuestBirthYear, GUEST } from '../lib/players';
import { shuffle, TYPES, type Playable, type QType } from '../lib/questions';
import { bookHome } from '../lib/books';
import { loadChapters } from '../lib/load';
import Quiz from './Quiz';
import '../styles/quiz.css';

/** How many questions each chapter has, per age group and type (computed at build). */
export type Summary = Record<number, Partial<Record<AgeGroup, Partial<Record<QType, number>>>>>;

interface Props {
  book: string;
  bookName: string;
  chapters: number;
  summary: Summary;
}

const COUNTS = [10, 20, 0];

export default function Practice({ book, bookName, chapters, summary }: Props) {
  const params = new URLSearchParams(location.search);
  const byType = params.get('mod') === 'tip';
  const [picked, setPicked] = useState<number[]>(() => {
    const c = Number(params.get('capitol'));
    return c && summary[c] ? [c] : [];
  });
  const [type, setType] = useState<QType>('tf');
  // from a chapter's menu: ?capitol=5&start=1[&nivel=greu] starts the whole chapter test at once
  const direct = params.get('start') === '1' && !byType;
  const [harder, setHarder] = useState(params.get('nivel') === 'greu');
  const [count, setCount] = useState(direct ? 0 : 10);
  const [quiz, setQuiz] = useState<{ key: number; questions: Playable[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const p = player.value;
  const own = p.birthYear ? ageGroup(p.birthYear) : null;
  const level = own && harder ? next(own) : own;

  const available = (ch: number) => {
    if (!level) return 0;
    const s = summary[ch]?.[level];
    if (!s) return 0;
    return byType ? s[type] ?? 0 : Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
  };
  const withQuestions = Array.from({ length: chapters }, (_, k) => k + 1).filter((c) => available(c) > 0);
  const chosen = picked.filter((c) => available(c) > 0);
  const total = chosen.reduce((s, c) => s + available(c), 0);
  const n = count === 0 ? total : Math.min(count, total);

  async function start() {
    setBusy(true);
    setError('');
    try {
      const all = await loadChapters(book, chosen);
      const pool = all.filter((q) => q.age === level && (!byType || q.t === type));
      setQuiz({ key: Date.now(), questions: shuffle(pool).slice(0, count === 0 ? pool.length : count) });
    } catch {
      setError('Întrebările nu s-au putut încărca. Verifică conexiunea la internet.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (direct && level && chosen.length && !quiz && !busy) start();
  }, [level]);

  const toggle = (c: number) => setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c]);

  if (quiz) {
    return <Quiz key={quiz.key} book={book} bookName={bookName} questions={quiz.questions} mode="practice"
      backHref={bookHome(book)} onAgain={() => start()} />;
  }

  if (!own) return <AskAge />;
  if (direct && chosen.length) return error ? <p class="notice notice-bad" role="alert">{error}</p> : <div class="card auth-card skeleton" />;

  return (
    <div class="setup">
      <div class="card who-line">
        <div>
          <p class="small muted">Joacă</p>
          <p><strong>{p.name.split(' ')[0]}</strong> · {ageLabel(own)}</p>
        </div>
        {p.key !== GUEST && <a class="link small" href="/">Schimbă</a>}
      </div>

      {own !== '18+' && (
        <div class="setup-block">
          <p class="setup-head"><strong>Nivel</strong></p>
          <div class="segmented" role="radiogroup" aria-label="Nivel">
            <button type="button" role="radio" aria-checked={!harder} onClick={() => setHarder(false)}>{ageLabel(own)}</button>
            <button type="button" role="radio" aria-checked={harder} onClick={() => setHarder(true)}>Mai greu: {ageLabel(next(own))}</button>
          </div>
        </div>
      )}

      {byType && (
        <div class="setup-block">
          <p class="setup-head"><strong>Tipul întrebărilor</strong></p>
          <div class="type-list" role="radiogroup" aria-label="Tipul întrebărilor">
            {TYPES.map((x) => (
              <button type="button" role="radio" aria-checked={type === x.t} class="opt" onClick={() => setType(x.t)}>
                <span class="opt-key">{x.part}</span><span>{x.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div class="setup-block">
        <div class="setup-head">
          <strong>Capitole</strong>
          {withQuestions.length > 0 && (
            <button type="button" class="link small btn-reset" onClick={() => setPicked(chosen.length === withQuestions.length ? [] : withQuestions)}>
              {chosen.length === withQuestions.length ? 'Niciunul' : 'Toate'}
            </button>
          )}
        </div>
        {withQuestions.length === 0 ? (
          <p class="card notice muted">Întrebările pentru {bookName} se pregătesc. Revino în curând.</p>
        ) : (
          <div class="ch-grid">
            {Array.from({ length: chapters }, (_, k) => k + 1).map((c) => (
              <button type="button" class="ch-pick" aria-pressed={picked.includes(c)} disabled={!available(c)}
                aria-label={`Capitolul ${c}`} onClick={() => toggle(c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div class="setup-block">
        <p class="setup-head"><strong>Câte întrebări</strong></p>
        <div class="segmented" role="radiogroup" aria-label="Câte întrebări">
          {COUNTS.map((c) => (
            <button type="button" role="radio" aria-checked={count === c} onClick={() => setCount(c)}>{c || 'Toate'}</button>
          ))}
        </div>
      </div>

      {error && <p class="notice notice-bad" role="alert">{error}</p>}

      <div class="actions">
        <button class="btn btn-primary btn-block" disabled={!n || busy} onClick={start}>
          {busy ? 'Se încarcă…' : n ? `Începe · ${n} ${n === 1 ? 'întrebare' : 'întrebări'}` : 'Alege capitolele'}
        </button>
      </div>
    </div>
  );
}

function next(g: AgeGroup): AgeGroup {
  const i = AGE_GROUPS.findIndex((x) => x.id === g);
  return AGE_GROUPS[Math.min(i + 1, AGE_GROUPS.length - 1)].id;
}

/** Questions depend on age: guests give their birth year here, accounts in Cont. */
function AskAge() {
  const p = player.value;
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  if (p.key !== GUEST) {
    return (
      <div class="card auth-card stack">
        <h2>Anul nașterii</h2>
        <p class="muted">Ca să primești întrebările potrivite vârstei, spune-ne anul nașterii lui {p.name.split(' ')[0]}.</p>
        <a class="btn btn-primary" href="/cont">Mergi la cont</a>
      </div>
    );
  }
  function save(e: Event) {
    e.preventDefault();
    const y = Number(year);
    if (!validBirthYear(y)) return setError('Scrie anul nașterii cu patru cifre, de exemplu 2012.');
    setGuestBirthYear(y);
  }
  return (
    <form class="card auth-card stack" onSubmit={save}>
      <h2>Câți ani ai?</h2>
      <p class="muted">Întrebările sunt pe categorii de vârstă, ca la examen.</p>
      <div class="field">
        <label for="gy">Anul nașterii</label>
        <input id="gy" class="input" inputMode="numeric" maxLength={4} placeholder="de exemplu 2012" value={year}
          onInput={(e) => setYear(e.currentTarget.value.replace(/\D/g, ''))} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary">Continuă</button>
    </form>
  );
}
