export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform, filesize, mode, script, flop_context, frames, hasAudio, videoDuration, cutCount, videoWidth, videoHeight, isVertical, audioAnalysis, contentType } = req.body;
  const analysisMode = mode || 'analyze';

  try {
    const contentTypeInstructions = {
      'talking': `CONTENT TYPE: TALKING TO CAMERA — Focus on: eye contact with camera lens, energy and delivery, facial expressions, hook in first 3 seconds, caption strategy for muted viewing, face lighting, audio clarity, speaking pace, body language. DO NOT heavily critique environment unless actively distracting.`,
      'footage': `CONTENT TYPE: FOOTAGE / VLOG — Focus on: visual storytelling, hook creating curiosity, pacing and cuts, lighting, color palette, music matching vibe, text guiding narrative, thumbnail potential. DO NOT critique speaking delivery unless there is a voiceover.`,
      'skit': `CONTENT TYPE: SKIT / COMEDY / TRENDS — Focus on: hook energy in first 0.5 seconds, timing of punchline or reveal, energy level, facial expressions and commitment, pattern interrupts, sound design, trend execution clarity, rewatchability.`,
      'product': `CONTENT TYPE: PRODUCT / BRAND — Focus on: value proposition clarity in 3 seconds, product visibility, trust signals, hook opening with problem or benefit, call to action, text highlighting key benefits. Focus on CONVERSION and CLARITY.`,
      'aesthetic': `CONTENT TYPE: AESTHETIC / VIBE / MUSIC — Focus on: visual cohesion, color grading, music sync with cuts, mood clarity, visual contrast, uniqueness in feed, pacing relative to music. DO NOT apply talking head or business metrics.`
    };

    const contentInstruction = contentTypeInstructions[contentType] || `CONTENT TYPE: General short-form content. Analyze all dimensions.`;

    let orientationContext = '';
    if (videoWidth && videoHeight) {
      const isVert = videoHeight > videoWidth;
      orientationContext = `VIDEO DIMENSIONS: Confirmed ${isVert ? 'VERTICAL' : 'HORIZONTAL'} (${videoWidth}x${videoHeight}). ${isVert ? 'Correct format — do NOT suggest reshoot in vertical.' : 'HORIZONTAL format — ' + (platform || 'TikTok') + ' is vertical-first, this is a real problem.'}`;
    } else if (isVertical !== undefined) {
      orientationContext = `VIDEO ORIENTATION: ${isVertical ? 'VERTICAL (correct) — do NOT suggest reshoot in vertical' : 'HORIZONTAL — problem for ' + (platform || 'TikTok')}.`;
    }

    let audioContext = '';
    if (!hasAudio) {
      audioContext = 'AUDIO: No audio track. Give feedback about adding sound.';
    } else if (!audioAnalysis) {
      audioContext = `AUDIO: Audio confirmed present. Do not comment on speaking pace without transcription data.`;
    } else if (audioAnalysis.looksLikeMusic || !audioAnalysis.isSpeech) {
      audioContext = `AUDIO: Background music detected (${audioAnalysis.wordCount} words at ${audioAnalysis.wpm} WPM — characteristic of music). DO NOT critique speaking pace. Give feedback on voiceover strategy.`;
    } else {
      audioContext = `AUDIO: Creator is SPEAKING. Words: ${audioAnalysis.wordCount}. Pace: ${audioAnalysis.wpm} WPM (optimal: 130-160 WPM). Filler words: ${audioAnalysis.fillerCount}. Transcript: "${audioAnalysis.transcript}".`;
    }

    let pacingContext = '';
    if (videoDuration && videoDuration > 0) {
      pacingContext = `PACING: Video is ${videoDuration} seconds. Estimated cuts: ${cutCount || 0}. Note: camera movement may cause overcounting — do not make overly confident claims about exact cut count. Optimal for ${platform || 'TikTok'}: 1 cut every 1-2 seconds.`;
    }

    let prompt = '';
    let messageContent = [];

    if (analysisMode === 'analyze') {
      const fs = parseInt(filesize) || 12345;
      const scoreBase = Math.round((fs % 900) / 900 * 53 + 35);
      const scoreAdjust = (filename || '').length % 10 - 5;
      const finalScore = Math.min(88, Math.max(35, scoreBase + scoreAdjust));
      const scoreLabel = finalScore >= 75 ? 'Strong' : finalScore >= 63 ? 'Good' : finalScore >= 50 ? 'Fair' : 'Poor';

      if (frames && frames.length > 0) {
        frames.forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      prompt = `You are HookD, the most brutally honest AI content analyst. No filter. Profanity welcome. Savage and funny. Everything backed by SPECIFIC data you actually have.

${frames?.length > 0 ? `VISUAL: You have ${frames.length} actual frames from this video. Look carefully for text overlays, captions, faces, backgrounds, colors, lighting. If you see text in any frame note exactly where and what it says.` : 'VISUAL: No frames.'}

${orientationContext}
${audioContext}
${pacingContext}

Video: "${filename}" | Platform: ${platform || 'TikTok'}
Use EXACTLY: score ${finalScore}, scoreLabel "${scoreLabel}"

${contentInstruction}

RULES:
1. Only state as fact what confirmed data supports.
2. If vertical confirmed — NEVER suggest shooting vertical.
3. If music not speech — NEVER critique speaking pace.
4. If you see text in frames — acknowledge it. Never say no text overlay if text is visible.
5. NEVER suggest buying equipment.
6. NEVER assume their intended vibe.
7. For CTAs — identify the gap, name the category, prompt their creativity. Never write it for them.
8. Be savage, funny, profanity welcome — but based on real observations only.

Find EVERY problem. Reference specific things you see in the frames.

For EACH finding:
- roast: 3-4 sentences savage funny specific roast with profanity
- psychFact: real behavioral science with specific stats
- fix: detailed direction on WHAT and WHY, point toward solution type, hand back to creator with a line prompting their creativity. End: "We're bullying you out of love ❤️"

Sort: Critical → High → Medium → Polish. Generate 6-10 findings.

RESPOND WITH ONLY VALID JSON:
{"score":${finalScore},"scoreLabel":"${scoreLabel}","totalIssues":7,"findings":[{"rank":1,"importance":"Critical","category":"Hook","icon":"🎯","iconClass":"icon-hook","title":"title here","roast":"roast here","psychFact":"fact here","fix":"fix here"}]}`;

      messageContent.push({ type: 'text', text: prompt });

    } else if (analysisMode === 'rehook') {
      prompt = `You are HookD's Re-Hook engine. Rewrite this hook 5 ways using proven psychological frameworks.
Original: "${script || ''}"
Platform: "${platform || 'TikTok'}"
Each rewrite: completely different structure, works in first 3 seconds, specific to topic, genuinely viral-worthy.
RESPOND WITH ONLY VALID JSON:
{"original":"${(script||'').replace(/"/g,"'")}","hooks":[{"style":"Curiosity Gap","emoji":"🧠","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Controversy","emoji":"🔥","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Relatability","emoji":"😭","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Shock Stat","emoji":"📊","hook":"hook","why":"reason","spokenDuration":"2s"},{"style":"Story Open","emoji":"🎬","hook":"hook","why":"reason","spokenDuration":"2s"}]}`;
      messageContent = [{ type: 'text', text: prompt }];

    } else if (analysisMode === 'flop') {
      if (frames && frames.length > 0) {
        frames.forEach(frame => {
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } });
        });
      }

      prompt = `You are HookD's Why Did This Flop analyzer. Brutally honest, funniest critic alive. Zero filter. Profanity required. Resurrection advice is extremely detailed and helpful.

${frames?.length > 0 ? `VISUAL: ${frames.length} real frames. Reference specific things you see.` : ''}
${orientationContext}
${audioContext}
${pacingContext}
Context: "${flop_context || 'None'}"

RESPOND WITH ONLY VALID JSON:
{"verdict":"savage opening","autopsy":[{"rank":1,"reason":"title","roast":"roast","data":"data","impact":"Critical"},{"rank":2,"reason":"title","roast":"roast","data":"data","impact":"High"},{"rank":3,"reason":"title","roast":"roast","data":"data","impact":"High"},{"rank":4,"reason":"title","roast":"roast","data":"data","impact":"Medium"}],"resurrection":"6+ sentences of specific detailed advice","closer":"final savage line. We're bullying you out of love ❤️"}`;

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
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content.map(i => i.text || '').join('');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1) throw new Error('Invalid response');

    return res.status(200).json(JSON.parse(text.substring(firstBrace, lastBrace + 1)));

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
