export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform, filesize, mode, script, flop_context, frames, audioData, videoDuration, cutCount } = req.body;
  const analysisMode = mode || 'analyze';

  try {
    // ============================================================
    // ASSEMBLYAI AUDIO ANALYSIS
    // ============================================================
    async function analyzeAudio(audioBase64) {
      if (!audioBase64 || !process.env.ASSEMBLYAI_API_KEY) return null;
      
      try {
        // Upload audio to AssemblyAI
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY,
            'content-type': 'application/octet-stream'
          },
          body: Buffer.from(audioBase64, 'base64')
        });
        
        if (!uploadRes.ok) return null;
        const { upload_url } = await uploadRes.json();

        // Request transcription with audio intelligence
        const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            audio_url: upload_url,
            speech_threshold: 0.2,
            filter_profanity: false,
            disfluencies: true, // detect um, uh, like
          })
        });

        if (!transcriptRes.ok) return null;
        const { id } = await transcriptRes.json();

        // Poll for completion (max 30 seconds)
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY }
          });
          const transcript = await pollRes.json();
          
          if (transcript.status === 'completed') {
            const words = transcript.words || [];
            const text = transcript.text || '';
            const wordCount = words.length;
            const duration = transcript.audio_duration || 1;
            const wpm = Math.round((wordCount / duration) * 60);
            
            // Count filler words
            const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so'];
            let fillerCount = 0;
            fillerWords.forEach(fw => {
              const matches = text.toLowerCase().match(new RegExp('\\b' + fw + '\\b', 'g'));
              if (matches) fillerCount += matches.length;
            });

            return {
              transcript: text.substring(0, 500),
              wordCount,
              wpm,
              fillerCount,
              duration: Math.round(duration),
              hasContent: wordCount > 0
            };
          }
          
          if (transcript.status === 'error') return null;
        }
        return null;
      } catch (e) {
        console.error('AssemblyAI error:', e.message);
        return null;
      }
    }

    let audioAnalysis = null;
    if (audioData && analysisMode !== 'rehook') {
      audioAnalysis = await analyzeAudio(audioData);
    }

    // Build audio context string for Claude
    const audioContext = audioAnalysis ? `
AUDIO ANALYSIS (from AssemblyAI — this is real data):
- Speech detected: ${audioAnalysis.hasContent ? 'Yes' : 'No speech detected'}
- Words spoken: ${audioAnalysis.wordCount}
- Speaking pace: ${audioAnalysis.wpm} words per minute (optimal for TikTok: 130-160 WPM)
- Filler words detected: ${audioAnalysis.fillerCount} (um, uh, like, etc.)
- Video duration: ${audioAnalysis.duration} seconds
- Transcript preview: "${audioAnalysis.transcript}"
` : `
AUDIO ANALYSIS: No audio data provided. Do not make up audio feedback — skip audio findings or note audio could not be analyzed.
`;

    // Build pacing context
    const pacingContext = (videoDuration && cutCount !== undefined) ? `
PACING ANALYSIS:
- Video duration: ${videoDuration} seconds
- Number of cuts detected: ${cutCount}
- Average time between cuts: ${cutCount > 0 ? (videoDuration / cutCount).toFixed(1) : 'unknown'} seconds
- Optimal cuts for ${platform || 'TikTok'}: every 1-3 seconds for high energy content
` : `PACING ANALYSIS: No pacing data provided.`;

    let prompt = '';
    let messageContent = [];

    if (analysisMode === 'analyze') {
      const fs = parseInt(filesize) || 12345;
      const scoreBase = Math.round((fs % 900) / 900 * 53 + 35);
      const scoreAdjust = (filename || '').length % 10 - 5;
      const finalScore = Math.min(88, Math.max(35, scoreBase + scoreAdjust));
      const scoreLabel = finalScore >= 75 ? 'Strong' : finalScore >= 63 ? 'Good' : finalScore >= 50 ? 'Fair' : 'Poor';

      // Add frames
      if (frames && frames.length > 0) {
        frames.forEach(frame => {
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: frame }
          });
        });
      }

      prompt = `You are HookD, a brutally honest AI content analyst. No filter. Curse freely. Savage and funny. But genuinely want creators to win so advice is extremely detailed and specific.

${frames && frames.length > 0 ? `You have been given ${frames.length} REAL frames extracted from the creator's actual video. You can SEE what is in this video. Reference specific things you observe: actual background, actual colors, lighting, whether there is a face, text visible, setting, clothing, environment. Be SPECIFIC to what you see.` : ''}

${audioContext}

${pacingContext}

Video: "${filename || 'video.mp4'}" | Size: ${fs} bytes | Platform: ${platform || 'TikTok'}
Use EXACTLY: score ${finalScore}, scoreLabel "${scoreLabel}"

YOUR JOB: Find EVERY problem. Use ALL the data you have — visual frames, audio analysis, pacing data. Be specific to what you actually know about this video.

