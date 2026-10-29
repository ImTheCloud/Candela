import { PAIRS, SHAPE } from '../lib/questions';

/** What a test holds, said before it starts, one plain line per kind of question in the order of the exam. */
export default function TestShape() {
  const lines = [
    `${SHAPE.tf} întrebări adevărat sau fals`,
    `${SHAPE.one} întrebări cu un singur răspuns corect`,
    `${SHAPE.match} asociere de ${PAIRS} perechi`,
    `${SHAPE.multi} întrebări cu mai multe răspunsuri posibile`,
  ];
  return (
    <ul class="shape" aria-label="Ce conține testul">
      {lines.map((l) => <li>{l}</li>)}
    </ul>
  );
}
