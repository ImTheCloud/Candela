import { useState } from 'preact/hooks';
import type { Playable } from '../lib/questions';
import Quiz from './Quiz';

interface Props {
  book: string;
  bookName: string;
  title: string;
  examId: string;
  questions: Playable[];
}

/** A paper exam: it starts at once, the correction comes at the end. */
export default function ExamRunner({ book, bookName, examId, questions }: Props) {
  const [run, setRun] = useState(1);
  return <Quiz key={run} book={book} bookName={bookName} questions={questions} mode="exam" examId={examId}
    backHref={`/${book}/examene`} onAgain={() => setRun(run + 1)} />;
}
