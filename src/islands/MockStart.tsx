import { ageShort } from '../lib/age';
import { level } from '../lib/level';
import LevelPicker from './LevelPicker';

/** The "Examen alb" card on the exams page: pick the level here, the exam starts on the next screen. */
export default function MockStart({ book }: { book: string }) {
  return (
    <div class="card mock-card">
      <div>
        <p class="exam-title">Examen alb</p>
        <p class="small muted">21 de întrebări din toată cartea.</p>
      </div>
      <LevelPicker label="Grupa de vârstă" />
      <a class="btn btn-primary btn-block" href={`/${book}/examene/alb`}>Începe examenul · {ageShort(level.value)} ani</a>
    </div>
  );
}
