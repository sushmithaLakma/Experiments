// WhatsApp Business Platform (Cloud API) helpers.
// Request shapes follow Meta's Cloud API docs as of writing; verify against the
// current docs (https://developers.facebook.com/docs/whatsapp/cloud-api) before going live.
import crypto from "node:crypto";

const MAX_TEXT_LENGTH = 4000; // WhatsApp text messages are limited to 4096 characters

export function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Phone numbers are stored as digits only, with country code (e.g. "447700900123").
export function normalizePhone(input) {
  return String(input || "").replace(/\D/g, "");
}

export function chatLink(prefill = "Hi") {
  const number = normalizePhone(process.env.WHATSAPP_BUSINESS_NUMBER);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(prefill)}`;
}

async function callApi(body) {
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
  return res.json();
}

// Split long replies on paragraph or sentence boundaries so nothing is cut mid-word.
export function splitMessage(text, limit = MAX_TEXT_LENGTH) {
  const parts = [];
  let rest = text.trim();
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n\n", limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(". ", limit - 1) + 1;
    if (cut < limit / 2) cut = rest.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export async function sendText(to, text) {
  for (const part of splitMessage(text)) {
    await callApi({ to, type: "text", text: { body: part, preview_url: false } });
  }
}

// Sends an OTP using an approved "authentication" template with a copy-code button.
// The exact component layout depends on how your template was created in Meta's
// WhatsApp Manager; adjust if Meta rejects the request.
export async function sendOtpTemplate(to, code) {
  return callApi({
    to,
    type: "template",
    template: {
      name: process.env.WHATSAPP_OTP_TEMPLATE,
      language: { code: process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US" },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  });
}

// Meta signs each webhook POST with the app secret: header "X-Hub-Signature-256: sha256=<hex>".
export function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // not configured (dev); configure it in production
  if (!signatureHeader || !rawBody) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Pulls incoming user messages out of a webhook payload.
// Returns [{ id, from, type, text }]; non-text messages have text = null.
export function extractMessages(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const msg of change?.value?.messages || []) {
        out.push({
          id: msg.id,
          from: normalizePhone(msg.from),
          type: msg.type,
          text: msg.type === "text" ? msg.text?.body ?? "" : null,
        });
      }
    }
  }
  return out;
}
