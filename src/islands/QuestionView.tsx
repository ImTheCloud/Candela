import { useMemo } from 'preact/hooks';
import { shuffle, type Answer, type Grade, type Playable } from '../lib/questions';

interface Props {
  q: Playable;
  answer: Answer;
  onChange: (a: Answer) => void;
  /** Set once checked: inputs lock and show right and wrong. */
  graded: Grade | null;
}

const LETTERS = ['a', 'b', 'c', 'd', 'e'];

export default function QuestionView({ q, answer, onChange, graded }: Props) {
  switch (q.t) {
    case 'tf': return <TrueFalse q={q} answer={answer as Extract<Answer, { t: 'tf' }>} onChange={onChange} graded={graded} />;
    case 'one': return <One q={q} answer={answer as Extract<Answer, { t: 'one' }>} onChange={onChange} graded={graded} />;
    case 'multi': return <Multi q={q} answer={answer as Extract<Answer, { t: 'multi' }>} onChange={onChange} graded={graded} />;
    case 'match': return <Match q={q} answer={answer as Extract<Answer, { t: 'match' }>} onChange={onChange} graded={graded} />;
    case 'fill': return <Fill q={q} answer={answer as Extract<Answer, { t: 'fill' }>} onChange={onChange} graded={graded} />;
  }
}

type P<T extends Playable['t']> = {
  q: Extract<Playable, { t: T }>;
  answer: Extract<Answer, { t: T }>;
  onChange: (a: Answer) => void;
  graded: Grade | null;
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
        {[true, false].map((v) => (
          <button type="button" role="radio" aria-checked={answer.v === v} disabled={!!graded}
            class={`opt tf-opt ${state(graded, q.a === v, answer.v === v)}`} onClick={() => onChange({ t: 'tf', v })}>
            {v ? 'Adevărat' : 'Fals'}
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
          Niciun răspuns corect
        </button>
      </div>
    </>
  );
}

function Match({ q, answer, onChange, graded }: P<'match'>) {
  // the right column is shown in a shuffled order, labelled A, B, C…; each row picks a letter
  const order = useMemo(() => shuffle(q.pairs.map((_, i) => i)), [q.id]);
  const letter = (i: number) => String.fromCharCode(65 + order.indexOf(i));
  const set = (row: number, value: number) => {
    const v = [...answer.v];
    v[row] = v[row] === value ? null : value;
    onChange({ t: 'match', v });
  };
  return (
    <>
      <p class="q-text">{q.q}</p>
      <ol class="match-right" aria-label="Coloana a doua">
        {order.map((i, k) => <li key={i}><span class="opt-key">{String.fromCharCode(65 + k)}</span><span>{q.pairs[i][1]}</span></li>)}
      </ol>
      <ul class="match-rows">
        {q.pairs.map(([left], row) => {
          const ok = graded?.parts?.[row];
          return (
            <li class={`match-row ${graded ? (ok ? 'is-right' : 'is-wrong') : ''}`}>
              <p class="match-left">{left}</p>
              <div class="letters" role="radiogroup" aria-label={`Litera pentru ${left}`}>
                {order.map((i, k) => {
                  const chosen = answer.v[row] === i;
                  const cls = graded ? (i === row ? 'is-right' : chosen ? 'is-wrong' : '') : chosen ? 'is-chosen' : '';
                  return (
                    <button type="button" role="radio" aria-checked={chosen} disabled={!!graded}
                      class={`letter ${cls}`} onClick={() => set(row, i)}>{String.fromCharCode(65 + k)}</button>
                  );
                })}
              </div>
              {graded && !ok && <p class="small match-fix">Corect: {letter(row)}. {q.pairs[row][1]}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Fill({ q, answer, onChange, graded }: P<'fill'>) {
  const parts = q.q.split('___');
  const set = (i: number, value: string) => {
    const v = [...answer.v];
    v[i] = value;
    onChange({ t: 'fill', v });
  };
  return (
    <>
      {q.ctx && <p class="q-ctx">{q.ctx}</p>}
      <p class="q-text fill-text">
        {parts.map((seg, i) => (
          <>
            {seg}
            {i < parts.length - 1 && (
              <input class={`fill-input ${graded ? (graded.parts?.[i] ? 'is-right' : 'is-wrong') : ''}`}
                aria-label={`Cuvântul ${i + 1}`} value={answer.v[i]} disabled={!!graded}
                autocomplete="off" autocapitalize="off" spellcheck={false}
                style={{ width: `${Math.max(5, q.a[i].length + 2)}ch` }}
                onInput={(e) => set(i, e.currentTarget.value)} />
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
