import { PAIRS, PER_TEST, SHAPE } from '../lib/questions';

/** What a test holds, shown before it starts: the total, then one bullet per kind of question, in the order of the exam. */
export default function TestShape() {
  const kinds: [number, string][] = [
    [SHAPE.tf, 'adevărat sau fals'],
    [SHAPE.one, 'cu un singur răspuns corect'],
    [SHAPE.match, `asociere de ${PAIRS} perechi`],
    [SHAPE.multi, 'cu mai multe răspunsuri'],
  ];
  return (
    <div class="shape">
      <p class="shape-total"><b>{PER_TEST} de întrebări</b> în test</p>
      <ul class="shape-list">
        {kinds.map(([n, label]) => <li><b>{n}</b><span>{label}</span></li>)}
      </ul>
    </div>
  );
}
