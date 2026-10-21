import { useEffect, useState } from 'preact/hooks';
import { BOOKS } from '../lib/books';
import { REASONS, removeReport, setDone, watchReports, type Report } from '../lib/reports';
import { errorText, profile, profileLoaded, user } from '../lib/session';

/** The questions players flagged, for admins. */
export default function Reports() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value)) return <div class="card skeleton" style="height: 120px" />;
  if (!u) return <p class="notice">Intră în cont ca să vezi semnalările. <a class="link" href="/cont">Intră</a></p>;
  if (!profile.value?.admin) return <p class="notice">Această pagină este doar pentru cei care verifică întrebările.</p>;
  return <List />;
}

function List() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState<'open' | 'done'>('open');

  useEffect(() => watchReports(setReports, () => setFailed(true)), []);

  if (failed) return <p class="notice notice-bad">Semnalările nu au putut fi încărcate.</p>;
  if (!reports) return <div class="card skeleton" style="height: 120px" />;

  const open = reports.filter((r) => !r.done);
  const done = reports.filter((r) => r.done);
  const list = show === 'open' ? open : done;

  return (
    <div class="stack">
      <div class="book-switch" role="tablist" aria-label="Semnalări">
        <button type="button" role="tab" aria-selected={show === 'open'} onClick={() => setShow('open')}>De rezolvat · {open.length}</button>
        <button type="button" role="tab" aria-selected={show === 'done'} onClick={() => setShow('done')}>Rezolvate · {done.length}</button>
      </div>
      {list.length === 0
        ? <p class="card empty muted">{show === 'open' ? 'Nicio semnalare nouă.' : 'Nimic rezolvat încă.'}</p>
        : <ul class="report-list">{list.map((r) => <Item key={r.id} r={r} />)}</ul>}
    </div>
  );
}

function Item({ r }: { r: Report }) {
  const [error, setError] = useState('');
  const book = BOOKS.find((b) => b.slug === r.book);
  const chapterQuestion = /^\w+\.\d+\./.test(r.qid);

  async function act(fn: () => Promise<void>) {
    setError('');
    try { await fn(); } catch (err) { setError(errorText(err)); }
  }

  return (
    <li class="card ri">
      <div class="ri-top">
        <span class="ri-ref">{book?.name ?? r.book} {r.ref}</span>
        <span class="ri-date">{r.at ? r.at.toDate().toLocaleDateString('ro-RO') : ''}</span>
      </div>
      <p class="ri-q">{r.q.replace(/___/g, '…')}</p>
      <p class="ri-reason">{REASONS.find((x) => x.id === r.reason)?.label ?? r.reason}</p>
      {r.note && <blockquote class="ri-note">{r.note}</blockquote>}
      <p class="ri-meta">De la {r.by || 'un jucător'} · <code>{r.qid}</code></p>
      {chapterQuestion && <a class="ri-link" href={`/${r.book}/verificare/${r.ch}#${r.qid}`}>Vezi întrebarea în capitolul {r.ch}</a>}
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="ri-actions">
        <button class="btn btn-ghost btn-sm" onClick={() => act(() => removeReport(r.id))}>Șterge</button>
        <button class="btn btn-primary btn-sm" onClick={() => act(() => setDone(r.id, !r.done))}>{r.done ? 'Redeschide' : 'Rezolvat'}</button>
      </div>
    </li>
  );
}
