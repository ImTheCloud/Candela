import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const cache = new Map<string, Buffer>();

export default async function handler(req: any, res: any) {
  try {
    const text = (req.query?.text || req.body?.text || '').trim();
    const voice = req.query?.voice || req.body?.voice || 'ro-RO-AlinaNeural';

    if (!text) {
      return res.status(400).send('Missing text parameter');
    }

    const cacheKey = `${voice}:${text}`;
    if (cache.has(cacheKey)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cache.get(cacheKey));
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => {
      res.write(chunk);
      chunks.push(chunk);
    });
    audioStream.on('end', () => {
      const buf = Buffer.concat(chunks);
      cache.set(cacheKey, buf);
      res.end();
      tts.close();
    });
    audioStream.on('error', (err: any) => {
      res.status(500).send(String(err));
      tts.close();
    });
  } catch (err: any) {
    res.status(500).send(err?.message || String(err));
  }
}
