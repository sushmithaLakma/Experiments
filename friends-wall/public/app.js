// Friends Wall — front end. No framework, no build step.

const MAX_RECORD_SECONDS = 15;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const app = document.getElementById('app');

// ---------- tiny helpers ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

function toast(message, ms = 3500) {
  const t = h('div', { class: 'toast' }, message);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), ms);
}

function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function timeLeft(ts) {
  const m = Math.max(0, Math.round((ts - Date.now()) / 60000));
  return m >= 60 ? `${Math.round(m / 60)}h left` : `${m}m left`;
}

const initial = (name) => (name.trim()[0] || '?').toUpperCase();

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (state.me) {
    opts.headers['x-friend-id'] = state.me.friendId;
    opts.headers['x-friend-token'] = state.me.token;
  }
  if (body !== undefined) {
    if (raw) opts.body = body;
    else {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- state ----------

const state = {
  circle: null, // { id, code, name, friends, moments, reactions }
  me: null, // { friendId, token }
  events: null,
  freshIds: new Set(),
};

const videoCache = new Map(); // momentId -> <video> so the grid doesn't restart clips on re-render

function rememberCircle(circle) {
  const list = store.get('fw:circles', []).filter((c) => c.id !== circle.id);
  list.unshift({ id: circle.id, code: circle.code, name: circle.name });
  store.set('fw:circles', list.slice(0, 20));
}

const friendById = (id) => state.circle?.friends.find((f) => f.id === id);
const momentsOf = (friendId) => state.circle.moments.filter((m) => m.friendId === friendId);

// ---------- routing ----------

function go(path) {
  history.pushState({}, '', path);
  route();
}
window.addEventListener('popstate', route);

async function route() {
  closeEvents();
  const match = location.pathname.match(/^\/c\/([^/]+)/);
  if (!match) return renderLanding();
  try {
    state.circle = await api(`/circles/${encodeURIComponent(match[1])}`);
  } catch (err) {
    state.circle = null;
    renderLanding(err.message);
    return;
  }
  state.me = store.get(`fw:me:${state.circle.id}`, null);
  if (state.me && !friendById(state.me.friendId)) state.me = null;
  if (!state.me) return renderJoin();
  rememberCircle(state.circle);
  openEvents();
  renderWall();
}

// ---------- landing ----------

function renderLanding(error) {
  state.circle = null;
  state.me = null;
  document.title = 'Friends Wall';
  const colors = ['#ff7a59', '#4f9dff', '#2fbf71', '#b06bff', '#ffb020', '#ff5c8a', '#20b8c4', '#8a7dff'];
  const mine = store.get('fw:circles', []);

  const createForm = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const circle = await api('/circles', { method: 'POST', body: { name: e.target.name.value } });
        go(`/c/${circle.code}`);
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
      }
    },
  },
    h('input', { name: 'name', placeholder: 'e.g. College gang, The cousins', maxlength: 40 }),
    h('button', { class: 'primary', type: 'submit' }, 'Create'),
  );

  const joinForm = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const code = e.target.code.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code) go(`/c/${code}`);
    },
  },
    h('input', { name: 'code', placeholder: 'Invite code', maxlength: 12, autocapitalize: 'characters', style: 'letter-spacing:0.1em' }),
    h('button', { class: 'ghost', type: 'submit' }, 'Join'),
  );

  app.replaceChildren(h('main', { class: 'landing' },
    h('div', { class: 'mosaic', 'aria-hidden': 'true' }, colors.map((c) => h('div', { style: `background:${c}` }))),
    h('h1', {}, 'All your friends, ', h('em', {}, 'in one frame.')),
    h('p', { class: 'lede' },
      'Life gets busy and we drift apart. Share a few seconds of what you’re doing — cooking, walking the dog, stuck in traffic — and see what everyone else is up to, all on one screen. Moments fade after 24 hours, so there’s no pressure to be perfect.'),
    error && h('div', { class: 'card', style: 'border-color:#e5384f' }, error),
    mine.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'Your circles'),
      h('ul', { class: 'my-circles' }, mine.map((c) =>
        h('li', {}, h('a', { href: `/c/${c.code}`, onclick: (e) => { e.preventDefault(); go(`/c/${c.code}`); } },
          c.name, h('span', {}, c.code)))))),
    h('section', { class: 'card' }, h('h2', {}, 'Start a circle'), createForm,
      h('p', { class: 'hint' }, 'You’ll get an invite link to send to your friends.')),
    h('section', { class: 'card' }, h('h2', {}, 'Got an invite code?'), joinForm),
  ));
}

