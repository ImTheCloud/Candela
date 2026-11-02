import { useEffect, useMemo, useState } from 'preact/hooks';
import { shuffle, type Answer, type Grade, type Playable } from '../lib/questions';

interface Props {
  q: Playable;
  answer: Answer;
  onChange: (a: Answer) => void;
  /** Set once checked: inputs lock and show right and wrong. */
  graded: Grade | null;
  /** Enter in a typed answer: check it (the button bar can be hidden behind the keyboard). */
  onEnter?: () => void;
}

const LETTERS = ['a', 'b', 'c', 'd', 'e'];

export default function QuestionView({ q, answer, onChange, graded, onEnter }: Props) {
  switch (q.t) {
    case 'tf': return <TrueFalse q={q} answer={answer as Extract<Answer, { t: 'tf' }>} onChange={onChange} graded={graded} />;
    case 'one': return <One q={q} answer={answer as Extract<Answer, { t: 'one' }>} onChange={onChange} graded={graded} />;
    case 'multi': return <Multi q={q} answer={answer as Extract<Answer, { t: 'multi' }>} onChange={onChange} graded={graded} />;
    case 'match': return <Match q={q} answer={answer as Extract<Answer, { t: 'match' }>} onChange={onChange} graded={graded} />;
    case 'fill': return <Fill q={q} answer={answer as Extract<Answer, { t: 'fill' }>} onChange={onChange} graded={graded} onEnter={onEnter} />;
  }
}

type P<T extends Playable['t']> = {
  q: Extract<Playable, { t: T }>;
  answer: Extract<Answer, { t: T }>;
  onChange: (a: Answer) => void;
  graded: Grade | null;
  onEnter?: () => void;
};

function state(graded: Grade | null, isRight: boolean, chosen: boolean): string {
  if (!graded) return chosen ? 'is-chosen' : '';
  if (isRight) return 'is-right';
  return chosen ? 'is-wrong' : 'is-dim';
}

