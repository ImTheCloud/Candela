import { ageShort } from '../lib/age';
import { level } from '../lib/level';
import LevelPicker from './LevelPicker';

/** The "Examen alb" card on the exams page: pick the level here, the exam starts on the next screen. */
export default function MockStart({ book }: { book: string }) {
  return (
    <div class="card mock-card">
      <div>
        <p class="exam-title">Examen alb</p>
        <p class="small muted">Un examen nou, ca cel adevărat: 21 de întrebări din toată cartea. Alege nivelul.</p>
      </div>
      <LevelPicker label="Nivelul examenului" />
      <a class="btn btn-primary btn-block" href={`/${book}/examene/alb`}>Începe examenul · {ageShort(level.value)} ani</a>
    </div>
  );
}