// ---------- join ----------

function renderJoin() {
  const c = state.circle;
  document.title = `Join ${c.name} · Friends Wall`;
  const names = c.friends.map((f) => f.name);
  app.replaceChildren(h('main', { class: 'landing' },
    h('h1', {}, 'Join ', h('em', {}, c.name)),
    h('p', { class: 'lede' }, names.length
      ? `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''} ${names.length === 1 ? 'is' : 'are'} already here.`
      : 'You’re the first one here. Invite your friends after you join.'),
    h('section', { class: 'card' },
      h('h2', {}, 'What do your friends call you?'),
      h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button');
          btn.disabled = true;
          try {
            const res = await api(`/circles/${c.id}/join`, { method: 'POST', body: { name: e.target.name.value } });
            state.me = { friendId: res.friendId, token: res.token };
            store.set(`fw:me:${c.id}`, state.me);
            route();
          } catch (err) {
            toast(err.message);
            btn.disabled = false;
          }
        },
      },
        h('input', { name: 'name', placeholder: 'Your name', maxlength: 40, required: true, autofocus: true }),
        h('button', { class: 'primary', type: 'submit' }, 'Join'),
      ),
      h('p', { class: 'hint' }, 'You stay signed in on this device.'),
    ),
  ));
}

// ---------- wall ----------

function inviteLink() {
  return `${location.origin}/c/${state.circle.code}`;
}

async function shareInvite() {
  const url = inviteLink();
  const text = `Join our circle “${state.circle.name}” on Friends Wall so we can see what everyone’s up to.`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Friends Wall', text, url }); return; } catch { /* cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Invite link copied — paste it in your group chat.');
  } catch {
    prompt('Copy this invite link:', url);
  }
}

function renderWall() {
  const c = state.circle;
  document.title = `${c.name} · Friends Wall`;
  const me = friendById(state.me.friendId);

  // You first, then whoever shared most recently, then the quiet ones.
  const latest = (f) => momentsOf(f.id)[0]?.createdAt || 0;
  const friends = [...c.friends].sort((a, b) => {
    if (a.id === me.id) return -1;
    if (b.id === me.id) return 1;
    return latest(b) - latest(a) || a.joinedAt - b.joinedAt;
  });

  const liveIds = new Set(c.moments.map((m) => m.id));
  for (const id of videoCache.keys()) if (!liveIds.has(id)) videoCache.delete(id);

  const tiles = friends.map((f) => renderTile(f, f.id === me.id));
  if (c.friends.length < 12) {
    tiles.push(h('button', { class: 'tile invite', onclick: shareInvite },
      h('div', { class: 'plus' }, '+'),
      h('div', {}, 'Invite a friend'),
      h('code', {}, c.code),
    ));
  }

  const sharedToday = new Set(c.moments.map((m) => m.friendId)).size;
  app.replaceChildren(
    h('header', { class: 'topbar' },
      h('a', { class: 'home', href: '/wall', title: 'All circles', onclick: (e) => { e.preventDefault(); go('/wall'); } }, '◧'),
      h('h1', {}, c.name, h('small', {}, `${sharedToday} of ${c.friends.length} shared today`)),
      h('button', { class: 'ghost', onclick: shareInvite }, 'Invite'),
    ),
    h('main', { class: 'wall', 'data-count': Math.min(tiles.length, 3) }, tiles),
    h('button', { class: 'primary fab', onclick: openRecorder }, '● Share a moment'),
  );

  for (const v of app.querySelectorAll('.tile video')) {
    visibility.observe(v);
    v.play().catch(() => {});
  }
}

