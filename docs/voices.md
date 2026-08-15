# Interviewer voice configuration

## Provider order

`lib/audio.ts` picks the first provider that is configured and working:

1. **ElevenLabs** if `ELEVENLABS_API_KEY` is set (best quality)
2. **OpenAI** if `OPENAI_API_KEY` is set
3. **Browser Web Speech** on the client, if neither responds (robotic; last resort)

The interview header badge shows which one actually served the audio, and each
server instance logs one line per provider, for example:

```
[tts] serving audio via openai (voice=ash model=gpt-4o-mini-tts)
```

Check it in Vercel with `vercel logs <deployment-url>`.

## ElevenLabs

| Variable | Default | Notes |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | unset | Enables ElevenLabs |
| `ELEVENLABS_VOICE_ID` | `onwK4e9ZLuTAKqWW03F9` (Daniel) | Any voice ID from your account |
| `ELEVENLABS_MODEL` | `eleven_turbo_v2_5` | Balance of quality and latency |

Settings sent with every request: `stability 0.45`, `similarity_boost 0.75`,
`style 0.1`, `use_speaker_boost true`. Lower stability sounds more expressive
but drifts; raise it toward 0.6 if the delivery feels inconsistent.

### Alternative voices to try

Daniel is a British news-presenter voice, which can read as formal or
announcer-like for a conversational interview. Two alternatives from the
ElevenLabs default library that suit an interviewer better:

| Voice | ID | Why |
| --- | --- | --- |
| **Brian** | `nPczCjzI2devNBz1zQrb` | Deep, warm American; sounds like a senior colleague rather than a broadcaster |
| **Chris** | `iP95p4xoKVk53GoZ742B` | Casual, natural American; the most conversational of the defaults |

Swap without a redeploy:

```bash
vercel env add ELEVENLABS_VOICE_ID production   # paste the ID
vercel deploy --prod
```

Confirm the ID in your ElevenLabs dashboard (Voices → the voice → ID), since
library IDs can differ per account.

## OpenAI (current fallback)

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | `tts-1-hd` is an alternative; it ignores instructions |
| `OPENAI_TTS_VOICE` | `ash` | Try `onyx` (deeper), `echo`, or `sage` |
| `OPENAI_TTS_INSTRUCTIONS` | calm senior engineer | Only honoured by `gpt-*` TTS models |

`gpt-4o-mini-tts` accepts a plain-English delivery instruction, which does more
for perceived quality than switching voices. The default asks for a measured,
warm, conversational read and explicitly steers away from a narrator tone.
