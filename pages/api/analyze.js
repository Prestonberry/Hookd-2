export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform, filesize, mode, script, flop_context } = req.body;
  const analysisMode = mode || 'analyze';

  try {
    let prompt = '';

    if (analysisMode === 'analyze') {
      const fs = parseInt(filesize) || 12345;
      const scoreBase = Math.round((fs % 900) / 900 * 53 + 35);
      const scoreAdjust = (filename || '').length % 10 - 5;
      const finalScore = Math.min(88, Math.max(35, scoreBase + scoreAdjust));
      const scoreLabel = finalScore >= 75 ? 'Strong' : finalScore >= 63 ? 'Good' : finalScore >= 50 ? 'Fair' : 'Poor';

      prompt = `You are HookD, a brutally honest AI content analyst with no filter. You curse freely, you are savage and funny, but you genuinely want creators to succeed so your advice is extremely detailed and specific.

Video: "${filename || 'video.mp4'}" | Size: ${fs} bytes | Platform: ${platform || 'TikTok'}

Use EXACTLY this score: ${finalScore} and EXACTLY this scoreLabel: "${scoreLabel}"

Find EVERY problem across these dimensions: visual contrast, color psychology, hook strength, first 3 seconds, pacing, cut rhythm, audio quality, audio hierarchy, text overlays, captions, lighting, background, environment, body language, call to action, platform optimization, watch time, retention patterns, emotional engagement, pattern interrupts, thumbnail potential.

For EACH finding write:
- roast: 3-4 sentences of savage funny roasting with profanity and absurd specific comparisons. Be genuinely mean in a funny way.
- psychFact: the real behavioral science or data behind why this hurts performance
- fix: extremely detailed fix with exact numbers, exact steps, exact techniques. Minimum 4 sentences. End with "We're bullying you out of love heart"

Sort findings: Critical first, then High, then Medium, then Polish.
Generate between 6 and 10 findings total.
Make every finding have completely different jokes and energy.

YOU MUST RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. NO MARKDOWN. START WITH { END WITH }

Use this exact structure:
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
      "title": "Your Title Here",
      "roast": "Your roast here",
      "psychFact": "Your psych fact here",
      "fix": "Your detailed fix here. We're bullying you out of love heart"
    }
  ]
}`;

    } else if (analysisMode === 'rehook') {
      prompt = `You are HookD's Re-Hook engine. Rewrite this hook 5 ways.

Original hook: "${script || 'No script provided'}"
Platform: "${platform || 'TikTok'}"

Rules: Each rewrite must be completely different. Must work spoken in first 3 seconds. Must be specific to the topic. Must be genuinely good.

YOU MUST RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. NO MARKDOWN. START WITH { END WITH }

{
  "original": "the original hook text",
  "hooks": [
    {
      "style": "Curiosity Gap",
      "emoji": "🧠",
      "hook": "rewritten hook",
      "why": "one sentence on why this works psychologically",
      "spokenDuration": "2s"
    },
    {
      "style": "Controversy",
      "emoji": "🔥",
      "hook": "rewritten hook",
      "why": "one sentence on why this works psychologically",
      "spokenDuration": "2s"
    },
    {
      "style": "Relatability",
      "emoji": "😭",
      "hook": "rewritten hook",
      "why": "one sentence on why this works psychologically",
      "spokenDuration": "2s"
    },
    {
      "style": "Shock Stat",
      "emoji": "📊",
      "hook": "rewritten hook",
      "why": "one sentence on why this works psychologically",
      "spokenDuration": "2s"
    },
    {
      "style": "Story Open",
      "emoji": "🎬",
      "hook": "rewritten hook",
      "why": "one sentence on why this works psychologically",
      "spokenDuration": "2s"
    }
  ]
}`;

    } else if (analysisMode === 'flop') {
      const fs = parseInt(filesize) || 0;

      prompt = `You are HookD's Why Did This Flop analyzer. You are the most brutally honest, funniest content critic alive. Zero filter. Profanity welcome. Absurdly specific comparisons required. But your resurrection advice is extremely detailed and genuinely helpful.

Video: "${filename || 'video.mp4'}" | Size: ${fs} bytes | Platform: "${platform || 'TikTok'}"
Creator context: "${flop_context || 'No context provided'}"

Analyze based on the filename, filesize, platform and context. Give specific actionable feedback. If filesize is very small it means short video. Use that context.

YOU MUST RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. NO MARKDOWN. START WITH { END WITH }

{
  "verdict": "One savage unhinged opening paragraph with profanity and specific funny comparisons",
  "autopsy": [
    {
      "rank": 1,
      "reason": "Reason title",
      "roast": "2-3 sentences funny savage roast with profanity",
      "data": "specific data point or psychology principle",
      "impact": "Critical"
    },
    {
      "rank": 2,
      "reason": "Reason title",
      "roast": "2-3 sentences funny savage roast with profanity",
      "data": "specific data point or psychology principle",
      "impact": "High"
    },
    {
      "rank": 3,
      "reason": "Reason title",
      "roast": "2-3 sentences funny savage roast with profanity",
      "data": "specific data point or psychology principle",
      "impact": "High"
    },
    {
      "rank": 4,
      "reason": "Reason title",
      "roast": "2-3 sentences funny savage roast with profanity",
      "data": "specific data point or psychology principle",
      "impact": "Medium"
    }
  ],
  "resurrection": "Minimum 6 sentences of extremely specific detailed actionable advice. Exact numbers. Exact techniques. Explain the psychology behind each recommendation.",
  "closer": "One final savage funny sentence. We're bullying you out of love heart"
}`;
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
        messages: [{ role: 'user', content: prompt }]
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

    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    const result = JSON.parse(jsonStr);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
