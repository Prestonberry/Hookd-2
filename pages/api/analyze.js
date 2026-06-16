import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getAuth } from '@clerk/nextjs/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(375, '1 d'),
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

const VALID_MODES = ['analyze', 'conversion', 'rehook'];
const VALID_CONTENT_TYPES = ['talking', 'footage', 'skit', 'product', 'aesthetic'];
const VALID_FUNNEL_STAGES = ['top', 'middle', 'bottom'];
const VALID_HOOK_TYPES = ['talking', 'typed'];
const VALID_PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];

function isValidBase64(str) {
  if (typeof str !== 'string') return false;
  if (str.length > 500000) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(str);
}

function sanitizeString(str, maxLength = 5000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/<[^>]*>/g, '');
}

export default async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS - only allow your own domain
  const allowedOrigins = ['https://hookd.ink', 'https://www.hookd.ink', 'https://hookd-2.vercel.app'];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Must be signed in
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Rate limiting
  const identifier = userId;
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    return res.status(429).json({ error: 'Daily limit reached. Upgrade for more analyses.' });
  }

  const {
    mode, contentType, funnelStage, hookType, platform,
    frames, script, hookContext,
    videoWidth, videoHeight, videoDuration, hasAudio,
    transcript, wpm, fillerCount, dominantSentiment
  } = req.body;

  // Input validation
  const analysisMode = mode || 'analyze';
  if (!VALID_MODES.includes(analysisMode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  if (analysisMode === 'analyze' && contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  if (analysisMode === 'conversion' && funnelStage && !VALID_FUNNEL_STAGES.includes(funnelStage)) {
    return res.status(400).json({ error: 'Invalid funnel stage' });
  }

  if (analysisMode === 'rehook' && hookType && !VALID_HOOK_TYPES.includes(hookType)) {
    return res.status(400).json({ error: 'Invalid hook type' });
  }

  if (platform && !VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  if (frames) {
    if (!Array.isArray(frames)) return res.status(400).json({ error: 'Invalid frames' });
    if (frames.length > 20) return res.status(400).json({ error: 'Too many frames' });
    for (const frame of frames) {
      if (!isValidBase64(frame)) return res.status(400).json({ error: 'Invalid frame data' });
    }
  }

  if (script && typeof script !== 'string') return res.status(400).json({ error: 'Invalid script' });
  if (script && script.length > 2000) return res.status(400).json({ error: 'Script too long' });

  if (videoWidth && (typeof videoWidth !== 'number' || videoWidth > 10000)) return res.status(400).json({ error: 'Invalid video dimensions' });
  if (videoHeight && (typeof videoHeight !== 'number' || videoHeight > 10000)) return res.status(400).json({ error: 'Invalid video dimensions' });
  if (videoDuration && (typeof videoDuration !== 'number' || videoDuration > 3600)) return res.status(400).json({ error: 'Invalid video duration' });

  // Sanitize text inputs
  const safeScript = sanitizeString(script, 2000);
  const safeHookContext = sanitizeString(hookContext, 1000);
  const safeTranscript = sanitizeString(transcript, 5000);

  try {
    const contentTypeInstructions = {
      'talking': `CONTENT TYPE: TALKING TO CAMERA — Focus on: eye contact with camera lens, energy and delivery, facial expressions, hook in first 3 seconds, caption strategy for muted viewing, face lighting, audio clarity, speaking pace, body language.`,
      'footage': `CONTENT TYPE: FOOTAGE / VLOG — Focus on: visual storytelling, hook creating curiosity, pacing and cuts, lighting, color palette, music matching vibe, text guiding narrative, thumbnail potential.`,
      'skit': `CONTENT TYPE: SKIT / COMEDY / TRENDS — Focus on: hook energy in first 0.5 seconds, timing of punchline or reveal, energy level, facial expressions, pattern interrupts, sound design, trend execution clarity, rewatchability.`,
      'product': `CONTENT TYPE: PRODUCT / BRAND — Focus on: value proposition clarity in 3 seconds, product visibility, trust signals, hook opening with problem or benefit, call to action, text highlighting key benefits.`,
      'aesthetic': `CONTENT TYPE: AESTHETIC / VIBE / MUSIC — Focus on: visual cohesion, color grading, music sync with cuts, mood clarity, visual contrast, uniqueness in feed, pacing relative to music.`
    };

    const contentInstruction = contentTypeInstructions[contentType] || 'CONTENT TYPE: General short-form content.';

    let orientationContext = '';
    if (videoWidth && videoHeight) {
      const isVert = videoHeight > videoWidth;
      orientationContext = `VIDEO DIMENSIONS: ${isVert ? 'VERTICAL' : 'HORIZONTAL'} (${videoWidth}x${videoHeight}). ${isVert ? 'Correct format.' : `HORIZONTAL — ${platform || 'TikTok'} is vertical-first, serious problem.`}`;
    }

    let audioContext = '';
    if (!hasAudio) {
      audioContext = 'AUDIO: No audio detected.';
    } else if (safeTranscript) {
      audioContext = `AUDIO TRANSCRIPTION:
- Full transcript: "${safeTranscript}"
- Speaking pace: ${wpm} WPM (optimal is 130-160 WPM)
- Filler words detected: ${fillerCount}
- Dominant sentiment: ${dominantSentiment}`;
    } else {
      audioContext = 'AUDIO: Audio present. No transcription available — focus on visual feedback.';
    }

    let pacingContext = videoDuration ? `VIDEO: ${videoDuration} seconds long. Platform: ${platform || 'TikTok'}.` : '';

    let messageContent = [];

    if (analysisMode === 'analyze') {

      if (frames && frames.length > 0) {
        const frameSubset = frames.slice(0, 20);
        frameSubset.forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      const analysisPrompt = `You are an expert content analyst. Analyze this video data and identify the most impactful issues.

FRAMES: You have ${Math.min(frames?.length || 0, 20)} frames from this video. Look carefully at text overlays, faces, backgrounds, lighting, framing, colors.
${orientationContext}
${audioContext}
${pacingContext}
${contentInstruction}

Identify the TOP 5 most impactful issues. For each provide:
- category, what_is_wrong, why_it_matters, how_to_fix (2-3 specific dummy-proof sentences)

Also provide:
- scroll_score: 0-100 how likely this stops the scroll
- follower_score: 0-100 based on: emotional connection, relatability, CTA strength, niche clarity, face/personality presence, content consistency signal, value delivery

RESPOND WITH ONLY VALID JSON:
{
  "scroll_score": 72,
  "follower_score": 58,
  "issues": [
    {
      "rank": 1,
      "category": "Hook",
      "importance": "Critical",
      "what_is_wrong": "specific problem",
      "why_it_matters": "psychology",
      "how_to_fix": "2-3 sentences"
    }
  ]
}`;

      const analysisContent = [...messageContent, { type: 'text', text: analysisPrompt }];

      const call1 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: analysisContent }] })
      });

      const data1 = await call1.json();
      if (!call1.ok) throw new Error('Analysis failed');
      const text1 = data1.content.map(i => i.text || '').join('');
      const parsed1 = JSON.parse(text1.substring(text1.indexOf('{'), text1.lastIndexOf('}') + 1));

      const recommendationsPrompt = `You are HookD — a direct, no-nonsense content strategist.

Here is a raw analysis of a creator's video:
${JSON.stringify(parsed1, null, 2)}

Write the final output. For each of the 5 issues:
- title: short punchy title (no emojis)
- psychFact: behavioral science explanation (2-3 sentences, no emojis)
- fix: EXACTLY 2-3 dummy-proof sentences. Precisely what is wrong and exactly what to change. No emojis.

Keep scroll_score and follower_score. Add scoreLabel and followerScoreLabel (Poor/Fair/Good/Strong).

RESPOND WITH ONLY VALID JSON — NO EMOJIS ANYWHERE:
{
  "score": 72,
  "scoreLabel": "Good",
  "followerScore": 58,
  "followerScoreLabel": "Fair",
  "totalIssues": 5,
  "findings": [
    {
      "rank": 1,
      "importance": "Critical",
      "category": "Hook",
      "title": "title here",
      "psychFact": "psychology here",
      "fix": "2-3 dummy proof sentences"
    }
  ]
}`;

      const call2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: recommendationsPrompt }] })
      });

      const data2 = await call2.json();
      if (!call2.ok) throw new Error('Analysis failed');
      const text2 = data2.content.map(i => i.text || '').join('');
      const parsed2 = JSON.parse(text2.substring(text2.indexOf('{'), text2.lastIndexOf('}') + 1));

      return res.status(200).json(parsed2);

    } else if (analysisMode === 'conversion') {

      const funnelCriteria = {
        top: {
          label: 'Top of Funnel (Awareness)',
          criteria: `You are judging this ONLY on Top of Funnel criteria:
1. HOOK SPEED — Does it grab a stranger's attention in under 2 seconds before they know who this brand is?
2. BRAND CLARITY — Can a new viewer understand what this brand does within 5 seconds?
3. SHAREABILITY — Is this content interesting or entertaining enough that someone would send it to a friend?
4. CTA STRENGTH — Does it have a clear, low-commitment next step appropriate for a cold audience (follow, learn more, etc)?
5. PRODUCTION QUALITY — Is the visual and audio quality high enough to build instant credibility with a stranger?
6. FUNNEL STAGE ACCURACY — Does this feel like awareness content or is it jumping straight to a sales pitch too early?

For anything missing, frame feedback as: "This ad is missing [X]. Make sure either this ad or another ad in your awareness campaign covers this — cold audiences need [reason] before they'll move forward."`,
        },
        middle: {
          label: 'Middle of Funnel (Consideration)',
          criteria: `You are judging this ONLY on Middle of Funnel criteria:
1. TRUST SIGNALS — Does it establish credibility? (expertise, brand story, behind the scenes, credentials)
2. SOCIAL PROOF DENSITY — Are there reviews, testimonials, results, or numbers that back up the claims?
3. OBJECTION HANDLING — Does it address the main reasons someone WOULDN'T buy or take the next step?
4. VALUE CLARITY — Is it crystal clear what problem this solves and who it's for?
5. CTA STRENGTH — Does it have a clear next step appropriate for a warm audience (sign up, book a call, try free, etc)?
6. PRODUCTION QUALITY — Is the quality consistent with the price point and brand positioning?
7. FUNNEL STAGE ACCURACY — Does this feel like consideration content or is it either too cold (awareness) or too pushy (conversion)?

For anything missing, frame feedback as: "This ad is light on [X]. If you're running a full campaign, make sure another ad in your consideration sequence handles this — [reason why it matters at this stage]. If this is standalone, weave it in here."`,
        },
        bottom: {
          label: 'Bottom of Funnel (Conversion)',
          criteria: `You are judging this ONLY on Bottom of Funnel criteria:
1. URGENCY — Is there a clear reason to act NOW rather than later? (limited time, limited spots, deadline, etc)
2. FRICTION REDUCTION — Is the next step obvious, simple, and low-effort? Are barriers removed?
3. OFFER CLARITY — Is the price, deal, guarantee, or offer 100% clear with no ambiguity?
4. CTA STRENGTH — Is the call to action direct, specific, and repeated? (Buy now, Book today, Get started, etc)
5. PRODUCTION QUALITY — Is the quality high enough to justify the purchase decision being made right now?
6. FUNNEL STAGE ACCURACY — Does this feel like a closing ad or does it still feel like it's building awareness or consideration?

For anything missing, frame feedback as: "This is missing [X] which is critical at the bottom of the funnel. Make sure your retargeting sequence includes this — people at this stage need [reason] to finally commit. If this is your only touchpoint, add it here."`,
        },
      };

      const stage = funnelCriteria[funnelStage] || funnelCriteria.top;

      if (frames && frames.length > 0) {
        frames.slice(0, 20).forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      const convAnalysisPrompt = `You are an expert paid media and conversion rate optimization analyst.

FRAMES: You have ${Math.min(frames?.length || 0, 20)} frames from this business video/ad.
${orientationContext}
${audioContext}
${pacingContext}

FUNNEL STAGE: ${stage.label}

${stage.criteria}

Identify the TOP 5 most impactful issues. Do not use emojis anywhere.

Also provide:
- conversion_score: 0-100
- funnel_fit_score: 0-100

RESPOND WITH ONLY VALID JSON — NO EMOJIS:
{
  "conversion_score": 68,
  "funnel_fit_score": 74,
  "issues": [
    {
      "rank": 1,
      "category": "Hook Speed",
      "importance": "Critical",
      "what_is_wrong": "specific problem",
      "why_it_matters": "why this hurts at this funnel stage",
      "how_to_fix": "2-3 specific sentences with campaign-aware guidance"
    }
  ]
}`;

      const convContent = [...messageContent, { type: 'text', text: convAnalysisPrompt }];

      const convCall1 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: convContent }] })
      });

      const convData1 = await convCall1.json();
      if (!convCall1.ok) throw new Error('Analysis failed');
      const convText1 = convData1.content.map(i => i.text || '').join('');
      const convParsed1 = JSON.parse(convText1.substring(convText1.indexOf('{'), convText1.lastIndexOf('}') + 1));

      const convRecsPrompt = `You are HookD's business analyst. Write the final conversion report. No emojis anywhere.

Raw analysis:
${JSON.stringify(convParsed1, null, 2)}

Funnel stage: ${stage.label}

For each of the 5 issues write:
- title: short punchy title (no emojis)
- psychFact: 2-3 sentences on why this matters at this funnel stage
- fix: EXACTLY 2-3 dummy-proof sentences with campaign-aware guidance

Keep conversion_score and funnel_fit_score. Add labels (Poor/Fair/Good/Strong).

RESPOND WITH ONLY VALID JSON — NO EMOJIS:
{
  "conversionScore": 68,
  "conversionScoreLabel": "Fair",
  "funnelFitScore": 74,
  "funnelFitScoreLabel": "Good",
  "findings": [
    {
      "rank": 1,
      "importance": "Critical",
      "category": "Hook Speed",
      "title": "title",
      "psychFact": "psychology",
      "fix": "2-3 dummy proof sentences"
    }
  ]
}`;

      const convCall2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: convRecsPrompt }] })
      });

      const convData2 = await convCall2.json();
      if (!convCall2.ok) throw new Error('Analysis failed');
      const convText2 = convData2.content.map(i => i.text || '').join('');
      const convParsed2 = JSON.parse(convText2.substring(convText2.indexOf('{'), convText2.lastIndexOf('}') + 1));

      return res.status(200).json(convParsed2);

    } else if (analysisMode === 'rehook') {
      const isTyped = hookType === 'typed';

      const talkingPrompt = `You are HookD's Re-Hook engine. Rewrite this TALKING hook 5 ways.

A talking hook is the opening spoken line of a video where the creator speaks directly to camera. Rewrites should:
- Sound natural when spoken out loud
- Spark immediate curiosity or emotional pull within the first 1-2 sentences
- Be balanced — not too long, not too short. 1-2 sentences max.
- Use frameworks: curiosity gap, pattern interrupt, relatability, controversy, story open
- Preserve the creator's exact message and argument

Original hook: "${safeScript}"
Platform: "${platform || 'TikTok'}"
${safeHookContext ? `Context about the video: "${safeHookContext}"` : ''}

RESPOND WITH ONLY VALID JSON — NO EMOJIS:
{
  "original": "${safeScript.replace(/"/g, "'")}",
  "hookType": "talking",
  "hooks": [
    {"style": "Curiosity Gap", "hook": "rewritten hook here", "why": "why this works for a talking hook", "duration": "~3s"},
    {"style": "Pattern Interrupt", "hook": "rewritten hook here", "why": "why this works for a talking hook", "duration": "~4s"},
    {"style": "Relatability", "hook": "rewritten hook here", "why": "why this works for a talking hook", "duration": "~3s"},
    {"style": "Controversy", "hook": "rewritten hook here", "why": "why this works for a talking hook", "duration": "~4s"},
    {"style": "Story Open", "hook": "rewritten hook here", "why": "why this works for a talking hook", "duration": "~5s"}
  ]
}`;

      const typedPrompt = `You are HookD's Re-Hook engine. Rewrite this TYPED hook 5 ways.

A typed hook is on-screen text that appears over a trending, music, or aesthetic video — the viewer reads it while watching. Rewrites should:
- Be SHORT and punchy — 3-8 words maximum
- Hit hard within the first 2-3 words to stop the scroll
- Spark immediate emotion: shock, curiosity, FOMO, relatability, or intrigue
- Work as standalone text without needing audio
- The first few words must be powerful enough to make someone pause
- Preserve the creator's core message

Original hook: "${safeScript}"
Platform: "${platform || 'TikTok'}"
${safeHookContext ? `Context about the video: "${safeHookContext}"` : ''}

RESPOND WITH ONLY VALID JSON — NO EMOJIS:
{
  "original": "${safeScript.replace(/"/g, "'")}",
  "hookType": "typed",
  "hooks": [
    {"style": "Shock Open", "hook": "3-8 word typed hook", "why": "why the first words stop the scroll", "wordCount": "5 words"},
    {"style": "FOMO", "hook": "3-8 word typed hook", "why": "why the first words stop the scroll", "wordCount": "4 words"},
    {"style": "Relatability", "hook": "3-8 word typed hook", "why": "why the first words stop the scroll", "wordCount": "6 words"},
    {"style": "Curiosity Gap", "hook": "3-8 word typed hook", "why": "why the first words stop the scroll", "wordCount": "5 words"},
    {"style": "Controversy", "hook": "3-8 word typed hook", "why": "why the first words stop the scroll", "wordCount": "4 words"}
  ]
}`;

      const prompt = isTyped ? typedPrompt : talkingPrompt;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      });

      const data = await response.json();
      if (!response.ok) throw new Error('Analysis failed');
      const text = data.content.map(i => i.text || '').join('');
      return res.status(200).json(JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)));
    }

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
