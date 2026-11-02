// Talks to Claude: generates Best You's replies and keeps each person's notes up to date.
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, PROFILE_UPDATE_PROMPT } from "./prompts.js";
import { appendMessage, getUser, upsertUser } from "./store.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const PROFILE_UPDATE_EVERY = 6; // after onboarding, refresh notes every N user messages

// Server-side fallback: if a request is declined by a safety classifier,
// the API retries it on a recommended fallback model inside the same call.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const SOFT_ERROR_REPLY =
  "Sorry, I lost my train of thought for a second there. Could you send that again? 💛";

let client = null;
function claude() {
  client ??= new Anthropic();
  return client;
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// Claude expects the conversation to start with a user turn and alternate roles,
// so merge any back-to-back messages from the same side (e.g. several quick texts).
export function toClaudeMessages(history) {
  const messages = [];
  for (const { role, text } of history) {
    if (!messages.length && role !== "user") continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content += `\n${text}`;
    } else {
      messages.push({ role, content: text });
    }
  }
  return messages;
}

// One conversation at a time per person, so quick consecutive texts are handled in order.
const queues = new Map();
function serialize(key, task) {
  const previous = queues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(key, next);
  next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
  return next;
}

/**
 * Handle one incoming message from a person and return Best You's reply.
 */
export function respond(phone, text) {
  return serialize(phone, async () => {
    let user = getUser(phone) || upsertUser(phone);
    appendMessage(phone, "user", text);
    user = getUser(phone);

    let reply;
    try {
      const response = await claude().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: buildSystemPrompt(user),
        messages: toClaudeMessages(user.history),
      });

      if (response.stop_reason === "refusal") {
        reply =
          "I want to be careful here, and I don't think I'm the right one to help with this part. If you're going through something heavy, please reach out to someone you trust or a local helpline (you can find one at https://findahelpline.com). I'm still here to talk about anything else. 💛";
      } else {
        reply = textOf(response) || SOFT_ERROR_REPLY;
      }
    } catch (err) {
      console.error("[companion] Claude request failed:", err?.status, err?.message);
      return SOFT_ERROR_REPLY; // don't store the failed turn
    }

    appendMessage(phone, "assistant", reply);

    const count = (getUser(phone).messagesSinceProfileUpdate || 0) + 1;
    upsertUser(phone, { messagesSinceProfileUpdate: count });
    if (!user.onboarded || count >= PROFILE_UPDATE_EVERY) {
      // Runs in the background; the reply is not held up by it.
      updateProfile(phone).catch((err) =>
        console.error("[companion] profile update failed:", err?.message),
      );
    }

    return reply;
  });
}

/**
 * Refresh the private notes Best You keeps about a person, from recent conversation.
 */
export async function updateProfile(phone) {
  const user = getUser(phone);
  if (!user) return;

  const transcript = user.history
    .slice(-20)
    .map((m) => `${m.role === "user" ? "Person" : "Best You"}: ${m.text}`)
    .join("\n");

  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: PROFILE_UPDATE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Current notes:\n${user.profile || "(none yet)"}\n\nRecent conversation:\n${transcript}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return;

  const output = textOf(response);
  if (!output) return;

  const match = output.match(/ONBOARDED:\s*(yes|no)\s*$/i);
  const profile = output.replace(/ONBOARDED:\s*(yes|no)\s*$/i, "").trim();
  upsertUser(phone, {
    profile,
    onboarded: user.onboarded || (match ? match[1].toLowerCase() === "yes" : false),
    messagesSinceProfileUpdate: 0,
  });
}
