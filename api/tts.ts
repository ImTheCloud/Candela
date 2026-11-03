import { handleTts } from './_tts-core.mjs';

export default async function handler(req: any, res: any) {
  // a repeated parameter arrives as an array: only a single string is accepted
  const params = { ...(req.body && typeof req.body === 'object' ? req.body : {}), ...(req.query || {}) };
  await handleTts(req, res, { text: params.text, voice: params.voice, marks: params.marks });
}