function renderTile(friend, isMe) {
  const moments = momentsOf(friend.id);
  const style = `--friend:${friend.color}`;
  const avatar = h('div', { class: 'avatar' }, initial(friend.name));

  if (!moments.length) {
    return h('div', { class: `tile empty${isMe ? ' me' : ''}`, style },
      avatar,
      h('div', { class: 'name' }, isMe ? 'You' : friend.name),
      h('p', {}, isMe ? 'Your friends would love to see your day.' : 'Hasn’t shared anything today'),
      isMe
        ? h('button', { class: 'ghost', onclick: openRecorder }, 'Share yours')
        : h('button', { class: 'ghost', onclick: (e) => nudge(friend, e.currentTarget) }, '👋 Nudge'),
    );
  }

  const m = moments[0];
  let video = videoCache.get(m.id);
  if (!video) {
    video = h('video', { src: m.videoUrl, muted: true, loop: true, playsInline: true, autoplay: true, preload: 'metadata' });
    video.muted = true; // the attribute alone isn't enough for autoplay in some browsers
    videoCache.set(m.id, video);
  }
  const reactionChips = Object.entries(m.reactions).map(([emoji, who]) =>
    h('span', { class: `chip${who.includes(state.me.friendId) ? ' mine' : ''}` }, `${emoji} ${who.length}`));

  return h('button', {
    class: `tile${isMe ? ' me' : ''}${state.freshIds.has(m.id) ? ' fresh' : ''}`,
    style,
    onclick: () => openViewer(friend.id, 0),
    'aria-label': `${friend.name}: ${m.caption || 'video moment'}`,
  },
    video,
    h('div', { class: 'shade' }),
    h('div', { class: 'head' }, avatar, h('span', { class: 'name' }, isMe ? 'You' : friend.name), h('span', { class: 'ago' }, timeAgo(m.createdAt))),
    h('div', { class: 'foot' },
      moments.length > 1 && h('div', { class: 'stack' }, moments.slice(0, 8).map(() => h('i'))),
      m.caption && h('p', { class: 'caption' }, m.caption),
      reactionChips.length > 0 && h('div', { class: 'chips' }, reactionChips),
    ),
  );
}

// Only play the clips that are on screen — saves battery with lots of friends.
const visibility = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) target.play().catch(() => {});
    else target.pause();
  }
}, { threshold: 0.1 });

async function nudge(friend, btn) {
  btn.disabled = true;
  try {
    await api(`/circles/${state.circle.id}/nudge`, { method: 'POST', body: { friendId: friend.id } });
    btn.textContent = 'Nudged ✓';
    toast(`${friend.name} will see that you’re thinking of them.`);
  } catch (err) {
    toast(err.message);
    btn.disabled = false;
  }
}

// ---------- live updates ----------

function openEvents() {
  const es = new EventSource(`/api/circles/${state.circle.id}/events`);
  state.events = es;
  es.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    const c = state.circle;
    if (!c) return;
    if (ev.type === 'moment-added') {
      if (c.moments.some((m) => m.id === ev.moment.id)) return;
      c.moments.unshift(ev.moment);
      state.freshIds.add(ev.moment.id);
      setTimeout(() => state.freshIds.delete(ev.moment.id), 8000);
      const f = friendById(ev.moment.friendId);
      if (f && f.id !== state.me.friendId) toast(`${f.name} just shared: ${ev.moment.caption || 'a new moment'}`);
    } else if (ev.type === 'moment-updated') {
      const i = c.moments.findIndex((m) => m.id === ev.moment.id);
      if (i >= 0) c.moments[i] = ev.moment;
      if (viewer.current?.id === ev.moment.id) renderReactions();
    } else if (ev.type === 'moment-expired') {
      c.moments = c.moments.filter((m) => m.id !== ev.id);
    } else if (ev.type === 'friend-joined') {
      if (!friendById(ev.friend.id)) {
        c.friends.push(ev.friend);
        if (ev.friend.id !== state.me.friendId) toast(`${ev.friend.name} joined the circle 🎉`);
      }
    } else if (ev.type === 'nudge') {
      if (ev.to === state.me.friendId) {
        const from = friendById(ev.from);
        toast(`👋 ${from ? from.name : 'A friend'} is wondering what you’re up to. Share a moment?`, 6000);
      }
      return;
    }
    if (!document.getElementById('recorder').open) renderWall();
  };
}

function closeEvents() {
  state.events?.close();
  state.events = null;
}

setInterval(() => {
  if (state.circle && state.me && !document.querySelector('dialog[open]')) renderWall();
}, 60000);

// ---------- viewer ----------

const viewerEl = document.getElementById('viewer');
const viewer = { friendId: null, index: 0, current: null };
const viewerVideo = viewerEl.querySelector('video');

function openViewer(friendId, index) {
  viewer.friendId = friendId;
  showMoment(index);
  if (!viewerEl.open) viewerEl.showModal();
}

