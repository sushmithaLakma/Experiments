import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { respond } from "./companion.js";
import { requestOtp, verifyOtp } from "./otp.js";
import { deleteUser, getUser, upsertUser } from "./store.js";
import {
  chatLink,
  extractMessages,
  isConfigured,
  normalizePhone,
  sendText,
  verifySignature,
} from "./whatsapp.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const TEST_CHAT_ENABLED = process.env.ENABLE_TEST_CHAT !== "false";
const DELETE_COMMAND = "delete my data";

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf; // needed to check WhatsApp webhook signatures
    },
  }),
);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
app.use(express.static(path.join(ROOT, "public")));

function validPhone(phone) {
  return /^\d{8,15}$/.test(phone); // E.164: up to 15 digits including country code
}

// ---------- Sign-up: phone number -> OTP -> WhatsApp link ----------

app.post("/api/otp/request", async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!validPhone(phone)) {
    return res.status(400).json({ error: "Please enter your full number with country code." });
  }
  const result = await requestOtp(phone);
  if (!result.ok) return res.status(429).json({ error: result.error });
  res.json({ sent: true, channel: result.channel });
});

app.post("/api/otp/verify", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const result = verifyOtp(phone, req.body?.code || "");
  if (!result.ok) return res.status(400).json({ error: result.error });

  const testChatToken = crypto.randomBytes(24).toString("hex");
  upsertUser(phone, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    testChatToken,
  });
  res.json({
    verified: true,
    whatsappLink: chatLink("Hi"),
    testChat: TEST_CHAT_ENABLED ? { phone, token: testChatToken } : null,
  });
});

// ---------- Browser test chat (try the conversation without WhatsApp) ----------

function testChatUser(req) {
  const phone = normalizePhone(req.body?.phone);
  const user = getUser(phone);
  const token = String(req.body?.token || "");
  if (!user?.verified || !user.testChatToken || token.length !== user.testChatToken.length) {
    return null;
  }
  const ok = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(user.testChatToken));
  return ok ? user : null;
}

app.post("/api/chat", async (req, res) => {
  if (!TEST_CHAT_ENABLED) return res.status(404).end();
  const user = testChatUser(req);
  if (!user) return res.status(401).json({ error: "Please sign up again." });

  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Empty message." });

  if (text.toLowerCase() === DELETE_COMMAND) {
    deleteUser(user.phone);
    return res.json({ reply: "Done. I've deleted everything I had about you. Take care 💛", deleted: true });
  }

  const reply = await respond(user.phone, text);
  res.json({ reply });
});

app.post("/api/chat/history", (req, res) => {
  if (!TEST_CHAT_ENABLED) return res.status(404).end();
  const user = testChatUser(req);
  if (!user) return res.status(401).json({ error: "Please sign up again." });
  res.json({ history: user.history.map(({ role, text }) => ({ role, text })) });
});

// ---------- WhatsApp webhook ----------

// Meta calls this once when you register the webhook URL.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge));
  }
  res.sendStatus(403);
});

const seenMessageIds = new Set(); // Meta may deliver the same message more than once
function alreadySeen(id) {
  if (!id) return false;
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  if (seenMessageIds.size > 5000) {
    seenMessageIds.delete(seenMessageIds.values().next().value);
  }
  return false;
}

app.post("/webhook", (req, res) => {
  if (!verifySignature(req.rawBody, req.get("x-hub-signature-256"))) {
    return res.sendStatus(401);
  }
  // Acknowledge straight away; Meta retries if it doesn't get a quick 200.
  res.sendStatus(200);

  for (const msg of extractMessages(req.body)) {
    if (alreadySeen(msg.id)) continue;
    handleWhatsAppMessage(msg).catch((err) =>
      console.error("[webhook] failed to handle message:", err.message),
    );
  }
});

async function handleWhatsAppMessage({ from, text }) {
  const user = getUser(from);

  if (!user?.verified) {
    await sendText(
      from,
      `Hi! I'd love to talk. First, please sign up here so I know it's really you: ${PUBLIC_URL}`,
    );
    return;
  }

  if (text === null) {
    await sendText(from, "I can only read text messages for now. Could you type it out for me? 💛");
    return;
  }

  if (text.trim().toLowerCase() === DELETE_COMMAND) {
    deleteUser(from);
    await sendText(from, "Done. I've deleted everything I had about you. Take care 💛");
    return;
  }

  const reply = await respond(from, text);
  await sendText(from, reply);
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Best You is running at ${PUBLIC_URL}`);
  if (!isConfigured()) {
    console.log("WhatsApp is not configured: dev mode (OTP codes print here; use /chat.html to talk).");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Note: ANTHROPIC_API_KEY is not set; replies need it (or another Anthropic credential).");
  }
});
