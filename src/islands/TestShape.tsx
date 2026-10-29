import { SHAPE, TYPES } from '../lib/questions';

/** What a test holds, shown before it starts: one cell per kind of question, in the order of the exam. */
export default function TestShape() {
  const kinds = TYPES.filter((k) => SHAPE[k.t] > 0);
  return (
    <ul class="shape" aria-label="Ce conține testul">
      {kinds.map((k) => (
        <li><b>{SHAPE[k.t]}</b><span>{k.short}</span></li>
      ))}
    </ul>
  );
}
