import { levelLabel } from '../lib/age';
import { level } from '../lib/level';
import LevelPicker from './LevelPicker';
import { PER_TEST, SHAPE_TEXT } from '../lib/questions';

/** The "Examen alb" card on the exams page: pick the level here, the exam starts on the next screen. */
export default function MockStart({ book }: { book: string }) {
  return (
    <div class="card mock-card">
      <div>
        <p class="exam-title">Examen alb</p>
        <p class="small muted">{PER_TEST} de întrebări din toată cartea: {SHAPE_TEXT}.</p>
      </div>
      <LevelPicker />
      <a class="btn btn-primary btn-block" href={`/${book}/examene/alb`}>Începe examenul de nivel {levelLabel(level.value).toLowerCase()}</a>
    </div>
  );
}
