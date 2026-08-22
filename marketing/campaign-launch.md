# LoopReady — Launch Campaign

_Produced 2026-08-21 by the `loopready-marketing` agent._
_State: loopready.io live (200). All three rounds + video avatar shipped.
Zero social footprint. Faceless content. 10+ hrs/week._

Companion doc: `batch-01.md` (pillars, 10 concepts, 3 full scripts). This doc
covers everything that comes before and around those: accounts, launch
sequence, X, UGC/influencer, communities.

---

## 0. One honest thing about "viral"

Virality is an outcome, not a plan. Nobody — no agency, no growth hire — can
schedule a hit. What can be engineered is **shots on goal plus a fast feedback
loop**: post enough grounded, hook-first content that something catches, then
recognise it within 48 hours and squeeze it dry.

So this campaign optimises for two things: volume of *distinct hook families*
tested, and speed of iteration once one works. Expect 15–20 posts before
anything breaks out. That is normal and is not a sign it's failing.

The thing genuinely in your favour: LoopReady's own output is the content.
You are not making ads about a product, you are publishing the product's most
uncomfortable moments. That is inherently more shareable than anything a
competitor with a bigger budget can buy.

---

## 1. Fix these before a single post goes out

### 1a. The copy bug — critical, blocks the whole video angle

The video avatar is live in production. Three user-facing strings still say it
isn't:

| File | Line | Current text |
|---|---|---|
| `app/(marketing)/pricing.tsx` | 59 | "Video avatar is still in development. You'll be first in line." |
| `app/dashboard/page.tsx` | 30 | "Everything in Voice, plus video-avatar interviews when they ship." |
| `app/pricing/page.tsx` | 11 | "…video-avatar rounds when they ship." (meta description) |

The avatar is your single best new asset — it's the most visually arresting
thing you have and the only thing in the category that looks like an actual
interview. **Every video-led post would drive traffic to a pricing page that
tells the visitor the feature doesn't exist yet.** That's a conversion hole and
a credibility hole at the same time.

Fix first. It's a four-string change.

### 1b. OG previews

`metadataBase` was hardcoded to `loopready-five.vercel.app`. When your link gets
pasted into Reddit, Discord, X, or a group chat — which is the entire point of a
share-driven campaign — the preview card is generated from that. Verify the
preview renders the loopready.io identity, with a real OG image, before you push
links at volume. A broken or off-brand preview card silently halves click-through
on every share.

Test: paste `https://loopready.io` into a private Discord channel and look at
the card that renders.

### 1c. One end-to-end signup as a stranger

Incognito, real email, free tier, run one behavioral interview to completion.
You're checking the path a cold visitor takes, not the path you know. Note the
first moment you'd bounce if you weren't the founder. Fix that moment.

---

## 2. Accounts — exact setup

You do this part yourself; account creation needs your identity and phone. Here
is every field, filled in.

### Handle

Use **`@loopready`** everywhere. If it's taken on any one platform, fall back to
**`@getloopready`** on **all** of them — a mismatched handle set costs you more
than a slightly worse name, because your end cards can only say one thing.

Check all five before committing: TikTok, YouTube, Instagram, X, Reddit.

### Display name

`LoopReady` on TikTok/IG/X. On YouTube use **`LoopReady — Mock Interviews`**;
YouTube channel names are searched, so the descriptor earns its keep there and
nowhere else.

### Bios

**TikTok** (80 char limit — be ruthless)
```
The mock interview that tells you the truth.
FAANG loops, honest verdicts. ↓
```

**Instagram**
```
The mock interview that tells you the truth.
Behavioral · Coding · System design — with a real verdict at the end.
Tuned to your company and level.
loopready.io
```

**X**
```
The mock interview that tells you the truth. Full FAANG loops —
behavioral, coding, system design — with an interviewer that actually
pushes back. Honest verdicts, not encouragement. loopready.io
```

**YouTube — About**
```
LoopReady runs realistic, full-loop mock interviews for people targeting
FAANG and top-tech software engineering roles.

Behavioral, coding with real code execution, and system design on an
interactive canvas — with an AI interviewer that listens, reacts, and probes
with real follow-ups instead of reading a question list. Configure it to the
company and level you're actually interviewing for, then get honest feedback
calibrated to what really passes that bar.

Free tier available. loopready.io
```

**Reddit** — a *personal* account, not a brand account. Your own username. Brand
accounts get filtered on sight in these subs. More in §7.

