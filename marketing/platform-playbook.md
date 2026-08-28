# LoopReady — Per-Platform Content Playbook

_2026-08-22. Handles claimed. One 15s product demo in hand._

---

## 0. What to do with the 15-second demo

**Do not make it your launch TikTok.** Demo videos underperform badly as
organic short-form — nobody scrolling wants to watch an ad, and the algorithm
reads the drop-off. It's a good asset in the wrong slot.

Where it actually earns:

| Placement | Why |
|---|---|
| **Pinned post** on TikTok + IG | People who land on your profile from a viral clip DO want to know what this is. Pinned is the one place demo content converts. |
| **X post**, standalone | X is the one feed where "here's the thing I built" is native |
| **LinkedIn**, with a text post around it | Working-engineer segment; video is fine here as an attachment to a story |
| **Website hero** | Obvious, and it's already made |
| **Reply asset** | When someone comments "what is this?" — drop the demo. Replies with video get their own reach |
| **Final slide of a slideshow** (as a still + caption pointing to profile) | See §2 |

Rule of thumb: the demo is what people watch *after* they're interested. It is
not what makes them interested.

---

## 1. What goes on each platform

Different feeds reward different things. Same raw footage, different cut.

### TikTok — volume + hooks. Your primary test bed.
Two content types, roughly 50/50:
- **Video clips** of real product moments (the verdict reveal, the probe, the
  complexity catch). Hook-first, 20–45s, subtitles burned in.
- **Photo slideshows** — see §2. Cheapest content you can make, highest save
  rate, and TikTok actively pushes photo posts.

Post 1–2×/day. TikTok is where you find out which hook family works, because
it gives cold accounts the fastest read.

### Instagram Reels — same cuts, plus carousels
Repost the TikTok video cuts (watermark stripped). IG weights **saves and
shares** heavily, which favours your advice content.
Carousels work here too — same slides as TikTok, reformatted 4:5.
Don't build anything IG-specific until it shows you something.

### YouTube Shorts — the compounding one
No photo posts; video only. But this is where your content has a **months-long
tail**, because this audience searches YouTube for interview prep. A Short about
the behavioral round keeps getting found.

What changes for Shorts:
- **Titles matter.** Write them as search queries: "Why your STAR answer fails"
  not "this is brutal 💀"
- Slightly more tolerant of 45–60s explanation
- Advice-led and "how it works" content outperforms pure entertainment here

### X — screenshots and claims
The native unit is **a screenshot of brutal feedback plus one line**. No video
needed. Threads for the bigger stories. Strong claims that invite argument.
1×/day, low effort. See `campaign-launch.md` §4 for 12 written posts.

### LinkedIn — text-first, 2×/week
Same insights, no memes, no hooks. The working-engineer segment lives here and
converts better than any other platform. Native text posts with one screenshot
beat video. Post from your personal profile, not a company page.
Carousel PDFs also perform well — the §2 slideshows reformat directly.

### Reddit — not yet
Participate only, no links, no product mentions. You're banking credibility to
spend in month 2. Rules in `campaign-launch.md` §7.

---

## 2. The slideshow method — and a better version of it

### What you heard, and why it works
Post 6–10 image slides. Slides 1..n-1 are genuine advice. Last slide is the
product. It works because TikTok's photo feed has less competition than video,
people self-pace through slides (which reads as high watch time), and advice
content gets **saved**, which is the strongest signal you can generate.

### The failure mode
The abrupt last-slide pivot reads as bait-and-switch. If slides 2–8 are generic
filler and slide 9 is a pitch, viewers feel tricked, and it shows up as low
completion and hostile comments. Engineers are especially unforgiving about this.

### The better version for LoopReady
Don't tack the product onto the end. **Weave it in as evidence, mid-slideshow.**

Your product produces screenshots of real, specific interview feedback. That's
not an ad — it's the proof for the claim you're making. So:

> slides 1–3: the claim and the advice
> **slide 4 or 5: a screenshot of real LoopReady feedback demonstrating exactly
> that point** — captioned as evidence, not as a pitch
> slides 6–8: the rest of the advice
> final slide: soft mention

The product shows up as the receipt for advice you already gave for free. That
converts better *and* it's honest, because the screenshot genuinely is the
evidence for the claim.

### Production spec
- **9:16, 1080×1920.** Dark background, high-contrast text, one idea per slide
- **7–9 slides.** Fewer than 6 feels thin; more than 10 loses people
- **Slide 1 is the whole game** — it's the only slide most people see. Big text,
  a claim or a wound, readable in half a second
- **Real screenshots, never mockups.** Crop tight, punch in on the exact line
- Quiet trending audio; no voiceover needed
- **Caption carries the CTA**, not the slides
- 15 min/slideshow once you have a template. This is your volume play

---

## 3. Five slideshows, written out

Replace every `[REAL]` with an actual screenshot from a real run. Do not
paraphrase the app's output to make it sharper — if the real line is weaker,
change the slideshow, not the quote.

---

### SLIDESHOW 1 — "Sentences that read as no-hire"
*Pillar: The Invisible Ding. Highest save potential in the set.*

