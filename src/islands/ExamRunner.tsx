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

/** A real exam played again: a test like any other, it starts at once. */
export default function ExamRunner({ book, bookName, examId, questions }: Props) {
  const [run, setRun] = useState(1);
  return <Quiz key={run} book={book} bookName={bookName} questions={questions} scoreId={examId} record={false}
    backHref={`/${book}/examene`} onAgain={() => setRun(run + 1)} />;
}
