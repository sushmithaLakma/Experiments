// Tiny JSON-file storage, good enough for an MVP with a handful of users.
// Swap for a real database (Postgres, SQLite, Firestore...) before scaling up.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const MAX_HISTORY = 40; // messages kept per user for conversation context

let db = { users: {}, otps: {} };

function load() {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db.users ??= {};
    db.otps ??= {};
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

let writeTimer = null;
function save() {
  // Debounce writes; write atomically via a temp file.
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 50);
}

load();

export function getUser(phone) {
  return db.users[phone] || null;
}

export function upsertUser(phone, fields = {}) {
  const existing = db.users[phone] || {
    phone,
    createdAt: new Date().toISOString(),
    verified: false,
    onboarded: false,
    profile: "",
    history: [],
    messagesSinceProfileUpdate: 0,
  };
  db.users[phone] = { ...existing, ...fields };
  save();
  return db.users[phone];
}

export function appendMessage(phone, role, text) {
  const user = db.users[phone];
  if (!user) throw new Error(`Unknown user ${phone}`);
  user.history.push({ role, text, at: new Date().toISOString() });
  if (user.history.length > MAX_HISTORY) {
    user.history = user.history.slice(-MAX_HISTORY);
  }
  save();
  return user;
}

export function setOtp(phone, record) {
  db.otps[phone] = record;
  save();
}

export function getOtp(phone) {
  return db.otps[phone] || null;
}

export function deleteOtp(phone) {
  delete db.otps[phone];
  save();
}

// Lets the user wipe everything we hold about them.
export function deleteUser(phone) {
  delete db.users[phone];
  delete db.otps[phone];
  save();
}
