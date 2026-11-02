// Checks that the server saves to, and reloads from, an Upstash-style REST store
// (a tiny fake one here) so a restart on a free host doesn't wipe the street.
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

function fakeUpstash(token) {
  const store = new Map(); const calls = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); return res.end('{"error":"unauthorized"}'); }
      const [cmd, key, value] = JSON.parse(body); calls.push(cmd);
      let result = null;
      if (cmd === 'SET') { store.set(key, value); result = 'OK'; }
      if (cmd === 'GET') result = store.get(key) ?? null;
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ result }));
    });
  });
  return { srv, store, calls };
}
function startApp(port, upstashUrl) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), UPSTASH_REDIS_REST_URL: upstashUrl, UPSTASH_REDIS_REST_TOKEN: 'secret', DATA_DIR: path.join(require('node:os').tmpdir(), `fs-remote-${port}`) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => { if (String(d).includes('running at')) resolve(child); });
    child.on('exit', (code) => reject(new Error(`exited ${code}`)));
    setTimeout(() => reject(new Error('start timeout')), 5000);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('street survives a restart when remote storage is configured', async () => {
  const up = fakeUpstash('secret');
  await new Promise((r) => up.srv.listen(0, r));
  const upUrl = `http://127.0.0.1:${up.srv.address().port}`;
  const port = 3900 + Math.floor(Math.random() * 90);

  let app = await startApp(port, upUrl);
  const created = await fetch(`http://127.0.0.1:${port}/api/circles`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"Restart test"}' }).then((r) => r.json());
  await wait(1500); // saves are batched for about a second
  assert.ok(up.calls.includes('SET'), 'saved to remote storage');
  app.kill(); await wait(200);

  app = await startApp(port, upUrl); // a "restart" with an empty local disk
  const again = await fetch(`http://127.0.0.1:${port}/api/circles/${created.code}`);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).name, 'Restart test');
  app.kill();
  up.srv.close();
});
