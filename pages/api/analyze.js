export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    filename, platform, filesize, mode, script,
    frames, hasAudio, videoDuration, cutCount,
    videoWidth, videoHeight, isVertical, contentType, hookContext,
    transcript, wpm, fillerCount, dominantSentiment
  } = req.body;

  const analysisMode = mode || 'analyze';

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
    } else if (transcript) {
      audioContext = `AUDIO TRANSCRIPTION:
- Full transcript: "${transcript}"
- Speaking pace: ${wpm} WPM (optimal is 130-160 WPM)
- Filler words detected: ${fillerCount}
- Dominant sentiment: ${dominantSentiment}`;
    } else {
      audioContext = 'AUDIO: Audio present. No transcription available — focus on visual feedback.';
    }

    let pacingContext = videoDuration ? `VIDEO: ${videoDuration} seconds long. Platform: ${platform || 'TikTok'}.` : '';

    let messageContent = [];

    // ── ANALYZE MODE ──────────────────────────────────────────
    if (analysisMode === 'analyze') {

      if (frames && frames.length > 0) {
        // Send max 20 frames to stay within token limits
        const frameSubset = frames.slice(0, 20);
        frameSubset.forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      // CALL 1: Raw analysis
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
      "icon": "🎯",
      "what_is_wrong": "specific problem",
      "why_it_matters": "psychology",
      "how_to_fix": "2-3 sentences"
    }
  ]
}`;

      const analysisContent = [...messageContent, { type: 'text', text: analysisPrompt }];

      const call1 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: analysisContent }]
        })
      });

      const data1 = await call1.json();
      if (!call1.ok) throw new Error(data1.error?.message || 'API error call 1');
      const text1 = data1.content.map(i => i.text || '').join('');
      const parsed1 = JSON.parse(text1.substring(text1.indexOf('{'), text1.lastIndexOf('}') + 1));

      // CALL 2: Write final recommendations (no images needed)
      const recommendationsPrompt = `You are HookD — a brutally honest but genuinely helpful content strategist.

Here is a raw analysis of a creator's video:
${JSON.stringify(parsed1, null, 2)}

Write the final output. For each of the 5 issues:
- title: short punchy title
- psychFact: behavioral science explanation (2-3 sentences)
- fix: EXACTLY 2-3 dummy-proof sentences. Precisely what is wrong and exactly what to change.

Keep scroll_score and follower_score. Add scoreLabel and followerScoreLabel (Poor/Fair/Good/Strong).

RESPOND WITH ONLY VALID JSON:
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
      "icon": "🎯",
      "title": "title",
      "psychFact": "psychology",
      "fix": "2-3 dummy proof sentences"
    }
  ]
}`;

      const call2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: recommendationsPrompt }]
        })
      });

      const data2 = await call2.json();
      if (!call2.ok) throw new Error(data2.error?.message || 'API error call 2');
      const text2 = data2.content.map(i => i.text || '').join('');
      const parsed2 = JSON.parse(text2.substring(text2.indexOf('{'), text2.lastIndexOf('}') + 1));

      return res.status(200).json(parsed2);

    // ── REHOOK MODE ───────────────────────────────────────────
    } else if (analysisMode === 'rehook') {
      const prompt = `You are HookD's Re-Hook engine. Rewrite this hook 5 ways using proven psychological frameworks.
Original: "${script || ''}"
Platform: "${platform || 'TikTok'}"
CRITICAL: Preserve the creator's exact message. Only change HOW they say it.
${hookContext ? `CREATOR CONTEXT: "${hookContext}"` : ''}

RESPOND WITH ONLY VALID JSON:
{"original":"${(script||'').replace(/"/g,"'")}","hooks":[{"style":"Curiosity Gap","emoji":"🧠","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Controversy","emoji":"🔥","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Relatability","emoji":"😭","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Shock Stat","emoji":"📊","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Story Open","emoji":"🎬","hook":"hook","why":"reason","spokenDuration":"2s"}]}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'API error');
      const text = data.content.map(i => i.text || '').join('');
      return res.status(200).json(JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)));
    }

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