function showMoment(index) {
  const moments = momentsOf(viewer.friendId);
  if (!moments.length) return viewerEl.close();
  viewer.index = Math.max(0, Math.min(index, moments.length - 1));
  const m = moments[viewer.index];
  viewer.current = m;
  const f = friendById(m.friendId);
  const isMine = m.friendId === state.me.friendId;

  viewerEl.style.setProperty('--friend', f.color);
  viewerEl.querySelector('.who').replaceChildren(
    h('div', { class: 'avatar' }, initial(f.name)),
    h('div', {}, isMine ? 'You' : f.name, h('br'), h('small', {}, `${timeAgo(m.createdAt)} · ${viewer.index + 1} of ${moments.length}`)),
  );
  viewerVideo.src = m.videoUrl;
  viewerVideo.play().catch(() => {});
  viewerEl.querySelector('.viewer-caption').textContent = m.caption;
  viewerEl.querySelector('.prev').hidden = viewer.index === 0;
  viewerEl.querySelector('.next').hidden = viewer.index === moments.length - 1;
  viewerEl.querySelector('.viewer-meta').replaceChildren(
    ...[
      h('span', {}, `Fades in ${timeLeft(m.expiresAt).replace(' left', '')}`),
      isMine && h('button', { onclick: () => deleteMoment(m) }, 'Remove'),
    ].filter(Boolean),
  );
  renderReactions();
}

function renderReactions() {
  const m = state.circle.moments.find((x) => x.id === viewer.current?.id);
  if (!m) return;
  viewer.current = m;
  const box = viewerEl.querySelector('.reactions');
  const who = Object.values(m.reactions).flat()
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((id) => (id === state.me.friendId ? 'you' : friendById(id)?.name))
    .filter(Boolean);
  box.replaceChildren(
    ...state.circle.reactions.map((emoji) => {
      const list = m.reactions[emoji] || [];
      return h('button', {
        class: list.includes(state.me.friendId) ? 'on' : '',
        'aria-label': `React ${emoji}`,
        onclick: () => react(m, emoji),
      }, emoji, list.length > 0 && h('span', {}, list.length));
    }),
    ...(who.length ? [h('div', { class: 'who-reacted' }, `Loved by ${who.join(', ')}`)] : []),
  );
}

async function react(m, emoji) {
  try {
    const updated = await api(`/circles/${state.circle.id}/moments/${m.id}/react`, { method: 'POST', body: { emoji } });
    const i = state.circle.moments.findIndex((x) => x.id === m.id);
    if (i >= 0) state.circle.moments[i] = updated;
    renderReactions();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteMoment(m) {
  if (!confirm('Remove this moment for everyone?')) return;
  try {
    await api(`/circles/${state.circle.id}/moments/${m.id}`, { method: 'DELETE' });
    state.circle.moments = state.circle.moments.filter((x) => x.id !== m.id);
    viewerEl.close();
    renderWall();
  } catch (err) {
    toast(err.message);
  }
}

viewerEl.querySelector('.prev').onclick = () => showMoment(viewer.index - 1);
viewerEl.querySelector('.next').onclick = () => showMoment(viewer.index + 1);
viewerVideo.addEventListener('ended', () => {
  if (viewer.index < momentsOf(viewer.friendId).length - 1) showMoment(viewer.index + 1);
});
viewerEl.addEventListener('close', () => {
  viewerVideo.pause();
  viewerVideo.removeAttribute('src');
  viewerVideo.load();
  viewer.current = null;
  renderWall();
});
viewerEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') showMoment(viewer.index - 1);
  if (e.key === 'ArrowRight') showMoment(viewer.index + 1);
});

// ---------- recorder ----------

const recEl = document.getElementById('recorder');
const rec = {
  stream: null,
  recorder: null,
  chunks: [],
  blob: null,
  facing: 'user',
  timer: null,
  previewUrl: null,
};
const $ = (sel) => recEl.querySelector(sel);

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const options = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

async function startCamera() {
  stopCamera();
  const msg = $('.rec-message');
  msg.hidden = true;
  $('.rec-btn').disabled = true;
  if (!navigator.mediaDevices?.getUserMedia || pickMimeType() === null) {
    msg.textContent = 'This browser can’t record video here. Use “Upload” to pick a clip instead.';
    msg.hidden = false;
    return;
  }
  const video = { facingMode: rec.facing, width: { ideal: 720 }, height: { ideal: 960 } };
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
  } catch {
    try {
      rec.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch {
      msg.textContent = 'Camera access was blocked. Allow the camera in your browser settings, or use “Upload” to share a clip.';
      msg.hidden = false;
      return;
    }
  }
  const live = $('.rec-live');
  live.classList.toggle('back', rec.facing !== 'user');
  live.srcObject = rec.stream;
  live.play().catch(() => {});
  $('.rec-btn').disabled = false;
}

