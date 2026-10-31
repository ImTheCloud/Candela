import { PAIRS, PER_TEST, SHAPE } from '../lib/questions';

/** What a test holds, shown before it starts: the total, then one small cell per kind of question, in the order of the exam. */
export default function TestShape() {
  const kinds: [number, string][] = [
    [SHAPE.tf, 'Adevărat sau fals'],
    [SHAPE.one, 'Un răspuns corect'],
    [SHAPE.match, `Asociere (${PAIRS} perechi)`],
    [SHAPE.multi, 'Mai multe răspunsuri'],
  ];
  return (
    <div class="shape">
      <p class="shape-total"><b>{PER_TEST} de întrebări</b> în test:</p>
      <ul class="shape-grid" aria-label="Ce conține testul">
        {kinds.map(([n, label]) => <li><b>{n}</b><span>{label}</span></li>)}
      </ul>
    </div>
  );
}
