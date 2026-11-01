import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const cache = new Map<string, Buffer>();
const inflight = new Map<string, Promise<Buffer>>();

export default async function handler(req: any, res: any) {
  try {
    const text = (req.query?.text || req.body?.text || '').trim();
    const voice = req.query?.voice || req.body?.voice || 'ro-RO-AlinaNeural';

    if (!text) {
      return res.status(400).send('Missing text parameter');
    }

    const cacheKey = `${voice}:${text}`;
    if (cache.has(cacheKey)) {
      const buf = cache.get(cacheKey)!;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.send(buf);
    }

    // Wait for in-flight request if another concurrent request is already fetching this exact speech
    if (inflight.has(cacheKey)) {
      try {
        const buf = await inflight.get(cacheKey)!;
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buf.length);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.setHeader('Accept-Ranges', 'bytes');
        return res.send(buf);
      } catch {
        // proceed to retry below if in-flight failed
      }
    }

    let resolveInflight: (buf: Buffer) => void;
    let rejectInflight: (err: any) => void;
    const inflightPromise = new Promise<Buffer>((resolve, reject) => {
      resolveInflight = resolve;
      rejectInflight = reject;
    });
    inflight.set(cacheKey, inflightPromise);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Transfer-Encoding', 'chunked');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let closed = false;
    req.on('close', () => {
      closed = true;
      try { tts.close(); } catch {}
    });

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => {
      if (!closed && !res.writableEnded) {
        res.write(chunk);
        chunks.push(chunk);
      }
    });
    audioStream.on('end', () => {
      const buf = Buffer.concat(chunks);
      cache.set(cacheKey, buf);
      inflight.delete(cacheKey);
      resolveInflight!(buf);
      if (!closed) {
        res.end();
      }
      try { tts.close(); } catch {}
    });
    audioStream.on('error', (err: any) => {
      inflight.delete(cacheKey);
      rejectInflight!(err);
      if (!res.headersSent) {
        res.status(500).send(String(err));
      } else {
        res.end();
      }
      try { tts.close(); } catch {}
    });
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(err?.message || String(err));
    } else {
      res.end();
    }
  }
}
