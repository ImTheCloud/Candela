import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutReason, sendAudio } from '../api/_tts-core.mjs';

// 2 Samuel 14:32 as Edge reads it: 293 characters, 115200 bytes, last word ending at 18 350 ms
test('a whole synthesis is kept', () => {
  assert.equal(cutReason(115200, 293, [[17800, 550, 'omoare']]), null);
  assert.equal(cutReason(55008, 143, [[7900, 426, 'Dumnezeu']]), null);
  // short texts such as the chapter announcement
  assert.equal(cutReason(6000, 13, [[300, 600, '14']]), null);
});

test('a synthesis cut in its second half is dropped', () => {
  // 60% of the file: enough bytes for the old 120 bytes per character, not for the words Edge timed
  assert.match(cutReason(69000, 293, [[17800, 550, 'omoare']]), /words ending/);
  assert.match(cutReason(40000, 293, []), /bytes for 293 characters/);
  assert.match(cutReason(1500, 5, []), /bytes/);
});

function fakeRes() {
  const res = { headers: {}, statusCode: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = String(v); };
  res.end = (b) => { res.body = b ?? Buffer.alloc(0); };
  return res;
}

test('byte ranges are answered with 206 (Safari)', () => {
  const buf = Buffer.from('0123456789');
  let res = fakeRes();
  sendAudio({ headers: { range: 'bytes=0-1' } }, res, buf, 'public');
  assert.equal(res.statusCode, 206);
  assert.equal(res.headers['content-range'], 'bytes 0-1/10');
  assert.equal(res.body.toString(), '01');

  res = fakeRes();
  sendAudio({ headers: { range: 'bytes=4-' } }, res, buf, 'public');
  assert.equal(res.statusCode, 206);
  assert.equal(res.body.toString(), '456789');

  res = fakeRes();
  sendAudio({ headers: { range: 'bytes=-3' } }, res, buf, 'public');
  assert.equal(res.body.toString(), '789');

  res = fakeRes();
  sendAudio({ headers: { range: 'bytes=20-' } }, res, buf, 'public');
  assert.equal(res.statusCode, 416);

  res = fakeRes();
  sendAudio({ headers: {} }, res, buf, 'no-store');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.body.length, 10);
});
