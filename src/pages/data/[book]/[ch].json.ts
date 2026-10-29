import type { APIRoute } from 'astro';
import { BOOKS } from '../../../lib/books';
import { chapterFiles, playable } from '../../../lib/content';
import { getText } from '../../../lib/text';

// /data/2-samuel/5.json: every question of chapter 5 (all ages), with the verses they cite.
export function getStaticPaths() {
  return BOOKS.flatMap((b) => [...chapterFiles(b.slug).keys()].map((ch) => ({ params: { book: b.slug, ch: String(ch) } })));
}

export const GET: APIRoute = ({ params }) => {
  const file = chapterFiles(params.book!).get(Number(params.ch))!;
  const questions = file.questions.map((q) => playable(params.book!, q, file.scene));
  return new Response(JSON.stringify({ ch: file.ch, reviewed: file.reviewed, questions, verses: getText(params.book!)?.[file.ch] ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