**1.** `4 sentences that read as "no hire"` / `you've said at least one`
**2.** `1. "We decided to go with..."` — The interviewer asked what YOU did. The plural is where ownership goes to die.
**3.** `[REAL]` screenshot: feedback catching exactly this
**4.** `2. "It's basically O(n)."` — "Basically" means you didn't check. They will make you check.
**5.** `3. "I'd probably just use a queue here."` — Probably. Just. Two words that say you haven't thought about it.
**6.** `[REAL]` screenshot: feedback on an unverified claim
**7.** `4. "We had a small disagreement, but it worked out."` — That's not a conflict story. That's a story about avoiding conflict.
**8.** `None of these are about being smart.` / `They're about sounding like someone who owns decisions.`
**9.** `I built an AI interviewer that catches all four.` / `loopready.io — free tier, real verdict`

**Caption:** These four killed more loops than any algorithm question. Save this before your onsite.

---

### SLIDESHOW 2 — "The 90 seconds before you code"
*Pillar: The Invisible Ding.*

**1.** `You're not failing the coding round.` / `You're failing the 90 seconds before it.`
**2.** What most people do: read the problem → start typing. The interviewer now has no idea what you're thinking.
**3.** `1. Restate the problem in your own words.` — Ten seconds. Catches misreads before they cost you twenty minutes.
**4.** `2. State your assumptions out loud.` — Empty input. Duplicates. Negative numbers. Say them or you didn't consider them.
**5.** `[REAL]` screenshot: feedback dinging exactly this omission
**6.** `3. Say your approach before you write a line.` — This is where they help you if you're wrong. Silence means they can't.
**7.** `The interviewer cannot read your mind.` / `If you didn't say it, you didn't do it.`
**8.** `loopready.io` — free mock, honest verdict

**Caption:** The coding round is usually lost before any code is written.

---

### SLIDESHOW 3 — "Your STAR answer is perfect and still failing"
*Pillar: The Invisible Ding.*

**1.** `Textbook STAR.` / `Still a no-hire.`
**2.** Screenshot of a well-structured answer, labelled S / T / A / R
**3.** `The structure was never the problem.` — Everyone learned STAR. It's table stakes now, not a differentiator.
**4.** `There's no conflict in your conflict story.` — A disagreement that resolved itself isn't a conflict. They want to see you hold a position.
**5.** `[REAL]` screenshot: feedback naming the missing tension
**6.** `There's no decision that was yours.` — "The team aligned" tells them nothing about you.
**7.** `There's no cost.` — Every real decision cost something. If yours didn't, they don't believe it happened.
**8.** `Structure gets you to the bar.` / `Ownership gets you over it.`
**9.** `loopready.io`

**Caption:** Structure isn't the bar. I learned this the hard way.

---

### SLIDESHOW 4 — "Same answer. Different verdict."
*Pillar: The Bar. Most argument-provoking — expect a comment fight, don't join it.*

**1.** `Same answer. Word for word.` / `HIRE at one company. NO HIRE at another.`
**2.** `[REAL]` split screenshot: the two verdicts
**3.** The answer itself, unchanged, centered
**4.** `[REAL]` what the first bar forgave
**5.** `[REAL]` what the second bar didn't
**6.** `One wanted the story.` / `The other wanted the number.`
**7.** `"Am I good enough" is the wrong question.` / `"Good enough for which bar" is the real one.`
**8.** `Pick your company. Pick your level.` / `loopready.io`

**Caption:** The bar isn't a vibe. It's specific, and it's different everywhere you interview. Which one are you actually preparing for?

---

### SLIDESHOW 5 — "What senior actually means"
*Pillar: The Bar.*

**1.** `You're not getting downlevelled for what you don't know.`
**2.** `Mid: solves the problem.` / `Senior: questions whether it's the right problem.`
**3.** `Mid: gives you the answer.` / `Senior: gives you the tradeoff and then picks one.`
**4.** `[REAL]` screenshot: level-specific feedback
**5.** `Mid: describes what the team did.` / `Senior: describes what they decided and what it cost.`
**6.** `Mid: waits to be asked.` / `Senior: says the risk before you find it.`
**7.** `Same question. Different bar.` / `Nobody tells you which one you're being measured against.`
**8.** `loopready.io — set your level, get the bar`

**Caption:** Downlevelling is almost never about knowledge.

---

## 4. Weekly mix (10+ hrs/week)

| Platform | Cadence | Content |
|---|---|---|
| TikTok | 1–2/day | Alternate video clips and slideshows |
| Reels | 1/day | Same cuts + carousels |
| Shorts | 1/day | Video only, search-shaped titles |
| X | 1/day | Screenshot + line; thread weekly |
| LinkedIn | 2/week | Text-first, or carousel PDF from §3 |
| Reddit | daily | Participate only. No links. |

**Slideshows are your volume lever.** Once the template exists, one is 15
minutes. If a week goes sideways on product work, ship slideshows and skip
the shoot.

---

## 5. What to report back

Per post: views · 3s retention (or avg watch time) · completion · **saves** ·
shares · comments · follows · profile clicks · which hook variant.

For slideshows specifically, **completion rate and saves** are the two that
matter. Saves above ~3% on a slideshow means the advice was genuinely good and
you should clone that structure immediately.