Analyze every dimension:
- Visual contrast & color (from frames)
- Hook & first 3 seconds (from frames)  
- Lighting (from frames)
- Background & environment (from frames)
- Body language & presence (from frames)
- Text overlays visible (from frames)
- Speaking pace ${audioAnalysis ? `(${audioAnalysis.wpm} WPM detected)` : ''}
- Filler words ${audioAnalysis ? `(${audioAnalysis.fillerCount} detected)` : ''}
- Audio clarity & energy
- Cut frequency & pacing
- Call to action
- Platform optimization for ${platform || 'TikTok'}

For EACH finding:
- roast: 3-4 sentences savage funny roasting with profanity. REFERENCE SPECIFIC THINGS YOU ACTUALLY KNOW about this video. If you see a green wall, mention the green wall. If 180 WPM detected, roast the speed. Be SPECIFIC not generic.
- psychFact: real behavioral science with specific numbers where possible
- fix: extremely detailed fix with exact numbers. Reference what you actually observed. Minimum 4 sentences. End with "We're bullying you out of love ❤️"

Sort: Critical → High → Medium → Polish
Generate 6-10 findings.
Only give audio findings if audio data was provided.

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "score": ${finalScore},
  "scoreLabel": "${scoreLabel}",
  "totalIssues": 7,
  "findings": [
    {
      "rank": 1,
      "importance": "Critical",
      "category": "Visual Contrast",
      "icon": "👁️",
      "iconClass": "icon-visual",
      "title": "Specific title referencing what you see",
      "roast": "Savage specific roast referencing actual observations",
      "psychFact": "Real psychology with numbers",
      "fix": "Detailed specific fix. We're bullying you out of love ❤️"
    }
  ]
}`;

      messageContent.push({ type: 'text', text: prompt });

    } else if (analysisMode === 'rehook') {
      prompt = `You are HookD's Re-Hook engine. Rewrite this hook 5 ways using proven psychological frameworks.

Original: "${script || 'No script provided'}"
Platform: "${platform || 'TikTok'}"

Each rewrite: completely different structure, works spoken in first 3 seconds, specific to the topic, genuinely good enough to go viral.

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "original": "the original hook",
  "hooks": [
    {"style": "Curiosity Gap", "emoji": "🧠", "hook": "rewritten hook", "why": "psychological reason", "spokenDuration": "2s"},
    {"style": "Controversy", "emoji": "🔥", "hook": "rewritten hook", "why": "psychological reason", "spokenDuration": "2s"},
    {"style": "Relatability", "emoji": "😭", "hook": "rewritten hook", "why": "psychological reason", "spokenDuration": "2s"},
    {"style": "Shock Stat", "emoji": "📊", "hook": "rewritten hook", "why": "psychological reason", "spokenDuration": "2s"},
    {"style": "Story Open", "emoji": "🎬", "hook": "rewritten hook", "why": "psychological reason", "spokenDuration": "2s"}
  ]
}`;
      messageContent = [{ type: 'text', text: prompt }];

    } else if (analysisMode === 'flop') {
      const fs = parseInt(filesize) || 0;

      if (frames && frames.length > 0) {
        frames.forEach(frame => {
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: frame }
          });
        });
      }

      prompt = `You are HookD's Why Did This Flop analyzer. Most brutally honest, funniest content critic alive. Zero filter. Profanity required. Specific funny comparisons. Resurrection advice is extremely detailed and genuinely helpful.

${frames && frames.length > 0 ? `You have ${frames.length} REAL frames from the video. Reference specific things you actually see.` : ''}

${audioContext}
${pacingContext}

Video: "${filename || 'video.mp4'}" | Size: ${fs} bytes | Platform: "${platform || 'TikTok'}"
Context: "${flop_context || 'No context provided'}"

Use ALL available data — frames, audio analysis, pacing — to give specific reasons this flopped.

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "verdict": "Savage specific opening paragraph referencing things you actually know about this video",
  "autopsy": [
    {"rank": 1, "reason": "Specific reason", "roast": "Funny savage specific roast", "data": "Real data or psychology", "impact": "Critical"},
    {"rank": 2, "reason": "Specific reason", "roast": "Funny savage specific roast", "data": "Real data or psychology", "impact": "High"},
    {"rank": 3, "reason": "Specific reason", "roast": "Funny savage specific roast", "data": "Real data or psychology", "impact": "High"},
    {"rank": 4, "reason": "Specific reason", "roast": "Funny savage specific roast", "data": "Real data or psychology", "impact": "Medium"}
  ],
  "resurrection": "Minimum 6 sentences extremely specific detailed actionable advice based on what you actually know about this video",
  "closer": "One final savage funny specific sentence. We're bullying you out of love ❤️"
}`;

      messageContent.push({ type: 'text', text: prompt });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'API error' });
    }

    const text = data.content.map(i => i.text || '').join('');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON in response:', text);
      return res.status(500).json({ error: 'Invalid response' });
    }

    const result = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
