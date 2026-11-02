import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = path.join(os.tmpdir(), `best-you-test-${process.pid}`);

const { toClaudeMessages } = await import("../src/companion.js");
const { splitMessage, extractMessages, verifySignature, normalizePhone } = await import("../src/whatsapp.js");
const { requestOtp, verifyOtp } = await import("../src/otp.js");
const { buildSystemPrompt } = await import("../src/prompts.js");

test("toClaudeMessages starts with user and merges consecutive turns", () => {
  const msgs = toClaudeMessages([
    { role: "assistant", text: "orphan" },
    { role: "user", text: "hi" },
    { role: "user", text: "you there?" },
    { role: "assistant", text: "yes" },
  ]);
  assert.deepEqual(msgs, [
    { role: "user", content: "hi\nyou there?" },
    { role: "assistant", content: "yes" },
  ]);
});

test("splitMessage keeps chunks under the limit and loses nothing", () => {
  const text = ("This is a sentence. ".repeat(30) + "\n\n").repeat(10);
  const parts = splitMessage(text, 500);
  assert.ok(parts.every((p) => p.length <= 500));
  assert.equal(parts.join(" ").replace(/\s+/g, " ").trim(), text.replace(/\s+/g, " ").trim());
});

test("extractMessages reads text and non-text messages", () => {
  const payload = { entry: [{ changes: [{ value: { messages: [
    { id: "a", from: "+44 7700", type: "text", text: { body: "hello" } },
    { id: "b", from: "447700", type: "image" },
  ] } }] }] };
  assert.deepEqual(extractMessages(payload), [
    { id: "a", from: "447700", type: "text", text: "hello" },
    { id: "b", from: "447700", type: "image", text: null },
  ]);
  assert.deepEqual(extractMessages({}), []);
});

test("verifySignature checks the HMAC", () => {
  process.env.WHATSAPP_APP_SECRET = "s3cret";
  const body = Buffer.from('{"x":1}');
  const sig = "sha256=" + crypto.createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(verifySignature(body, sig), true);
  assert.equal(verifySignature(body, "sha256=bad"), false);
  assert.equal(verifySignature(body, undefined), false);
  delete process.env.WHATSAPP_APP_SECRET;
});

test("OTP flow: wrong code rejected, right code accepted once", async () => {
  const phone = normalizePhone("+1 555 000 1234");
  const logs = [];
  const orig = console.log;
  console.log = (m) => logs.push(String(m));
  const r = await requestOtp(phone);
  console.log = orig;
  assert.equal(r.ok, true);
  const code = logs.join("\n").match(/(\d{6})$/m)[1];
  assert.equal(verifyOtp(phone, "000000" === code ? "111111" : "000000").ok, false);
  assert.equal(verifyOtp(phone, code).ok, true);
  assert.equal(verifyOtp(phone, code).ok, false);
});

test("system prompt includes onboarding only until onboarded", () => {
  assert.match(buildSystemPrompt({ profile: "", onboarded: false }), /Getting to know them/);
  const p = buildSystemPrompt({ profile: "Name: Sam", onboarded: true });
  assert.doesNotMatch(p, /Getting to know them/);
  assert.match(p, /Name: Sam/);
});
