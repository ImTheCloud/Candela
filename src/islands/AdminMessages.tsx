import { useEffect, useState } from 'preact/hooks';
import { removeMessage, setMessageDone, watchMessages, type Message } from '../lib/messages';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Loader from './Loader';

/** Messages sent by users to admins. */
export default function AdminMessages() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value)) return <Loader />;
  if (!u) return <p class="notice">Intră în cont ca să vezi mesajele. <a class="link" href="/cont">Intră</a></p>;
  if (!profile.value?.admin) return <p class="notice">Această pagină este doar pentru administratori.</p>;
  return <MessageList />;
}

function MessageList() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState<'open' | 'done'>('open');

  useEffect(() => watchMessages(setMessages, () => setFailed(true)), []);

  if (failed) return <p class="notice notice-bad">Mesajele nu au putut fi încărcate.</p>;
  if (!messages) return <Loader />;

  const open = messages.filter((m) => !m.done);
  const done = messages.filter((m) => m.done);
  const list = show === 'open' ? open : done;

  return (
    <div class="stack">
      <div class="book-switch" role="tablist" aria-label="Mesaje">
        <button type="button" role="tab" aria-selected={show === 'open'} onClick={() => setShow('open')}>
          Noi ({open.length})
        </button>
        <button type="button" role="tab" aria-selected={show === 'done'} onClick={() => setShow('done')}>
          Rezolvate ({done.length})
        </button>
      </div>

      {list.length === 0 ? (
        <p class="card empty muted">{show === 'open' ? 'Niciun mesaj nou.' : 'Niciun mesaj rezolvat încă.'}</p>
      ) : (
        <ul class="report-list">
          {list.map((m) => (
            <MessageItem key={m.id} m={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageItem({ m }: { m: Message }) {
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function act(fn: () => Promise<void>) {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const dateStr = m.at ? m.at.toDate().toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <li class="card ri msg-item">
      <div class="ri-top">
        <span class="ri-ref">{m.by || 'Utilizator'}</span>
        <span class="ri-date">{dateStr}</span>
      </div>

      {m.email && (
        <p class="msg-email muted small">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <a href={`mailto:${m.email}?subject=Răspuns Candela`}>{m.email}</a>
        </p>
      )}

      <div class="msg-body">
        <p class="msg-text">{m.message}</p>
      </div>

      {error && <p class="notice notice-bad" role="alert">{error}</p>}

      {confirmDelete ? (
        <div class="stack" style={{ paddingTop: '8px' }}>
          <p class="small muted">Sigur vrei să ștergi acest mesaj?</p>
          <div class="two">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Renunță</button>
            <button type="button" class="btn btn-danger btn-sm" onClick={() => act(() => removeMessage(m.id))}>Șterge definitiv</button>
          </div>
        </div>
      ) : (
        <div class="ri-actions">
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
            Șterge
          </button>
          <button type="button" class="btn btn-primary btn-sm" onClick={() => act(() => setMessageDone(m.id, !m.done))}>
            {m.done ? 'Redeschide' : 'Marchează ca rezolvat'}
          </button>
        </div>
      )}
    </li>
  );
}

