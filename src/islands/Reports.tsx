import { useEffect, useRef, useState } from 'preact/hooks';
import { BOOKS } from '../lib/books';
import { REPORT_THANKS, type ReportStatus } from '../lib/report-model';
import { decideReport, isUnread, markResponseRead, REASONS, reportError, reportStatus, watchReports, type Decision, type Report } from '../lib/reports';
import { errorText, profile, profileLoaded, user } from '../lib/session';

const STATUS: Record<ReportStatus, string> = { pending: 'În așteptare', accepted: 'Acceptată', rejected: 'Refuzată', legacy: 'Arhivată' };
const date = (at: Report['at']) => at?.toDate().toLocaleDateString('ro-RO') ?? '';

export default function Reports() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value)) return <ReportSkeleton />;
  if (!u) return <p class="notice">Intră în cont ca să vezi semnalările. <a class="link" href="/cont">Intră</a></p>;
  const admin = profile.value?.admin === true;
  const mine = !admin || new URLSearchParams(location.search).get('tab') === 'mine';
  return <>
    <header class="reports-heading">
      <h1>Semnalări</h1>
      <p class="muted">{mine ? 'Urmărește semnalările tale și răspunsurile primite. Îți mulțumim că ne ajuți să îmbunătățim întrebările.' : 'Verifică fiecare semnalare, apoi accept-o sau refuz-o. Jucătorul primește o notificare cu decizia.'}</p>
    </header>
    {admin && <nav class="reports-nav" aria-label="Tipul semnalărilor">
      <a href="/semnalari" aria-current={!mine ? 'page' : undefined}>Administrare</a>
      <a href="/semnalari?tab=mine" aria-current={mine ? 'page' : undefined}>Ale mele</a>
    </nav>}
    <List key={`${u.uid}:${mine}`} uid={u.uid} mine={mine} />
  </>;
}

function ReportSkeleton() {
  return <div class="reports-loading" role="status" aria-label="Se încarcă semnalările">
    <div class="reports-skeleton sk-title" /><div class="reports-skeleton sk-line" /><div class="reports-skeleton sk-filters" />
    {[1, 2].map((i) => <div key={i} class="reports-skeleton-item"><div class="reports-skeleton sk-line" /><div class="reports-skeleton sk-text" /></div>)}
  </div>;
}

function List({ uid, mine }: { uid: string; mine: boolean }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let active = true;
    setFailed(false);
    const off = watchReports(mine ? uid : null, (rows) => { if (active) setReports(rows); }, () => { if (active) setFailed(true); });
    return () => { active = false; off(); };
  }, [uid, mine, retry]);

  // Keep the order stable when a response is read, so the open answer never jumps.
  const [personalFilter, setPersonalFilter] = useState('all');
  // Seeing the list is reading the answers: the badge clears at once, the new ones stay marked for this visit.
  const fresh = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!mine || !reports || fresh.current) return;
    const unreadNow = reports.filter(isUnread);
    fresh.current = new Set(unreadNow.map((r) => r.id));
    unreadNow.forEach((r) => markResponseRead(r).catch(() => {}));
  }, [mine, reports]);
  if (failed) return <div class="notice notice-bad" role="alert"><p>Semnalările nu au putut fi încărcate.</p><button type="button" class="btn btn-ghost btn-sm" onClick={() => setRetry((n) => n + 1)}>Încearcă din nou</button></div>;
  if (!reports) return <ReportSkeleton />;
  const activeFilter = mine ? personalFilter : filter;
  const pending = reports.filter((r) => reportStatus(r) === 'pending').length;
  const accepted = reports.filter((r) => reportStatus(r) === 'accepted').length;
  const rejected = reports.filter((r) => reportStatus(r) === 'rejected').length;
  const isNew = (r: Report) => mine && (isUnread(r) || !!fresh.current?.has(r.id));
  const unread = reports.filter(isNew).length;
  const filters = mine
    ? [{ id: 'all', label: 'Toate', count: reports.length }, { id: 'pending', label: 'În așteptare', count: pending }, { id: 'accepted', label: 'Acceptate', count: accepted }, { id: 'rejected', label: 'Refuzate', count: rejected }]
    : [{ id: 'pending', label: 'De verificat', count: pending }, { id: 'done', label: 'Verificate', count: reports.length - pending }];
  const list = reports.filter((r) => activeFilter === 'all' || (activeFilter === 'done' ? reportStatus(r) !== 'pending' : reportStatus(r) === activeFilter));
  if (mine) list.sort((a, b) => ((b.decidedAt ?? b.at)?.toMillis() ?? 0) - ((a.decidedAt ?? a.at)?.toMillis() ?? 0));

  return <div class="reports-content">
    {unread > 0 && <p class="reports-unread-summary" role="status">{unread === 1 ? 'Ai un răspuns nou.' : `Ai ${unread} răspunsuri noi.`}</p>}
    <div class="reports-filters" role="group" aria-label="Filtrează semnalările">
      {filters.map((f) => <button key={f.id} type="button" aria-pressed={activeFilter === f.id} onClick={() => mine ? setPersonalFilter(f.id) : setFilter(f.id)}>{f.label}<span>{f.count}</span></button>)}
    </div>
    <p class="sr-only" role="status">{announcement}</p>
    {list.length === 0 ? <div class="reports-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 21V4m0 0h12l-2 4 2 4H5" /></svg>
      <h2>{reports.length === 0 ? (mine ? 'Nicio semnalare încă' : 'Totul este la zi') : 'Nicio semnalare aici'}</h2>
      <p class="muted">{reports.length === 0 && mine ? 'Când observi o greșeală într-un test, apasă „Semnalează”. Vei putea urmări răspunsul aici.' : 'Semnalările care corespund acestui filtru vor apărea aici.'}</p>
      {mine && reports.length === 0 && <a class="btn btn-ghost btn-sm" href="/">Înapoi la teste</a>}
    </div> : <ul class="reports-rows">{list.map((r) => <Item key={r.id} r={r} mine={mine} isNew={isNew(r)} onDecision={setAnnouncement} />)}</ul>}
  </div>;
}

