import { useEffect, useState } from 'preact/hooks';
import { chapterOf, loadChapters } from '../lib/load';
import { progress } from '../lib/progress';
import { shuffle, type Playable } from '../lib/questions';
import { user } from '../lib/session';
import Quiz from './Quiz';
import Loader from './Loader';

/** Questions answered wrong come back until they are answered right. */
export default function Mistakes({ book, bookName }: { book: string; bookName: string }) {
  const wrong = progress(book).value.wrong;
  const [quiz, setQuiz] = useState<{ key: number; questions: Playable[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError('');
    try {
      const ids = new Set(progress(book).value.wrong);
      const all = await loadChapters(book, [...new Set([...ids].map(chapterOf))]);
      setQuiz({ key: Date.now(), questions: shuffle(all.filter((q) => ids.has(q.id))).slice(0, 20) });
    } catch {
      setError('Întrebările nu s-au putut încărca. Verifică conexiunea la internet.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (quiz && !quiz.questions.length) setQuiz(null); }, [quiz]);

  if (quiz?.questions.length) {
    return <Quiz key={quiz.key} book={book} bookName={bookName} questions={quiz.questions} points={false}
      backHref={`/${book}`} onAgain={progress(book).value.wrong.length ? start : undefined} />;
  }
  if (user.value === undefined) return <Loader />;

  return (
    <div class="setup">
      <div class="card auth-card stack">
        <h1>Greșelile mele</h1>
        {wrong.length ? (
          <>
            <p class="muted">Ai {wrong.length} {wrong.length === 1 ? 'întrebare greșită' : 'întrebări greșite'} în {bookName}. Când răspunzi corect, întrebarea iese din listă, dar <strong>nu primești puncte</strong> pentru ea.</p>
            {error && <p class="notice notice-bad" role="alert">{error}</p>}
            <button class="btn btn-primary btn-block" disabled={busy} onClick={start}>
              {busy ? 'Se încarcă…' : `Reia ${Math.min(wrong.length, 20)} ${Math.min(wrong.length, 20) === 1 ? 'întrebare' : 'întrebări'}`}
            </button>
          </>
        ) : (
          <>
            <p class="muted">Nu ai nicio întrebare greșită în {bookName}. Întrebările greșite apar aici ca să le poți relua.</p>
            <a class="btn btn-ghost" href={`/${book}/exersare`}>Exersează</a>
          </>
        )}
      </div>
    </div>
  );
}
