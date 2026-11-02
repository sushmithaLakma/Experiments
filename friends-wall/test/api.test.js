const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'friends-wall-'));
const { server } = require('../server.js');

let base;
before(() => new Promise((r) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
after(async () => { server.close(); server.closeAllConnections(); await new Promise((r) => setTimeout(r, 120)); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const json = async (res) => ({ status: res.status, body: await res.json() });
const post = (p, body, headers = {}) =>
  fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(json);
const auth = (me) => ({ 'x-friend-id': me.friendId, 'x-friend-token': me.token });
const fakeVideo = Buffer.alloc(2048, 7);

test('create a circle, join, share a moment, react, nudge, delete', async () => {
  const circle = await post('/api/circles', { name: 'College gang' });
  assert.equal(circle.status, 201);
  assert.match(circle.body.code, /^[A-Z2-9]{6}$/);

  // Invite code lookup is case-insensitive.
  const byCode = await fetch(`${base}/api/circles/${circle.body.code.toLowerCase()}`).then(json);
  assert.equal(byCode.body.id, circle.body.id);

  const id = circle.body.id;
  const asha = (await post(`/api/circles/${id}/join`, { name: 'Asha' })).body;
  const ben = (await post(`/api/circles/${id}/join`, { name: 'Ben' })).body;
  assert.ok(asha.token && ben.token);

  // Tokens never leak in public state.
  const state = await fetch(`${base}/api/circles/${id}`).then(json);
  assert.equal(state.body.friends.length, 2);
  assert.ok(!JSON.stringify(state.body).includes(asha.token));

  // Must be a member to post.
  const anon = await fetch(`${base}/api/circles/${id}/moments`, { method: 'POST', headers: { 'content-type': 'video/webm' }, body: fakeVideo });
  assert.equal(anon.status, 401);

  // Wrong content type rejected.
  const bad = await fetch(`${base}/api/circles/${id}/moments`, { method: 'POST', headers: { 'content-type': 'image/png', ...auth(asha) }, body: fakeVideo });
  assert.equal(bad.status, 415);

  const up = await fetch(`${base}/api/circles/${id}/moments`, {
    method: 'POST',
    headers: { 'content-type': 'video/webm', 'x-caption': encodeURIComponent('Making pasta 🍝'), ...auth(asha) },
    body: fakeVideo,
  }).then(json);
  assert.equal(up.status, 201);
  assert.equal(up.body.caption, 'Making pasta 🍝');

  // Video is served, with byte-range support.
  const full = await fetch(base + up.body.videoUrl);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-type'), 'video/webm');
  assert.equal((await full.arrayBuffer()).byteLength, fakeVideo.length);
  const part = await fetch(base + up.body.videoUrl, { headers: { range: 'bytes=0-99' } });
  assert.equal(part.status, 206);
  assert.equal((await part.arrayBuffer()).byteLength, 100);

  // Reactions toggle.
  let r = await post(`/api/circles/${id}/moments/${up.body.id}/react`, { emoji: '❤️' }, auth(ben));
  assert.deepEqual(r.body.reactions['❤️'], [ben.friendId]);
  r = await post(`/api/circles/${id}/moments/${up.body.id}/react`, { emoji: '❤️' }, auth(ben));
  assert.equal(r.body.reactions['❤️'], undefined);
  r = await post(`/api/circles/${id}/moments/${up.body.id}/react`, { emoji: '💩' }, auth(ben));
  assert.equal(r.status, 400);

  // Nudge.
  assert.equal((await post(`/api/circles/${id}/nudge`, { friendId: asha.friendId }, auth(ben))).status, 200);
  assert.equal((await post(`/api/circles/${id}/nudge`, { friendId: ben.friendId }, auth(ben))).status, 400);

  // Only the owner can delete.
  const notMine = await fetch(`${base}/api/circles/${id}/moments/${up.body.id}`, { method: 'DELETE', headers: auth(ben) });
  assert.equal(notMine.status, 403);
  const mine = await fetch(`${base}/api/circles/${id}/moments/${up.body.id}`, { method: 'DELETE', headers: auth(asha) });
  assert.equal(mine.status, 200);
  assert.equal((await fetch(base + up.body.videoUrl)).status, 404);
});

test('live events stream pushes new moments', async () => {
  const { body: c } = await post('/api/circles', { name: 'Cousins' });
  const me = (await post(`/api/circles/${c.id}/join`, { name: 'Dev' })).body;
  const ctrl = new AbortController();
  const res = await fetch(`${base}/api/circles/${c.id}/events`, { signal: ctrl.signal });
  const reader = res.body.getReader();
  await reader.read(); // retry line
  await fetch(`${base}/api/circles/${c.id}/moments`, { method: 'POST', headers: { 'content-type': 'video/mp4', ...auth(me) }, body: fakeVideo });
  let text = '';
  while (!text.includes('moment-added')) text += new TextDecoder().decode((await reader.read()).value);
  ctrl.abort();
  assert.match(text, /"type":"moment-added"/);
});

test('unknown circle and path traversal are rejected', async () => {
  assert.equal((await fetch(`${base}/api/circles/NOPE99`)).status, 404);
  assert.equal((await fetch(`${base}/media/..%2Fdb.json`)).status, 404);
  assert.equal((await fetch(`${base}/c/ANYCODE`)).status, 200);
});