function Item({ r, mine, isNew, onDecision }: { r: Report; mine: boolean; isNew: boolean; onDecision: (s: string) => void }) {
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState<Decision | null>(null);
  const book = BOOKS.find((b) => b.slug === r.book);
  const status = reportStatus(r);
  const unread = isNew;
  const chapterQuestion = /^\w+\.\d+\./.test(r.qid);

  async function readResponse() {
    setExpanded(true);
    if (!unread || reading) return;
    setReading(true);
    setError('');
    try { await markResponseRead(r); } catch (err) { setError(errorText(err)); } finally { setReading(false); }
  }

  async function decide(decision: Decision) {
    if (busy) return;
    setBusy(decision);
    setError('');
    try {
      await decideReport(r, decision);
      onDecision(decision === 'accepted' ? 'Semnalare acceptată. Jucătorul a fost notificat.' : 'Semnalare refuzată. Jucătorul a fost notificat.');
    } catch (err) {
      setError(reportError(err) ?? errorText(err));
      setBusy(null);
    }
  }

  return <li class={`reports-row${unread ? ' has-unread' : ''}`}>
    <div class="reports-row-top">
      <span class="ri-ref">{book?.name ?? r.book} {r.ref}</span>
      <time class="ri-date" dateTime={r.at?.toDate().toISOString()}>{date(r.at)}</time>
    </div>
    <div class="reports-state-line"><span class={`reports-status is-${status}`}>{STATUS[status]}</span>{unread && <span class="reports-new">Răspuns nou</span>}</div>
    <p class="reports-question">{r.q.replace(/___/g, '…')}</p>
    <p class="reports-reason">{REASONS.find((x) => x.id === r.reason)?.label ?? r.reason}</p>
    {r.note && <blockquote class="reports-note">{r.note}</blockquote>}
    {!mine && <p class="ri-meta">De la {r.by || 'un jucător'} <span aria-hidden="true">/</span> <code>{r.qid}</code></p>}
    {mine && r.by && <p class="ri-meta">Trimisă de {r.by}</p>}
    {!mine && chapterQuestion && <a class="ri-link" href={`/${r.book}/verificare/${r.ch}#${r.qid}`}>Vezi întrebarea</a>}
    {status === 'pending' && (mine ? <p class="reports-waiting">O vom verifica. Răspunsul va apărea aici și vei primi o notificare pe pictograma contului.</p> : <>
      <div class="ri-actions" aria-busy={!!busy}>
        <button type="button" class="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => decide('rejected')}>{busy === 'rejected' ? 'Se salvează…' : 'Refuză'}</button>
        <button type="button" class="btn btn-primary btn-sm" disabled={!!busy} onClick={() => decide('accepted')}>{busy === 'accepted' ? 'Se salvează…' : 'Acceptă'}</button>
      </div>
    </>)}
    {(status === 'accepted' || status === 'rejected') && <>
      <button type="button" class="reports-response-toggle" aria-expanded={expanded} aria-controls={`response-${r.id}`} onClick={() => expanded ? setExpanded(false) : readResponse()}>
        <span>{expanded ? 'Ascunde răspunsul' : 'Vezi răspunsul'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div id={`response-${r.id}`} class={`reports-response is-${status}`}>
        <p class="reports-response-title">{status === 'accepted' ? 'Semnalare acceptată: am corectat întrebarea' : 'Semnalare refuzată: întrebarea rămâne așa'}</p>
        <p class="reports-thanks">{REPORT_THANKS}</p>
        {r.response && <p class="reports-response-copy">{r.response}</p>}
        {r.correctedText && <div class="reports-correction"><span class="reports-eyebrow">Versiunea corectată</span><p>{r.correctedText}</p></div>}
        <p class="small muted">Răspuns din {date(r.decidedAt ?? null)}</p>
        {unread && !reading && error && <button type="button" class="btn btn-ghost btn-sm" onClick={readResponse}>Marchează ca citit</button>}
      </div>}
    </>}
    {status === 'legacy' && <p class="reports-waiting">Semnalare închisă înainte de introducerea răspunsurilor. Decizia nu a fost înregistrată.</p>}
    {error && <p class="notice notice-bad" role="alert">{error}</p>}
  </li>;
}
