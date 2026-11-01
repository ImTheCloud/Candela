import { useState } from 'preact/hooks';
import AccountGate from './AccountGate';
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
function ExamRunnerInner({ book, bookName, examId, questions }: Props) {
  const [run, setRun] = useState(1);
  return <Quiz key={run} book={book} bookName={bookName} questions={questions} scoreId={examId} record={false}
    backHref={`/${book}`} onAgain={() => setRun(run + 1)} />;
}

/** Played only from an account. */
export default function ExamRunner(props: Props) {
  return <AccountGate><ExamRunnerInner {...props} /></AccountGate>;
}
