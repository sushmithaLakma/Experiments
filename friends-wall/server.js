// Friends Wall — a tiny, dependency-free server.
// Friends in a "circle" post short video moments; everyone sees them in one grid.
// Storage is a JSON file + a media folder on disk. Moments expire after 24 hours.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MOMENT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_CAPTION = 140;
const MAX_NAME = 40;
const REACTIONS = ['❤️', '😂', '😮', '🙌', '🥹', '👋'];

const VIDEO_TYPES = {
  'video/webm': '.webm',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

// ---------- storage ----------

fs.mkdirSync(MEDIA_DIR, { recursive: true });

let db = { circles: {}, moments: {}, gifts: {} };
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Could not read db.json, starting fresh:', err.message);
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DB_FILE); // atomic replace, so a crash never leaves half a file
    } catch (err) {
      console.error('Could not save db.json:', err.message);
    }
  }, 50);
}

const newId = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');
// Invite codes avoid look-alike characters so they can be read out loud.
function newCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return code;
}

const GIFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const GIFT_KINDS = ['flowers', 'chocolates', 'howareyou'];
const ACTIVITIES = ['cook', 'work', 'read', 'music', 'plants', 'workout', 'bake', 'paint', 'chill', 'sleep', 'out'];
const LOOK_STYLES = ['curly', 'bob', 'long', 'bun', 'spiky'];

function pruneExpired() {
  const now = Date.now();
  let changed = false;
  db.gifts ||= {};
  for (const [id, g] of Object.entries(db.gifts)) {
    if (now - g.at > GIFT_TTL_MS) { delete db.gifts[id]; changed = true; }
  }
  for (const [id, m] of Object.entries(db.moments)) {
    if (now - m.createdAt > MOMENT_TTL_MS) {
      fs.rm(path.join(MEDIA_DIR, m.file), { force: true }, () => {});
      delete db.moments[id];
      changed = true;
      broadcast(m.circleId, { type: 'moment-expired', id });
    }
  }
  if (changed) save();
}
setInterval(pruneExpired, 10 * 60 * 1000).unref();

// ---------- live updates (Server-Sent Events) ----------

const listeners = new Map(); // circleId -> Set<res>

function broadcast(circleId, event) {
  const set = listeners.get(circleId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) res.write(payload);
}

// Private events (gifts) go only to the listed friends' open connections.
function sendTo(circleId, friendIds, event) {
  const set = listeners.get(circleId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) if (res.friendId && friendIds.includes(res.friendId)) res.write(payload);
}

// ---------- helpers ----------

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req, 64 * 1024);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function findCircle(idOrCode) {
  if (db.circles[idOrCode]) return db.circles[idOrCode];
  const code = String(idOrCode).toUpperCase();
  return Object.values(db.circles).find((c) => c.code === code);
}

function authFriend(req, circle, query) {
  const friendId = req.headers['x-friend-id'] || query?.get('friend');
  const token = req.headers['x-friend-token'] || query?.get('token');
  const friend = circle.friends[friendId];
  if (!friend || !token) return null;
  const a = Buffer.from(String(token));
  const b = Buffer.from(friend.token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return friend;
}

function publicFriend(f) {
  return {
    id: f.id, name: f.name, color: f.color, joinedAt: f.joinedAt, lastNudgedAt: f.lastNudgedAt || null,
    // street profile
    look: f.look || null, city: f.city || '', tz: f.tz || '', activity: f.activity || 'chill', msg: f.msg || '', msgAt: f.msgAt || 0,
  };
}

const isColor = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
function cleanLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const k of ['skin', 'hair', 'top']) if (isColor(look[k])) out[k] = look[k].toLowerCase();
  if (LOOK_STYLES.includes(look.style)) out.style = look.style;
  return out;
}
function cleanTz(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return '';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return ''; }
}
function publicGift(g) {
  return { id: g.id, from: g.from, to: g.to, kind: g.kind, note: g.note, at: g.at, seen: g.seen, reply: g.reply || '', replyAt: g.replyAt || 0 };
}

