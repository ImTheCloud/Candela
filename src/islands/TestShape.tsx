import { PAIRS, PER_TEST, SHAPE } from '../lib/questions';

/** What a test holds, shown before it starts: the total, then one short line per kind of question, in the order of the exam. */
export default function TestShape() {
  const kinds: [string, number][] = [
    ['Adevărat sau fals', SHAPE.tf],
    ['Un singur răspuns corect', SHAPE.one],
    [`Asociere de ${PAIRS} perechi`, SHAPE.match],
    ['Mai multe răspunsuri', SHAPE.multi],
  ];
  return (
    <div class="shape">
      <p class="shape-head"><span>Conținutul testului</span><span>{PER_TEST} de întrebări</span></p>
      <ul class="shape-list">
        {kinds.map(([label, n]) => <li><span>{label}</span><b>{n}</b></li>)}
      </ul>
    </div>
  );
}
