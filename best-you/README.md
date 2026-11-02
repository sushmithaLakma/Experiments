# Best You (MVP)

A WhatsApp companion that talks to you like the best version of yourself. It's warm, friendly, honest and firm when it needs to be, and it's shaped by what *you* want for your work, your relationships and yourself.

People sign up with their phone number, verify it with a one-time code, then tap a link that opens the chat in WhatsApp.

## How it works

```
Sign-up page (phone → OTP → "Start chatting on WhatsApp")
                         │
User texts on WhatsApp ──▶ Meta WhatsApp Cloud API ──▶ POST /webhook (this server)
                                                         │
                         ┌───────────────────────────────┘
                         ▼
               src/companion.js
                 • loads the person's private notes + recent chat (data/db.json)
                 • asks Claude for a reply in Best You's voice (src/prompts.js)
                 • every few messages, refreshes the notes in the background
                         │
                         ▼
               reply sent back through the WhatsApp API
```

**First conversation:** no forms. Best You introduces itself and gets to know the person one question at a time: their name, who they want to be, what pulls them off track, what matters most and what helps on hard days. It keeps private notes from this and updates them over time.

**Every day after that:** the person texts whenever they need to. Best You listens first, breaks big things into small optional steps, respects "stop" or "not now" right away, and follows up with things like "Let me know how it goes, I'd love to hear."

**Safety:** if someone mentions self-harm, harming others, abuse or danger, Best You sets everything else aside and points them to real help (emergency services, a local crisis line, or https://findahelpline.com).

**Privacy:** typing `delete my data` in the chat deletes everything stored about that person.

## Run it locally (no WhatsApp needed)

Requires Node.js 22 or newer.

```bash
cd best-you
```

```bash
npm install
```

```bash
cp .env.example .env
```

Put your Claude API key in `.env` (`ANTHROPIC_API_KEY=...`), then:

```bash
npm start
```

Open http://localhost:3000, enter any phone number, and copy the 6-digit code that is printed in the server console (this is "dev mode"). Then choose **Try it in the browser instead** to chat with Best You at `/chat.html`. It's the same conversation logic the WhatsApp version uses.

Run the tests:

```bash
npm test
```

## Connect to WhatsApp

You need a Meta developer account and a WhatsApp Business account. Meta's setup steps change from time to time, so follow the current guide: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

1. **Create a Meta app** with the WhatsApp product and get a phone number (Meta offers a test number to start).
2. **Fill in `.env`:**
   - `WHATSAPP_TOKEN`: an access token (use a permanent System User token for production).
   - `WHATSAPP_PHONE_NUMBER_ID`: the ID of the sending number (not the number itself).
   - `WHATSAPP_BUSINESS_NUMBER`: the number users will chat with, digits only, with country code. This builds the `wa.me` link.
   - `WHATSAPP_APP_SECRET`: from App settings → Basic. It's used to verify webhook signatures.
   - `WHATSAPP_VERIFY_TOKEN`: any secret string you make up.
   - `PUBLIC_URL`: the public address of your server (for local testing, a tunnel such as ngrok or Cloudflare Tunnel works).
3. **Register the webhook** in the Meta app: callback URL `https://<your-server>/webhook`, verify token = your `WHATSAPP_VERIFY_TOKEN`. Subscribe to the `messages` field.
4. **OTP over WhatsApp (optional):** create an *Authentication* message template with a copy-code button in WhatsApp Manager, wait for approval, and set `WHATSAPP_OTP_TEMPLATE` to its name. Until then, codes are printed to the console. The template request in `src/whatsapp.js` (`sendOtpTemplate`) follows Meta's documented format as I understand it; check it against your template if Meta rejects it.

People who text the number without signing up get a friendly message with the sign-up link.

## Files

| File | What it does |
|---|---|
| `src/prompts.js` | **Best You's voice and behaviour.** Edit this to change how it sounds. |
| `src/companion.js` | Calls Claude, keeps the conversation and the person's private notes. |
| `src/server.js` | Web server: sign-up API, test chat API, WhatsApp webhook. |
| `src/whatsapp.js` | Sending messages, OTP template, webhook signature check. |
| `src/otp.js` | One-time codes: 6 digits, expire after 10 minutes, at most 5 tries. |
| `src/store.js` | Simple JSON-file storage in `data/db.json`. |
| `public/` | Sign-up page and the browser test chat. |

## Known limits of this MVP (and what to do next)

- **Storage** is a single JSON file. Move to a real database before more than a handful of users, and encrypt conversations at rest; they're personal.
- **Text only.** Voice notes and images get a polite "text only for now" reply.
- **Only replies, never messages first.** As far as I know, WhatsApp only lets a business send free-form messages within 24 hours of the user's last message; anything later (like a morning check-in) needs a pre-approved template. Check Meta's current rules before adding check-ins.
- **One server process.** The per-person message queue and duplicate-message check live in memory.
- **No rate limiting** on the sign-up endpoints beyond a 30-second resend cooldown per number. Add per-IP limits before launch.
- **Not a therapist.** The prompt says so and points to real help in a crisis, but before launch have someone with mental-health expertise review `src/prompts.js` and test hard conversations. Also review privacy and data-protection rules (for example GDPR) for the countries you launch in.