function publicMoment(m) {
  return {
    id: m.id,
    friendId: m.friendId,
    caption: m.caption,
    createdAt: m.createdAt,
    expiresAt: m.createdAt + MOMENT_TTL_MS,
    videoUrl: `/media/${m.file}`,
    reactions: m.reactions,
  };
}

function circleState(circle) {
  const moments = Object.values(db.moments)
    .filter((m) => m.circleId === circle.id && Date.now() - m.createdAt <= MOMENT_TTL_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(publicMoment);
  return {
    id: circle.id,
    code: circle.code,
    name: circle.name,
    createdAt: circle.createdAt,
    friends: Object.values(circle.friends).map(publicFriend),
    moments,
    reactions: REACTIONS,
  };
}

const PALETTE = ['#ff7a59', '#4f9dff', '#2fbf71', '#b06bff', '#ffb020', '#ff5c8a', '#20b8c4', '#8a7dff'];

// ---------- API ----------

async function handleApi(req, res, parts, query) {
  // POST /api/circles
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'circles') {
    const body = await readJson(req);
    const name = clean(body.name, MAX_NAME) || 'Our circle';
    let code;
    do code = newCode(); while (findCircle(code));
    const circle = { id: newId(), code, name, createdAt: Date.now(), friends: {} };
    db.circles[circle.id] = circle;
    save();
    return send(res, 201, circleState(circle));
  }

  if (parts[0] !== 'circles' || !parts[1]) return send(res, 404, { error: 'Not found' });
  const circle = findCircle(parts[1]);
  if (!circle) return send(res, 404, { error: 'That circle does not exist. Check the invite code.' });
  const action = parts[2];

  // GET /api/circles/:id
  if (req.method === 'GET' && !action) return send(res, 200, circleState(circle));

  // POST /api/circles/:id/join
  if (req.method === 'POST' && action === 'join') {
    const body = await readJson(req);
    const name = clean(body.name, MAX_NAME);
    if (!name) return send(res, 400, { error: 'Please tell your friends your name.' });
    const count = Object.keys(circle.friends).length;
    const friend = {
      id: newId(),
      token: newId(24),
      name,
      color: PALETTE[count % PALETTE.length],
      joinedAt: Date.now(),
    };
    circle.friends[friend.id] = friend;
    save();
    broadcast(circle.id, { type: 'friend-joined', friend: publicFriend(friend) });
    return send(res, 201, { friendId: friend.id, token: friend.token, circle: circleState(circle) });
  }

  // GET /api/circles/:id/events  (SSE)
  if (req.method === 'GET' && action === 'events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write('retry: 3000\n\n');
    const who = authFriend(req, circle, query);
    if (who) res.friendId = who.id;
    if (!listeners.has(circle.id)) listeners.set(circle.id, new Set());
    listeners.get(circle.id).add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      listeners.get(circle.id)?.delete(res);
    });
    return;
  }

  // Everything below requires being a member of the circle.
  const me = authFriend(req, circle, query);
  if (!me) return send(res, 401, { error: 'Join this circle first.' });

  // POST /api/circles/:id/moments  (raw video body, caption in header)
  if (req.method === 'POST' && action === 'moments' && !parts[3]) {
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const ext = VIDEO_TYPES[type];
    if (!ext) return send(res, 415, { error: 'Please upload a webm, mp4 or mov video.' });
    const video = await readBody(req, MAX_VIDEO_BYTES);
    if (video.length < 100) return send(res, 400, { error: 'That video looks empty.' });
    let caption = '';
    try {
      caption = clean(decodeURIComponent(req.headers['x-caption'] || ''), MAX_CAPTION);
    } catch {
      caption = '';
    }
    const moment = {
      id: newId(),
      circleId: circle.id,
      friendId: me.id,
      caption,
      createdAt: Date.now(),
      file: `${newId(12)}${ext}`,
      type,
      reactions: {},
    };
    await fs.promises.writeFile(path.join(MEDIA_DIR, moment.file), video);
    db.moments[moment.id] = moment;
    save();
    broadcast(circle.id, { type: 'moment-added', moment: publicMoment(moment) });
    return send(res, 201, publicMoment(moment));
  }

  const moment = parts[3] && db.moments[parts[3]];
  if (action === 'moments' && (!moment || moment.circleId !== circle.id)) {
    return send(res, 404, { error: 'That moment has expired.' });
  }

  // POST /api/circles/:id/moments/:momentId/react  { emoji }
  if (req.method === 'POST' && action === 'moments' && parts[4] === 'react') {
    const { emoji } = await readJson(req);
    if (!REACTIONS.includes(emoji)) return send(res, 400, { error: 'Unknown reaction.' });
    const who = new Set(moment.reactions[emoji] || []);
    if (who.has(me.id)) who.delete(me.id);
    else who.add(me.id);
    if (who.size) moment.reactions[emoji] = [...who];
    else delete moment.reactions[emoji];
    save();
    broadcast(circle.id, { type: 'moment-updated', moment: publicMoment(moment) });
    return send(res, 200, publicMoment(moment));
  }

  // DELETE /api/circles/:id/moments/:momentId
  if (req.method === 'DELETE' && action === 'moments' && !parts[4]) {
    if (moment.friendId !== me.id) return send(res, 403, { error: 'You can only remove your own moments.' });
    fs.rm(path.join(MEDIA_DIR, moment.file), { force: true }, () => {});
    delete db.moments[moment.id];
    save();
    broadcast(circle.id, { type: 'moment-expired', id: moment.id });
    return send(res, 200, { ok: true });
  }

  // PUT /api/circles/:id/me  { name, look, city, tz, activity, msg, answered }
  if (req.method === 'PUT' && action === 'me') {
    const body = await readJson(req);
    const name = clean(body.name, MAX_NAME);
    if (name) me.name = name;
    const look = cleanLook(body.look);
    if (look) me.look = { ...(me.look || {}), ...look };
    if (typeof body.city === 'string') me.city = clean(body.city, 20);
    const tz = cleanTz(body.tz);
    if (tz) me.tz = tz;
    if (ACTIVITIES.includes(body.activity)) me.activity = body.activity;
    if (typeof body.msg === 'string' && body.answered) { me.msg = clean(body.msg, 80); me.msgAt = Date.now(); }
    save();
    broadcast(circle.id, { type: 'friend-updated', friend: publicFriend(me) });
    return send(res, 200, publicFriend(me));
  }

  // GET /api/circles/:id/gifts  -> gifts sent to me that I haven't opened, and replies to gifts I sent
  if (req.method === 'GET' && action === 'gifts') {
    const mine = Object.values(db.gifts || {}).filter((g) => g.circleId === circle.id);
    return send(res, 200, {
      incoming: mine.filter((g) => g.to === me.id && !g.seen).sort((a, b) => a.at - b.at).map(publicGift),
      replies: mine.filter((g) => g.from === me.id && g.reply).map(publicGift),
    });
  }

  // POST /api/circles/:id/gifts  { to, kind, note }
  if (req.method === 'POST' && action === 'gifts' && !parts[3]) {
    const body = await readJson(req);
    const to = circle.friends[body.to];
    if (!to) return send(res, 404, { error: 'That friend is not on this street.' });
    if (to.id === me.id) return send(res, 400, { error: 'You cannot send a gift to yourself.' });
    if (!GIFT_KINDS.includes(body.kind)) return send(res, 400, { error: 'Unknown gift.' });
    db.gifts ||= {};
    const recent = Object.values(db.gifts).filter((g) => g.from === me.id && Date.now() - g.at < 60 * 60 * 1000).length;
    if (recent >= 30) return send(res, 429, { error: 'That is a lot of gifts! Try again in a bit.' });
    const gift = { id: newId(), circleId: circle.id, from: me.id, to: to.id, kind: body.kind, note: clean(body.note, 60), at: Date.now(), seen: false };
    db.gifts[gift.id] = gift;
    save();
    sendTo(circle.id, [to.id], { type: 'gift', gift: publicGift(gift) });
    return send(res, 201, publicGift(gift));
  }

  // POST /api/circles/:id/gifts/:giftId/seen  { reply }
  if (req.method === 'POST' && action === 'gifts' && parts[4] === 'seen') {
    const gift = db.gifts?.[parts[3]];
    if (!gift || gift.circleId !== circle.id || gift.to !== me.id) return send(res, 404, { error: 'Gift not found.' });
    const body = await readJson(req);
    gift.seen = true;
    const reply = clean(body.reply, 80);
    if (reply) { gift.reply = reply; gift.replyAt = Date.now(); }
    save();
    if (reply) sendTo(circle.id, [gift.from], { type: 'gift-reply', gift: publicGift(gift) });
    return send(res, 200, publicGift(gift));
  }

  // POST /api/circles/:id/nudge  { friendId }
  if (req.method === 'POST' && action === 'nudge') {
    const { friendId } = await readJson(req);
    const target = circle.friends[friendId];
    if (!target) return send(res, 404, { error: 'Friend not found.' });
    if (target.id === me.id) return send(res, 400, { error: 'You cannot nudge yourself.' });
    target.lastNudgedAt = Date.now();
    save();
    broadcast(circle.id, { type: 'nudge', from: me.id, to: target.id, at: target.lastNudgedAt });
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'Not found' });
}

