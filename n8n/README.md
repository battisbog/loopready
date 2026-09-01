# n8n: LoopReady UGC video pipeline

Generates short-form vertical (1080x1920) talking-head videos via HeyGen and
emails them to you for review. **It does not post anything** — that's
deliberate, matching the standing rule in the marketing playbook that the
agent proposes and produces, and Aryan decides and posts.

The avatar is LoopReady's own openly-branded presenter delivering scripts from
the content playbook. It is not, and must not become, a simulated "real user"
testimonial — fabricated endorsements are FTC-regulated deceptive advertising,
are a ban risk on TikTok/Meta, and contradict the Truth Ledger this product is
positioned on.

## Setup

1. **Get an n8n instance.** Cloud (n8n.cloud) is ~€20-24/mo with no setup;
   self-hosting is ~$6/mo on a small VPS but you maintain it. Start on Cloud's
   free trial — this same JSON imports either way, so migrating later is just
   a re-import.
2. **Import the workflow:** n8n → Workflows → Import from File →
   `loopready-ugc-pipeline.json`.
3. **Set `HEYGEN_API_KEY`** as an environment variable in n8n (Settings →
   Variables on Cloud, or the container env when self-hosted). The workflow
   reads it via `$env.HEYGEN_API_KEY` rather than hardcoding a key in the
   exported JSON, so this file stays safe to commit.
4. **Fill in the two placeholders** in the "Script + Avatar Config" node:
   `REPLACE_WITH_YOUR_AVATAR_ID` and `REPLACE_WITH_YOUR_VOICE_ID`. Get both by
   calling HeyGen's `GET /v2/avatars` and `GET /v2/voices` with your API key,
   or from the HeyGen dashboard.
5. **Configure the email node's SMTP credential** so the review email can
   actually send.

## What each node does

| Node | Role |
|---|---|
| Weekly Trigger | Fires Mondays 9am. Change or swap for a manual trigger while testing. |
| Script + Avatar Config | The script text, avatar id, voice id. Edit here per video. |
| HeyGen: Generate Video | `POST /v2/video/generate`, 1080x1920 vertical, dark background matching the brand. Returns a `video_id`. |
| Wait for Render | 90s pause — HeyGen renders asynchronously. |
| HeyGen: Check Status | `GET /v1/video_status.get`. |
| Render Complete? | If `completed`, email it; otherwise loop back to Wait and poll again. |
| Email for Review | Sends the script + finished video URL to review before posting. |

## Untested

The HeyGen calls are built to the documented API shape but have **not** been
run against a live key — there's no HeyGen account yet. Expect to adjust field
paths (`$json.data.video_id`, `$json.data.video_url`, `$json.data.status`) on
the first real run if HeyGen's response shape differs from the docs.

Cost reference (2026): Avatar V ~$0.05/sec ($3/min); Avatar IV ~$4/min at
1080p. A 30-second clip is roughly $1.50-$2.
