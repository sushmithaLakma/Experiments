# Put Friends Street online (free)

About 10 minutes, no credit card. You make two free accounts: **Upstash**, which stores the street, and **Render**, which runs it.

Free plans change, so check each site's pricing page if something here doesn't match.

## 1. Upstash: where the street is saved

1. Go to upstash.com and sign up (GitHub or Google sign-in works).
2. Create a **Redis** database. Any name, any region close to you, free plan.
3. Open the database and find the **REST API** section. Copy two values:
   - `UPSTASH_REDIS_REST_URL` (looks like `https://something.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` (a long string; keep it secret)

## 2. Render: where the app runs

1. Go to render.com and sign up **with GitHub**.
2. Click **New** → **Blueprint**.
3. Pick the **Experiments** repository and the branch that has `render.yaml` (`claude/peaceful-hopper-706b8v` until it's merged into your main branch).
4. Render reads `render.yaml` and asks for the two values from Upstash. Paste them in.
5. Click deploy. After a few minutes you get a link like `https://friends-street-xxxx.onrender.com`.

Open it, start a street, and send the invite link to your friends.

## Good to know

- **Sleeping:** on the free plan the app goes to sleep after about 15 minutes with no visitors. The next person to open it waits about a minute while it wakes up. Their street is still there.
- **Updates:** when new code is pushed to the branch Render uses, Render redeploys on its own.
- **Old video wall:** `/wall` keeps uploaded videos on Render's disk, which the free plan wipes. Friends Street doesn't use videos, so it isn't affected.
