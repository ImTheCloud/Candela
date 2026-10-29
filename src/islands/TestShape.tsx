import { PAIRS, PER_TEST, SHAPE } from '../lib/questions';

/** What a test holds, shown before it starts as a small table: one row per kind of question, in the order of the exam. */
export default function TestShape() {
  const rows: [string, number][] = [
    ['Adevărat sau fals', SHAPE.tf],
    ['Un singur răspuns corect', SHAPE.one],
    [`Asociere de ${PAIRS} perechi`, SHAPE.match],
    ['Mai multe răspunsuri posibile', SHAPE.multi],
  ];
  return (
    <ul class="shape" aria-label="Ce conține testul">
      {rows.map(([label, n]) => <li><span>{label}</span><b>{n}</b></li>)}
      <li class="shape-total"><span>În total</span><b>{PER_TEST} de întrebări</b></li>
    </ul>
  );
}