**LinkedIn** — post from your personal profile, not a company page. A company
page with 0 followers reaches nobody; your personal profile reaches your
network. Create the company page anyway for legitimacy, but don't post from it.

### Link strategy

Bio link goes to **`loopready.io`**, not to a link-in-bio aggregator. One less
click, and aggregators read as "influencer" rather than "product" to this
audience.

### Assets you need to make (2 hours, once)

1. **Profile picture** — the app mark on dark, high contrast, legible at 40px.
   Check it at 40px before committing; most logos turn to mush.
2. **YouTube banner** — 2560×1440, safe area 1546×423. Text: the one-liner.
3. **An end card** — 3 seconds, same every video: handle, `loopready.io`, the
   one-liner. Reused across every post forever, so make it once and make it good.
4. **A subtitle style pair** — one look for the AI interviewer's speech, one
   visibly different for the candidate's. This is load-bearing for every
   conversation clip; decide it once and never change it.
5. **An OG image** — 1200×630 for the link previews in §1b.

---

## 3. Launch sequence — first 14 days

The shape: **build a backlog before you post anything.** Posting one video and
waiting is how solo founders lose momentum. You want 8 posts in the bank on day
4 so that the daily cadence never depends on how your week went.

### Days 1–2 — Fix + set up
- §1a copy fix, §1b OG check, §1c stranger signup
- All five accounts claimed, bios in, profile pics up
- The five assets above

### Day 3 — Shoot session 1 (~2.5 hrs)
Six runs, each staged to trigger one beat. Clean browser profile, page zoom
~125%, dark mode, **system audio and mic on separate tracks.**

| Run | Setup | Beat you're hunting |
|---|---|---|
| 1 | Behavioral, Amazon SDE III. Answer everything with "we decided…" | The ownership probe re-asking. → Script A, concept #2 |
| 2 | Coding, any company. Start typing instantly, state no assumptions | Feedback dinging the silence. → **Script C** |
| 3 | Coding. Claim O(n) on something that isn't | The complexity catch. → concept #5 |
| 4 | Behavioral, Google L3. Paste the **exact same answer as run 1** | The two-bar divergence. → **Script B** |
| 5 | **Video avatar**, any company, behavioral | The face. Pure b-roll — the reveal moment is the asset |
| 6 | System design, Google L5 | Canvas + a pressure point. → concepts #6, #8 |

Run 4 is conditional: if Google L3 and Amazon SDE III return the same verdict,
Script B does not exist and you don't make it. **Do not stage a difference.**

Keep every raw file. One good feedback reveal seeds six posts.

### Days 4–6 — Edit the backlog (~6 hrs)
Cut 8 posts: Scripts A, C, and B from `batch-01.md`, plus concepts #5, #8, #9,
and the two video-avatar concepts in §5 below. Do not post yet.

### Day 7 — Launch day
Post in this order, all on the same day:
1. **Short-form** (TikTok + Shorts + Reels): the video-avatar reveal (§5, V1).
   It's your most visually distinct asset and nothing else in the category
   looks like it.
2. **X**: the launch thread (§4).
3. **LinkedIn**: the build-in-public post (§4).
4. **Nothing on Reddit.** Not on day 7. See §7 — you have not earned it yet.

### Days 8–20 — Cadence
- 1 short-form post/day, all three platforms, same cut, watermarks stripped
- 1 X post/day (mix from §4)
- 2 LinkedIn posts/week
- **30 min/day replying to every comment under 48h old** — this measurably
  drives distribution and is the single highest-ROI 30 minutes in the plan
- 30 min/day in communities, zero promotion (§7)
- Shoot session 2 on day 10, session 3 on day 17

---

## 4. X — a different game

X is not short-form with text. It rewards *screenshots of interesting output*
and strong claims that invite argument. Your product produces both natively.

The core X asset: **a screenshot of brutal feedback.** It's instantly legible,
requires no video, and is the most-quotable thing you have.

### The launch thread (day 7)