function stopCamera() {
  rec.stream?.getTracks().forEach((t) => t.stop());
  rec.stream = null;
  $('.rec-live').srcObject = null;
}

function resetRecorder() {
  clearInterval(rec.timer);
  if (rec.previewUrl) URL.revokeObjectURL(rec.previewUrl);
  rec.previewUrl = null;
  rec.blob = null;
  rec.chunks = [];
  $('.rec-preview').hidden = true;
  $('.rec-preview').removeAttribute('src');
  $('.rec-live').hidden = false;
  $('.rec-timer').hidden = true;
  $('.rec-controls').hidden = false;
  $('.rec-post').hidden = true;
  $('.rec-btn').classList.remove('recording');
  $('.rec-post').caption.value = '';
}

function openRecorder() {
  resetRecorder();
  recEl.showModal();
  startCamera();
}

function startRecording() {
  const mimeType = pickMimeType();
  rec.chunks = [];
  rec.recorder = new MediaRecorder(rec.stream, mimeType ? { mimeType } : undefined);
  rec.recorder.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
  rec.recorder.onstop = () => {
    if (!recEl.open) return; // closed mid-recording: throw the clip away
    const type = rec.recorder.mimeType || mimeType || 'video/webm';
    showPreview(new Blob(rec.chunks, { type }));
  };
  rec.recorder.start(250);
  $('.rec-btn').classList.add('recording');
  $('.rec-btn').setAttribute('aria-label', 'Stop recording');
  const started = Date.now();
  const timerEl = $('.rec-timer');
  timerEl.hidden = false;
  timerEl.textContent = `0s / ${MAX_RECORD_SECONDS}s`;
  rec.timer = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    timerEl.textContent = `${s}s / ${MAX_RECORD_SECONDS}s`;
    if (s >= MAX_RECORD_SECONDS) stopRecording();
  }, 200);
}

function stopRecording() {
  clearInterval(rec.timer);
  if (rec.recorder?.state === 'recording') rec.recorder.stop();
  $('.rec-btn').classList.remove('recording');
  $('.rec-btn').setAttribute('aria-label', 'Start recording');
}

function showPreview(blob) {
  rec.blob = blob;
  stopCamera();
  if (rec.previewUrl) URL.revokeObjectURL(rec.previewUrl);
  rec.previewUrl = URL.createObjectURL(blob);
  const preview = $('.rec-preview');
  preview.src = rec.previewUrl;
  preview.hidden = false;
  preview.play().catch(() => {});
  $('.rec-live').hidden = true;
  $('.rec-timer').hidden = true;
  $('.rec-message').hidden = true;
  $('.rec-controls').hidden = true;
  $('.rec-post').hidden = false;
  $('.rec-post').caption.focus();
}

$('.rec-btn').onclick = () => {
  if (rec.recorder?.state === 'recording') stopRecording();
  else if (rec.stream) startRecording();
};
$('.rec-flip').onclick = () => {
  if (rec.recorder?.state === 'recording') return;
  rec.facing = rec.facing === 'user' ? 'environment' : 'user';
  startCamera();
};
$('.file-pick input').onchange = (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('video/')) return toast('Please choose a video.');
  if (file.size > MAX_UPLOAD_BYTES) return toast('That video is too big — try a clip under 25 MB.');
  showPreview(file);
};
$('.rec-retake').onclick = () => {
  resetRecorder();
  startCamera();
};
$('.rec-post').onsubmit = async (e) => {
  e.preventDefault();
  if (!rec.blob) return;
  const btn = e.target.querySelector('.primary');
  btn.disabled = true;
  btn.textContent = 'Sharing…';
  try {
    const moment = await api(`/circles/${state.circle.id}/moments`, {
      method: 'POST',
      raw: true,
      body: rec.blob,
      headers: {
        'content-type': rec.blob.type.split(';')[0] || 'video/webm',
        'x-caption': encodeURIComponent(e.target.caption.value.trim()),
      },
    });
    if (!state.circle.moments.some((m) => m.id === moment.id)) state.circle.moments.unshift(moment);
    recEl.close();
    toast('Shared! Your friends can see it now.');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Share with friends';
  }
};
recEl.addEventListener('close', () => {
  stopRecording();
  stopCamera();
  resetRecorder();
  renderWall();
});

for (const d of document.querySelectorAll('dialog')) {
  d.querySelector('[data-close]').onclick = () => d.close();
  // Tap outside the sheet to close it.
  d.addEventListener('click', (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) d.close();
  });
}

route();
