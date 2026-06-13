export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '5eca84fac35e49e893c199b52ad1d8e6';

// Upload audio to AssemblyAI and get transcript + sentiment
async function transcribeWithAssemblyAI(audioBase64) {
  try {
    // Upload the audio file
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
      },
      body: Buffer.from(audioBase64, 'base64'),
    });

    if (!uploadRes.ok) throw new Error('AssemblyAI upload failed');
    const { upload_url } = await uploadRes.json();

    // Request transcription with sentiment analysis
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        sentiment_analysis: true,
        disfluencies: true, // captures filler words
      }),
    });

    if (!transcriptRes.ok) throw new Error('AssemblyAI transcript request failed');
    const { id } = await transcriptRes.json();

    // Poll until complete (max 60 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 'authorization': ASSEMBLYAI_API_KEY },
      });
      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        const words = pollData.words || [];
        const text = pollData.text || '';
        const wordCount = words.length;
        const duration = pollData.audio_duration || 1;
        const wpm = Math.round((wordCount / duration) * 60);

        const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right'];
        const fillerCount = words.filter(w => fillerWords.includes(w.text?.toLowerCase())).length;

        // Sentiment summary
        const sentiments = pollData.sentiment_analysis_results || [];
        const positiveCount = sentiments.filter(s => s.sentiment === 'POSITIVE').length;
        const negativeCount = sentiments.filter(s => s.sentiment === 'NEGATIVE').length;
        const neutralCount = sentiments.filter(s => s.sentiment === 'NEUTRAL').length;
        const dominantSentiment = positiveCount >= negativeCount && positiveCount >= neutralCount ? 'positive'
          : negativeCount >= positiveCount && negativeCount >= neutralCount ? 'negative' : 'neutral';

        return {
          transcript: text,
          wordCount,
          wpm,
          fillerCount,
          duration,
          dominantSentiment,
          sentimentBreakdown: { positive: positiveCount, negative: negativeCount, neutral: neutralCount },
          isSpeech: wordCount > 10,
        };
      }

      if (pollData.status === 'error') throw new Error('AssemblyAI transcription error');
    }

    throw new Error('AssemblyAI timeout');
  } catch (err) {
    console.error('AssemblyAI error:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    filename, platform, filesize, mode, script, flop_context,
    frames, hasAudio, audioBase64, videoDuration, cutCount,
    videoWidth, videoHeight, isVertical, contentType, hookContext, voicePersona
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
    let transcriptData = null;

    if (!hasAudio) {
      audioContext = 'AUDIO: No audio detected.';
    } else if (audioBase64) {
      // Real AssemblyAI transcription
      transcriptData = await transcribeWithAssemblyAI(audioBase64);
      if (transcriptData && transcriptData.isSpeech) {
        audioContext = `AUDIO TRANSCRIPTION (real data):
- Full transcript: "${transcriptData.transcript}"
- Word count: ${transcriptData.wordCount}
- Speaking pace: ${transcriptData.wpm} WPM (optimal is 130-160 WPM)
- Filler words detected: ${transcriptData.fillerCount}
- Dominant sentiment: ${transcriptData.dominantSentiment}
- Sentiment breakdown: ${transcriptData.sentimentBreakdown.positive} positive, ${transcriptData.sentimentBreakdown.negative} negative, ${transcriptData.sentimentBreakdown.neutral} neutral sentences`;
      } else {
        audioContext = 'AUDIO: Music or non-speech audio detected. Do not critique speaking pace.';
      }
    } else {
      audioContext = 'AUDIO: Audio present but no transcription available.';
    }

    let pacingContext = '';
    if (videoDuration && videoDuration > 0) {
      pacingContext = `VIDEO: ${videoDuration} seconds long. Platform: ${platform || 'TikTok'}.`;
    }

    let messageContent = [];
    let prompt = '';

    // ── ANALYZE MODE ──────────────────────────────────────────
    if (analysisMode === 'analyze') {

      if (frames && frames.length > 0) {
        frames.forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      // CALL 1: Raw data analysis
      const analysisPrompt = `You are an expert content analyst. Analyze this video data objectively and identify the most impactful issues.

FRAMES: You have ${frames?.length || 0} frames from this video. Look carefully at text overlays, faces, backgrounds, lighting, framing, colors.
${orientationContext}
${audioContext}
${pacingContext}
${contentInstruction}

Identify the TOP 5 most impactful issues with this video. For each issue provide:
- category: what aspect (Hook, Audio, Visuals, Pacing, CTA, Engagement, Relatability, etc)
- what_is_wrong: exactly what the specific problem is based on real data you have
- why_it_matters: the behavioral science or psychology behind why this hurts performance
- how_to_fix: 2-3 specific, dummy-proof sentences on exactly what to change

Also provide:
- scroll_score: 0-100 how likely this stops the scroll (based on hook, visuals, pacing)
- follower_score: 0-100 how likely this converts viewers to followers based on: emotional connection, relatability, CTA strength, niche clarity, face/personality presence, content consistency signal, value delivery

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
      "what_is_wrong": "specific problem here",
      "why_it_matters": "psychology here",
      "how_to_fix": "2-3 sentences here"
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

      // CALL 2: Write the final recommendations
      const recommendationsPrompt = `You are HookD — a brutally honest but genuinely helpful content strategist. 

Here is a raw analysis of a creator's video:
${JSON.stringify(parsed1, null, 2)}

Now write the final output. For each of the 5 issues:
- title: short punchy title for the problem
- psychFact: the behavioral science explanation (2-3 sentences, educational and specific)
- fix: EXACTLY 2-3 dummy-proof sentences. Tell them precisely what is wrong and exactly what to change. No fluff. No roasting. Just clear, actionable direction a beginner could follow.

Keep the scroll_score and follower_score from the analysis.
Add a scrollScoreLabel and followerScoreLabel (Poor / Fair / Good / Strong).

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
      "title": "title here",
      "psychFact": "psychology here",
      "fix": "2-3 dummy proof sentences here"
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
      prompt = `You are HookD's Re-Hook engine. Rewrite this hook 5 ways using proven psychological frameworks.
Original: "${script || ''}"
Platform: "${platform || 'TikTok'}"

CRITICAL: Preserve the creator's exact message and argument. Only change HOW they say it, not WHAT they are saying.
${hookContext ? `CREATOR CONTEXT: "${hookContext}"` : ''}

RESPOND WITH ONLY VALID JSON:
{"original":"${(script||'').replace(/"/g,"'")}","hooks":[{"style":"Curiosity Gap","emoji":"🧠","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Controversy","emoji":"🔥","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Relatability","emoji":"😭","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Shock Stat","emoji":"📊","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Story Open","emoji":"🎬","hook":"hook","why":"reason","spokenDuration":"2s"}]}`;
      messageContent = [{ type: 'text', text: prompt }];

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
          messages: [{ role: 'user', content: messageContent }]
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