> **1/** I built an AI that runs full FAANG interview loops — behavioral, coding,
> system design — and then tells you honestly whether you'd have passed.
>
> I ran myself through it. It said no-hire. It was right.
>
> **2/** Most mock interview tools are a question list with a timer. The
> problem was never the questions. You can find the questions.
>
> The problem is nobody tells you what actually reads as no-hire.
>
> **3/** So it probes. If you answer a behavioral question with "we decided,"
> it asks again. And again. It won't let you hide in the plural.
> [screenshot: the three escalating probes]
>
> **4/** The coding round runs your code against real tests. If you claim O(n)
> and it isn't, it asks you to walk the inner loop.
> [screenshot: the complexity catch]
>
> **5/** System design is a canvas you actually draw on. It reads the diagram
> and asks about the components you drew. Not a script.
> [screenshot: the canvas + a pointed question]
>
> **6/** The part I care about most: the bar moves. The same answer is a hire
> at one company and level, and a no-hire at another. That's real and nobody
> prepares for it.
> [screenshot: the split verdict]
>
> **7/** Free tier runs a real behavioral loop, no card.
> loopready.io
>
> Built solo. Tell me where it's wrong — I'd rather hear it now.

That last line matters. Inviting criticism on X converts skeptics into repliers,
and replies are distribution.

### Twelve standalone posts

Rotate these. Screenshot-led ones perform best; keep the image real.

1. > It told me my answer was "a description of what the team did, not what you
   > did." I've given that answer in real interviews. Nobody ever told me.
   > [screenshot]

2. > Same answer. Word for word.
   > Google L3: hire. Amazon SDE III: no-hire.
   > The bar isn't a vibe. [screenshot: split verdict]

3. > Unpopular: you are not failing the coding round on the algorithm. You're
   > failing the 90 seconds before you write anything — no restatement, no
   > assumptions, no stated approach. The silence is the ding.

4. > Built a thing that catches you claiming the wrong time complexity by asking
   > you to walk your own inner loop. Watching it do that to me was humbling.
   > [screenshot]

5. > "Tell me about a conflict" answers fail for one reason 90% of the time:
   > there's no conflict in them. You describe a mild disagreement that resolved
   > itself. The interviewer wanted to see you hold a position.

6. > The system design round reads the diagram you drew and asks about your
   > components by name. Took a while to build. Worth it — it's the only way the
   > round feels real. [screenshot: canvas]

7. > Free mock interview, no card, real verdict at the end: loopready.io
   > Warning: it is not nice to you. That's the product.

8. > The most useful thing an interviewer can tell you is the thing they're not
   > allowed to tell you. That's the entire reason this exists.

9. > Shipped the video interviewer today. Same conversation engine, but there's
   > a face, and it changes the pressure completely. Turns out most of what makes
   > interviews hard is being looked at. [clip]

10. > Every rejection email says "we've decided to move forward with other
    > candidates." Zero signal. You learn nothing. You do it again next week and
    > fail the same way.

11. > Things that read as no-hire and nobody tells you:
    > — "we decided" instead of "I decided"
    > — starting to code before stating assumptions
    > — a complexity claim you didn't verify
    > — a conflict story with no conflict

12. > If you're prepping right now: what round do you actually dread? Genuinely
    > asking — I'm deciding what to build next.
    > (Mine was system design, by a mile.)

Post 12 is the most valuable of the set. Replies are free research and every
answer is a content idea.

---

## 5. Video-avatar content — the new asset

Video just shipped, which changes your content mix. Nothing else in this
category has a face. Two concepts to shoot on day 3 (run 5), both faceless on
*your* side — the avatar is the on-screen presence, not you.

### V1 — "It has a face now."
**Cost:** LOW · **Length:** 20s · **This is your launch post.**

**HOOK (0:00–0:02)** — Cold open on the avatar mid-sentence, full frame, making
eye contact. *Audio:* "*So walk me through a time you disagreed with your
manager.*"
**On-screen:** nothing for the first 2 seconds. Let the viewer work out that
it's an interview.

**Arc:** 0–2 the face, talking · 2–5 text lands: `this is an AI interviewer` ·
5–12 it asks a follow-up that clearly responds to the answer (proof it isn't a
recording) · 12–17 the verdict · 17–20 end card.

**CTA:** "It's live now."
**Note:** the entire hook is that the viewer briefly can't tell. Do not put a
title card in front of it. Do not explain before showing.

### V2 — "Voice vs. Face"
**Cost:** MED · **Length:** 30s

**HOOK** — Split screen: left, the voice ring; right, the avatar. Same question
playing on both. **On-screen:** `same interviewer. one has a face.` /
`only one of these made me sweat.`

**Arc:** 0–3 split · 3–12 same question both sides · 12–22 the difference in
how it feels — text-led, honest, not a feature list · 22–27 the point: real
interviews are watched, and practising unwatched trains the wrong thing ·
27–30 end card.

**CTA:** "Which one would you practise with?"
**Why it works:** it's an honest observation about interview anxiety, not a
tier upsell — and it sells the $69 tier harder than an upsell would.

---

## 6. UGC / influencer program

### The honest read on budget

You have no stated ad budget, and that's fine — but "UGC influencer marketing"
at zero cash means **product-for-content**, which caps you at micro-tier
creators. That's actually the right tier for this audience anyway: a 12k-follower
new-grad who just went through Amazon loops converts far better here than a
300k-follower general tech creator. The audience trusts peers, not personalities.

Three ways to run it, pick one:

| Model | Cost | Best for | Tradeoff |
|---|---|---|---|
| **Free Premium, no obligation** | $0 | Seeding, 20–30 creators | Most never post. Expect ~15% conversion to content. But the ones who do post are genuinely enthusiastic, which shows |
| **Free Premium + agreed deliverable** | $0 | 5–10 creators | Feels transactional; smaller creators accept, larger ones won't |
| **Paid flat fee per video** | $150–600/video micro-tier | Once you know which hook converts | Only worth it after organic has told you what works. Paying to amplify an unvalidated hook is burning money |

**My recommendation: start with model 1 at volume.** You have a shared demo
account with a hard lifetime video cap already built — that is exactly the right
access mechanism, and it means seeding costs you almost nothing.

### Who to target

I'm not going to invent creator handles — I don't have verified current data on
who's active, and a fabricated outreach list wastes your week. Here's how to
build a real one in an hour:

**Search these on TikTok and YouTube:**
`FAANG interview` · `SWE interview prep` · `leetcode grind` · `system design
interview` · `new grad SWE` · `day in the life software engineer` ·
`amazon loop interview` · `tech interview tips`

**Filter to:** 5k–80k followers · posted in the last 14 days · comments have
real questions in them (not just emoji) · they talk about interviewing
specifically, not general tech-lifestyle content.

**Build a sheet:** handle, platform, follower count, best-performing recent
post, what angle they'd naturally take, contact method.

**Highest-value target types, ranked:**
1. **Recently-failed-a-loop creators.** Someone who posted "I bombed my Meta
   onsite" is your single best fit — LoopReady is literally the answer to the
   thing they publicly wanted.
2. **New grads documenting their prep.** Serial content, high engagement, they
   need material weekly and you're material.
3. **Ex-FAANG engineers doing teardown content.** They can credibly critique
   whether the verdict is calibrated — and if they say it is, that's the
   strongest endorsement available in this category.
4. **Career coaches** — high conversion, but risk: some will want affiliate
   terms. Decide in advance whether you'll offer them.

### Outreach DM (short — long DMs don't get read)

> Hey [name] — the [specific post] one was good, the bit about [specific detail]
> is exactly the thing nobody says out loud.
>
> I built LoopReady: full FAANG mock loops (behavioral, coding, system design)
> with an interviewer that actually pushes back, and an honest verdict at the
> end. There's a video-avatar version too.
>
> Want free Premium, no strings? Genuinely just want people who know what a real
> loop feels like to tell me whether the bar is calibrated right. If you post
> about it, great; if you tell me it sucks, that's more useful.
>
> — Aryan

Why this works: it leads with a specific detail from their content (proves you
watched), it asks for a *judgment* rather than a favour, and it explicitly
releases them from posting. Creators say yes to this at several times the rate
of a standard sponsorship pitch.

**Never:** send it to 50 people with the specific detail left as a blank. One
creator screenshotting a mail-merge failure is worse than 50 non-replies.

### The creator brief (send only after they say yes)

> **The one rule: be honest.** If the verdict is wrong, say it's wrong on camera.
> That's better content than praise and I'd rather have it.
>
> **The angle that works best:** record your real reaction to the feedback. The
> moment where it tells you something uncomfortable is the whole thing.
>
> **What to show:** pick your target company and level at the start — people
> don't know that's possible. Then the interview. Then the verdict.
>
> **Please don't:** claim it guarantees offers, invent a result, or say you got
> a job from it. Nothing about this needs overselling.
>
> **Disclose it.** #ad or "free access from LoopReady" — required by FTC rules
> and this audience punishes undisclosed promo harder than the FTC does.
>
> Free access: [demo account or comped Premium]

That disclosure line is not optional. An engineer audience will find an
undisclosed sponsorship and it will become the story.

---

## 7. Communities — the slow, high-value channel

Blanket rule: **show up as an engineer who built something, not as a brand.**
These communities find and punish astroturfing, and one bad thread follows a
product around for years.

### r/leetcode, r/cscareerquestions
- **Read each sub's self-promotion rules first.** They differ, they change, and
  several ban tool promotion outside designated threads. Check before posting,
  not after.
- **Earn it.** Two to three weeks of genuine participation, answering questions
  with real substance and no link, before you post anything about LoopReady.
- **Post the insight, not the product.** "I ran 40 mock behavioral interviews
  through a consistent rubric — here are the 5 things that consistently read as
  no-hire" is a post people upvote. "Check out my app" is a ban.
- **Disclose you built it, in the post itself**, every time. Never in a reply
  after someone asks.
- Never sockpuppet, never ask friends to upvote, never seed fake questions.
- **Free access with no strings converts better than any pitch** — and gets you
  real users, which is your actual bottleneck.

### Blind
Extremely low tolerance for marketing. Its value to you is **listening** — it's
the best free source of what candidates fear this quarter, which feeds content.
Research, not distribution.

### Discord / Slack communities
Underrated. Interview-prep and new-grad Discords have high-intent members and
much looser promo norms than Reddit — but the same rule applies: participate
first. Being genuinely helpful in one 3k-member Discord beats a Reddit post that
gets removed.

### Hacker News
"Show HN: I built an AI that runs full FAANG interview loops and tells you if
you'd pass." Post once, Tuesday–Thursday morning US Eastern. HN rewards
technical honesty and *punishes* marketing language — write it like an
engineering post, mention what doesn't work yet, and answer every comment.
The traffic spike is short but the credibility and backlink are durable.

### Product Hunt
Worth one shot, but not yet. PH audiences aren't your buyers, and a launch with
no existing following underperforms. Do it in month 2 once you have social
proof to point at. If you do launch: Tuesday, 12:01am PT.

---

## 8. What to measure and report back

Ignore views. Read the funnel and name the stage that broke:

| Stage | Metric | Early threshold | Failure means |
|---|---|---|---|
| Hook | 3s retention | >65% | First frame/line didn't earn attention |
| Hold | watch-through | >45% | Body didn't pay off the hook |
| Value | **saves** | >2% of views | Entertaining, not useful |
| Identity | **shares** | >1% of views | Didn't say what they wanted said for them |
| Intent | profile clicks | >1% of views | Content worked; CTA or profile didn't |

Plus, weekly: **signups**, and **free → paid conversion**. Content metrics that
don't move signups are a vanity loop with extra steps.

**Report per post:** views · 3s retention (or avg watch time) · watch-through ·
saves · shares · comments · follows · profile clicks · **which hook variant**.

That last field matters most. Every script in `batch-01.md` has two alternate
hooks, and they all test one question: **does opening on real product output
beat opening on a written line?** Answer that and half the guesswork in batch 02
disappears.

The pattern I'll be hunting for: **high views, low saves** = winning hook on a
weak body. Reuse the hook verbatim, replace everything after second 3. Cheapest
win available in short-form.

---

## 9. Realistic expectations

- Weeks 1–2: near-zero reach. Cold accounts get throttled. Post anyway.
- Weeks 3–4: one or two posts get 10–50× your baseline. That's the signal.
- Month 2: you should know your winning hook family. Everything gets easier.
- **First paying customers will most likely come from Reddit, Discord, or HN
  before they come from TikTok.** Short-form builds the top of the funnel;
  communities close. Don't judge the campaign on short-form conversion in month 1.

The failure mode that actually kills solo-founder channels isn't bad content —
it's stopping at week 3 because week 2 was quiet.

---

## 10. Open items

1. **Fix the three copy strings** (§1a) — blocks all video-led content.
2. **Verify OG previews** render loopready.io (§1b).
3. **Claim all five handles** and tell me which name you got.
4. **Decide the UGC model** (§6) — I recommend free-Premium-no-obligation at volume.
5. **Voice decision** still open from batch-01: candidate-as-text (Option A) vs
   your real voice (Option B). Video shipping strengthens the case for A — the
   avatar now carries the on-screen presence, so you don't need to.
