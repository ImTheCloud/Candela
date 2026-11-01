import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const cache = new Map<string, Buffer>();
const inflight = new Map<string, InflightStream>();

let sharedTtsInstance: MsEdgeTTS | null = null;
let sharedTtsPromise: Promise<MsEdgeTTS> | null = null;

async function getSharedTts(voice: string): Promise<MsEdgeTTS> {
  if (sharedTtsInstance) return sharedTtsInstance;
  if (sharedTtsPromise) return sharedTtsPromise;

  sharedTtsPromise = (async () => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    sharedTtsInstance = tts;
    sharedTtsPromise = null;
    return tts;
  })().catch((err) => {
    sharedTtsInstance = null;
    sharedTtsPromise = null;
    throw err;
  });

  return sharedTtsPromise;
}

function resetSharedTts(): void {
  if (sharedTtsInstance) {
    try { sharedTtsInstance.close(); } catch {}
    sharedTtsInstance = null;
  }
  sharedTtsPromise = null;
}

class InflightStream {
  chunks: Buffer[] = [];
  subscribers = new Set<any>();
  ended = false;
  error: any = null;

  subscribe(res: any, req: any) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Transfer-Encoding', 'chunked');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    for (const chunk of this.chunks) {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    }

    if (this.ended) {
      if (!res.writableEnded) res.end();
      return;
    }
    if (this.error) {
      if (!res.headersSent) {
        res.status?.(500).send(String(this.error)) || res.end(String(this.error));
      } else if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    this.subscribers.add(res);
    req.on?.('close', () => {
      this.subscribers.delete(res);
    });
  }

  write(chunk: Buffer) {
    this.chunks.push(chunk);
    for (const res of this.subscribers) {
      if (!res.writableEnded) {
        try { res.write(chunk); } catch {}
      }
    }
  }

  end() {
    this.ended = true;
    for (const res of this.subscribers) {
      if (!res.writableEnded) {
        try { res.end(); } catch {}
      }
    }
    this.subscribers.clear();
  }

  destroy(err: any) {
    this.error = err;
    for (const res of this.subscribers) {
      if (!res.headersSent) {
        try {
          if (typeof res.status === 'function') res.status(500).send(String(err));
          else res.end(String(err));
        } catch {}
      } else if (!res.writableEnded) {
        try { res.end(); } catch {}
      }
    }
    this.subscribers.clear();
  }
}

export default async function handler(req: any, res: any) {
  try {
    const text = (req.query?.text || req.body?.text || '').trim();
    const voice = req.query?.voice || req.body?.voice || 'ro-RO-AlinaNeural';

    if (!text) {
      return res.status ? res.status(400).send('Missing text parameter') : res.end('Missing text parameter');
    }

    const cacheKey = `${voice}:${text}`;

    // 1. Instant response from memory cache (2ms)
    if (cache.has(cacheKey)) {
      const buf = cache.get(cacheKey)!;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.send ? res.send(buf) : res.end(buf);
    }

    // 2. Active in-flight stream: broadcast chunks immediately to concurrent subscriber
    if (inflight.has(cacheKey)) {
      const stream = inflight.get(cacheKey)!;
      stream.subscribe(res, req);
      return;
    }

    // 3. New synthesis request: create InflightStream and pipe from persistent warm TTS
    const stream = new InflightStream();
    inflight.set(cacheKey, stream);
    stream.subscribe(res, req);

    try {
      const tts = await getSharedTts(voice);
      const { audioStream } = tts.toStream(text);

      audioStream.on('data', (chunk: Buffer) => {
        stream.write(chunk);
      });
      audioStream.on('end', () => {
        const fullBuf = Buffer.concat(stream.chunks);
        cache.set(cacheKey, fullBuf);
        inflight.delete(cacheKey);
        stream.end();
      });
      audioStream.on('error', (err: any) => {
        inflight.delete(cacheKey);
        stream.destroy(err);
        resetSharedTts();
      });
    } catch (err) {
      inflight.delete(cacheKey);
      stream.destroy(err);
      resetSharedTts();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status ? res.status(500).send(err?.message || String(err)) : res.end(err?.message || String(err));
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}