// ---------- media (with Range support so iOS Safari can play videos) ----------

function serveMedia(req, res, file) {
  if (!/^[A-Za-z0-9_-]+\.(webm|mp4|mov)$/.test(file)) return send(res, 404, 'Not found');
  const moment = Object.values(db.moments).find((m) => m.file === file);
  if (!moment) return send(res, 404, 'Not found');
  const full = path.join(MEDIA_DIR, file);
  fs.stat(full, (err, stat) => {
    if (err) return send(res, 404, 'Not found');
    const headers = {
      'Content-Type': moment.type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400',
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      let start = range[1] === '' ? stat.size - Number(range[2]) : Number(range[1]);
      let end = range[1] === '' || range[2] === '' ? stat.size - 1 : Number(range[2]);
      start = Math.max(0, start);
      end = Math.min(end, stat.size - 1);
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1,
      });
      return fs.createReadStream(full, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    fs.createReadStream(full).pipe(res);
  });
}

// ---------- static files ----------

function serveStatic(req, res, pathname) {
  // The pixel street is the main app: / (demo + start a street) and /s/CODE (a street).
  // The original video wall lives at /wall and /c/CODE.
  let rel = pathname;
  if (pathname === '/' || pathname.startsWith('/s/')) rel = '/street.html';
  else if (pathname === '/wall' || pathname.startsWith('/c/')) rel = '/index.html';
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'Content-Type': STATIC_TYPES[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) {
      const parts = pathname.slice(5).split('/').filter(Boolean).map(decodeURIComponent);
      return await handleApi(req, res, parts, new URL(req.url, 'http://localhost').searchParams);
    }
    if (pathname.startsWith('/media/') && req.method === 'GET') {
      return serveMedia(req, res, pathname.slice(7));
    }
    if (req.method === 'GET') return serveStatic(req, res, pathname);
    send(res, 405, 'Method not allowed');
  } catch (err) {
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
    if (!err.status) console.error(err);
  }
});

if (require.main === module) {
  pruneExpired();
  server.listen(PORT, () => console.log(`Friends Wall running at http://localhost:${PORT}`));
}

module.exports = { server };