function TrueFalse({ q, answer, onChange, graded }: P<'tf'>) {
  return (
    <>
      <p class="q-text">{q.q}</p>
      <div class="tf" role="radiogroup" aria-label="Răspuns">
        {[
          { v: true, label: 'Adevărat', key: 'A' },
          { v: false, label: 'Fals', key: 'F' },
        ].map(({ v, label, key }) => (
          <button type="button" role="radio" aria-checked={answer.v === v} disabled={!!graded}
            class={`opt tf-opt ${state(graded, q.a === v, answer.v === v)}`} onClick={() => onChange({ t: 'tf', v })}>
            <span class="opt-key">{key}</span><span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function One({ q, answer, onChange, graded }: P<'one'>) {
  return (
    <>
      <p class="q-text">{q.q}</p>
      <div class="opts" role="radiogroup" aria-label="Variante">
        {q.opts.map((o, i) => (
          <button type="button" role="radio" aria-checked={answer.v === i} disabled={!!graded}
            class={`opt ${state(graded, q.a === i, answer.v === i)}`} onClick={() => onChange({ t: 'one', v: i })}>
            <span class="opt-key">{LETTERS[i]}</span><span>{o}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Multi({ q, answer, onChange, graded }: P<'multi'>) {
  const toggle = (i: number) => {
    const v = answer.v.includes(i) ? answer.v.filter((x) => x !== i) : [...answer.v, i];
    onChange({ t: 'multi', v, none: false });
  };
  return (
    <>
      <p class="q-text">{q.q}</p>
      <p class="q-hint small muted">Pot fi corecte: niciuna, 1, 2 sau 3 variante.</p>
      <div class="opts" role="group" aria-label="Variante">
        {q.opts.map((o, i) => {
          const chosen = !answer.none && answer.v.includes(i);
          return (
            <button type="button" role="checkbox" aria-checked={chosen} disabled={!!graded}
              class={`opt opt-check ${state(graded, q.a.includes(i), chosen)}`} onClick={() => toggle(i)}>
              <span class="opt-key">{LETTERS[i]}</span><span>{o}</span>
            </button>
          );
        })}
        <button type="button" role="checkbox" aria-checked={answer.none} disabled={!!graded}
          class={`opt opt-none ${state(graded, q.a.length === 0, answer.none)}`}
          onClick={() => onChange({ t: 'multi', v: [], none: !answer.none })}>
          <span class="opt-key">N</span><span>Niciun răspuns corect</span>
        </button>
      </div>
    </>
  );
}

function Match({ q, answer, onChange, graded }: P<'match'>) {
  // left column 1, 2, 3…; right column shuffled and labelled A, B, C…
  // Touch an item in either column, then the one that goes with it in the other. Touch a paired item in the right column alone to undo.
  const order = useMemo(() => shuffle(q.pairs.map((_, i) => i)), [q.id]);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const letterOf = (i: number) => String.fromCharCode(65 + order.indexOf(i));
  const ownerOf = (i: number) => answer.v.findIndex((x) => x === i);

  function link(row: number, i: number) {
    const v = [...answer.v];
    const owner = ownerOf(i);
    if (owner >= 0) v[owner] = null;
    v[row] = i;
    onChange({ t: 'match', v });
    setLeft(null);
    setRight(null);
  }

  const pickLeft = (row: number) => {
    if (right !== null) return link(row, right);
    setLeft(left === row ? null : row);
  };
  const pickRight = (i: number) => {
    if (left !== null) return link(left, i);
    const owner = ownerOf(i);
    if (right === null && owner >= 0) {
      const v = [...answer.v];
      v[owner] = null;
      return onChange({ t: 'match', v });
    }
    setRight(right === i ? null : i);
  };
  const active = left;

  useEffect(() => {
    if (graded) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'Escape') {
        if (left !== null || right !== null) {
          e.preventDefault();
          setLeft(null);
          setRight(null);
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (['1', '2', '3', '4', '5'].includes(key)) {
        const row = parseInt(key, 10) - 1;
        if (row < q.pairs.length) {
          e.preventDefault();
          pickLeft(row);
        }
        return;
      }

      const letterIndex = ['a', 'b', 'c', 'd', 'e'].indexOf(key);
      if (letterIndex >= 0 && letterIndex < order.length) {
        const rightItem = order[letterIndex];
        e.preventDefault();
        pickRight(rightItem);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [left, right, answer.v, graded, order, q.pairs.length]);

  return (
    <>
      <p class="q-text">Asociază perechile corespunzătoare din stânga și din dreapta.</p>
      <div class="match">
        <ol class="match-col" aria-label="Coloana întâi">
          {q.pairs.map(([left], row) => {
            const picked = answer.v[row];
            const cls = graded ? (graded.parts?.[row] ? 'is-right' : 'is-wrong') : active === row ? 'is-active' : picked !== null ? 'is-paired' : '';
            return (
              <li>
                <button type="button" class={`m-item ${cls}`} disabled={!!graded} aria-pressed={active === row} onClick={() => pickLeft(row)}>
                  <span class="m-key">{row + 1}</span>
                  <span class="m-text">{left}</span>
                  {picked !== null && <span class="m-pair">{letterOf(picked)}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <ol class="match-col" aria-label="Coloana a doua">
          {order.map((i, k) => {
            const owner = ownerOf(i);
            const cls = graded ? (owner === i ? 'is-right' : owner >= 0 ? 'is-wrong' : '') : right === i ? 'is-active' : owner >= 0 ? 'is-paired' : '';
            return (
              <li>
                <button type="button" class={`m-item ${cls}`} disabled={!!graded} aria-pressed={right === i} onClick={() => pickRight(i)}>
                  <span class="m-key m-key-r">{String.fromCharCode(65 + k)}</span>
                  <span class="m-text">{q.pairs[i][1]}</span>
                  {owner >= 0 && <span class="m-pair">{owner + 1}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {graded && !graded.right && (
        <ul class="match-fix small">
          {q.pairs.map(([l, r], row) => !graded.parts?.[row] && <li>{row + 1}. {l} → {letterOf(row)}. {r}</li>)}
        </ul>
      )}
    </>
  );
}

function Fill({ q, answer, onChange, graded, onEnter }: P<'fill'>) {
  const parts = q.q.split('___');
  const set = (i: number, value: string) => {
    const v = [...answer.v];
    v[i] = value;
    onChange({ t: 'fill', v });
  };
  return (
    <>
      <p class="q-text fill-text">
        {parts.map((seg, i) => (
          <>
            {seg}
            {i < parts.length - 1 && (
              <input class={`fill-input ${graded ? (graded.parts?.[i] ? 'is-right' : 'is-wrong') : ''}`}
                aria-label={`Cuvântul ${i + 1}`} value={answer.v[i]} disabled={!!graded}
                autocomplete="off" autocapitalize="off" spellcheck={false}
                style={{ width: `${Math.max(5, q.a[i].length + 2)}ch` }}
                enterkeyhint="done"
                onInput={(e) => set(i, e.currentTarget.value)}
                onFocus={(e) => ensureVisible(e.currentTarget)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); onEnter?.(); } }} />
            )}
          </>
        ))}
      </p>
      {graded && !graded.right && (
        <p class="small fill-fix">
          Corect: {q.a.map((w, i) => (
            <span class={graded.parts?.[i] ? '' : 'strong'}>{i ? ', ' : ''}{w}</span>
          ))}
        </p>
      )}
    </>
  );
}

/**
 * The phone keyboard may cover the field. Once it is up, and only if the field really is hidden or under the header,
 * the page moves just enough to show it, in one step and without animation.
 */
function ensureVisible(el: HTMLElement) {
  setTimeout(() => {
    const vv = window.visualViewport;
    const top = (vv?.offsetTop ?? 0) + (document.querySelector('header.top')?.getBoundingClientRect().bottom ?? 48) + 8;
    const bottom = (vv?.offsetTop ?? 0) + (vv?.height ?? innerHeight) - 80;
    const r = el.getBoundingClientRect();
    if (r.bottom > bottom) scrollBy(0, r.bottom - bottom);
    else if (r.top < top) scrollBy(0, r.top - top);
  }, 350);
}
