// Phone verification with one-time codes.
import crypto from "node:crypto";
import { deleteOtp, getOtp, setOtp } from "./store.js";
import { isConfigured, sendOtpTemplate } from "./whatsapp.js";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function hash(phone, code) {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export async function requestOtp(phone) {
  const existing = getOtp(phone);
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Please wait a few seconds before asking for a new code." };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  setOtp(phone, {
    hash: hash(phone, code),
    sentAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  });

  if (isConfigured() && process.env.WHATSAPP_OTP_TEMPLATE) {
    try {
      await sendOtpTemplate(phone, code);
      return { ok: true, channel: "whatsapp" };
    } catch (err) {
      console.error("[otp] failed to send via WhatsApp:", err.message);
      deleteOtp(phone);
      return { ok: false, error: "We couldn't send your code. Please check the number and try again." };
    }
  }

  // Dev mode: no SMS/WhatsApp sender configured, so print the code for testing.
  console.log(`[otp] DEV MODE code for +${phone}: ${code}`);
  return { ok: true, channel: "console" };
}

export function verifyOtp(phone, code) {
  const record = getOtp(phone);
  if (!record) return { ok: false, error: "Please request a new code." };
  if (Date.now() > record.expiresAt) {
    deleteOtp(phone);
    return { ok: false, error: "That code has expired. Please request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    deleteOtp(phone);
    return { ok: false, error: "Too many attempts. Please request a new code." };
  }

  const given = Buffer.from(hash(phone, String(code).trim()));
  const expected = Buffer.from(record.hash);
  if (!crypto.timingSafeEqual(given, expected)) {
    setOtp(phone, { ...record, attempts: record.attempts + 1 });
    return { ok: false, error: "That code doesn't match. Please try again." };
  }

  deleteOtp(phone);
  return { ok: true };
}
