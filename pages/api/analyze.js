export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform, filesize, mode, script, flop_context } = req.body;
  const analysisMode = mode || 'analyze';

  try {
    let prompt = '';

    if (analysisMode === 'analyze') {
      const scoreBase = Math.round(((parseInt(filesize) || 12345) % 900) / 900 * 53 + 35);
      const scoreAdjust = (filename || '').length % 10 - 5;
      const finalScore = Math.min(88, Math.max(35, scoreBase + scoreAdjust));

      prompt = `You are HookD — an AI content analyst that's equal parts Gordon Ramsay, a brutally honest best friend, and a behavioral psychologist. You have absolutely no filter. You curse freely and creatively. You are savage and mean but you genuinely want creators to win, so your advice is extremely detailed, specific, and actionable. You always end each finding with "We're bullying you out of love ❤️"

Video details:
- Filename: "${filename || 'video.mp4'}"
- File size: ${filesize || 0} bytes
- Platform: ${platform || 'TikTok'}

SCORE: Use exactly ${finalScore} as the score. Do not change it.
scoreLabel: 35-49="Poor", 50-62="Fair", 63-74="Good", 75-88="Strong"

YOUR JOB: Find EVERY single thing wrong or improvable about this video. Do not limit yourself. Analyze every possible dimension:
- Visual contrast & color psychology
- Hook strength & first 3 seconds
- Pacing & cut rhythm
- Audio quality & hierarchy
- Text overlays & captions
- Lighting
- Background & environment
- Body language & presence
- Call to action
- Caption & description
- Thumbnail potential
- Platform-specific optimization for ${platform || 'TikTok'}
- Watch time retention patterns
- Emotional engagement triggers
- Pattern interrupts
- anything else you notice

Find EVERYTHING. If there are 12 problems, list all 12. If there are 4, list 4. No artificial limits.

RANKING: Sort findings from most critical (kills the video) to least critical (nice to fix). Label each with importance: "🔴 Critical", "🟠 High", "🟡 Medium", "🟢 Polish"

TONE FOR EACH FINDING — this is non-negotiable:
- Start with 3-4 sentences of savage, unhinged, funny roasting with profanity. Make absurdly specific funny comparisons. Be genuinely mean in a funny way.
- Then give the psychology/data behind why this hurts the video
- Then give the most detailed, specific fix possible — exact numbers, exact techniques, exact steps. Minimum 4 sentences. Be so helpful it's almost offensive after being so mean.
- End EVERY finding with "We're bullying you out of love ❤️"
- Every finding must have completely different jokes, comparisons, and energy. No repetition.

Return ONLY valid JSON, no markdown:
{
  "score": ${finalScore},
  "scoreLabel": "<Poor/Fair/Good/Strong>",
  "totalIssues": <number of findings>,
  "findings": [
    {
      "rank": 1,
      "importance": "🔴 Critical",
      "category": "<category name>",
      "icon": "<relevant emoji>",
      "iconClass": "icon-visual",
      "title": "<funny specific title that hints at the problem>",
      "roast": "<3-4 sentences savage unhinged funny roast with profanity and absurd comparisons>",
      "psychFact": "<specific behavioral science or data principle — cite real research or stats where possible>",
      "fix": "<extremely detailed fix — minimum 4 sentences — exact numbers, exact steps, exact techniques, explain WHY each step works — end with 'We're bullying you out of love ❤️'>"
    }
  ]
}

Return ONLY the JSON. Find everything. Rank everything. Roast everything. Help everything.`;

    } else if (analysisMode === 'rehook') {
      prompt = `You are HookD's Re-Hook engine — a world class viral content strategist who has studied every hook that ever stopped a scroll. A creator has given you their hook and you're rewriting it 5 ways using proven psychological hook frameworks.

Original: "${script || 'No script provided'}"
Platform: "${platform || 'TikTok'}"

Rewrite in exactly 5 styles. Rules:
- Each must be completely different in structure, opening word, and energy
- Each must work for the FIRST 3 SECONDS of a ${platform || 'TikTok'} video when spoken out loud
- Each must be specific to the original topic — not generic
- Each must be genuinely good enough to go viral
- Vary the length — some punchy (under 10 words), some longer (up to 25 words)

Styles:
1. CURIOSITY GAP — creates an information gap the brain physically cannot ignore
2. CONTROVERSY — takes a bold stance that stops thumbs mid-scroll
3. RELATABILITY — so painfully accurate they feel called out
4. SHOCK STAT — a surprising number or fact that reframes everything
5. STORY OPEN — drops them into the middle of something already happening

Return ONLY valid JSON:
{
  "original": "${script || 'No script provided'}",
  "hooks": [
    {
      "style": "Curiosity Gap",
      "emoji": "🧠",
      "hook": "<rewritten hook>",
      "why": "<1 sentence on the specific psychological mechanism that makes this work>",
      "spokenDuration": "<estimated seconds to speak this out loud>"
    },
    {
      "style": "Controversy",
      "emoji": "🔥",
      "hook": "<rewritten hook>",
      "why": "<1 sentence on the specific psychological mechanism>",
      "spokenDuration": "<estimated seconds>"
    },
    {
      "style": "Relatability",
      "emoji": "😭",
      "hook": "<rewritten hook>",
      "why": "<1 sentence on the specific psychological mechanism>",
      "spokenDuration": "<estimated seconds>"
    },
    {
      "style": "Shock Stat",
      "emoji": "📊",
      "hook": "<rewritten hook>",
      "why": "<1 sentence on the specific psychological mechanism>",
      "spokenDuration": "<estimated seconds>"
    },
    {
      "style": "Story Open",
      "emoji": "🎬",
      "hook": "<rewritten hook>",
      "why": "<1 sentence on the specific psychological mechanism>",
      "spokenDuration": "<estimated seconds>"
    }
  ]
}

Return ONLY the JSON.`;

    } else if (analysisMode === 'flop') {
      prompt = `You are HookD's "Why Did This Flop" analyzer. You are the most brutally honest, funniest, most unhinged content critic alive. You have zero filter. You curse like a sailor. You make absurdly specific comparisons. But underneath the savagery you are a world class content strategist and your advice is extremely detailed, data-driven, and specific. Creators leave devastated but knowing exactly what to do next.

Video details:
- Filename: "${filename || 'video.mp4'}"
- File size: ${filesize || 0} bytes
- Platform: "${platform || 'TikTok'}"
- Creator's context: "${flop_context || 'No additional context provided'}"

Structure your response as:

1. THE VERDICT — One savage opening paragraph. Absolutely unhinged. Profanity welcome. Funny comparisons required. Make them laugh and cringe at the same time.

2. THE AUTOPSY — Find EVERY reason this flopped. No limit. Could be 4, could be 9. Each reason gets:
   - A funny savage roast of that specific issue
   - The actual data/psychology explaining why it killed the video
   - Ranked Critical/High/Medium

3. THE RESURRECTION — What to do EXACTLY differently next time. Specific numbers. Specific techniques. Specific psychology. Minimum 6 sentences. This needs to be so detailed and helpful it almost makes up for the roasting. Almost.

4. THE CLOSER — One final devastating funny sentence. Then "We're bullying you out of love ❤️"

Return ONLY valid JSON:
{
  "verdict": "<savage funny unhinged opening paragraph with profanity and specific comparisons>",
  "autopsy": [
    {
      "rank": 1,
      "reason": "<specific reason title>",
      "roast": "<2-3 sentences funny savage roast of this issue with profanity>",
      "data": "<specific data point, statistic, or psychology principle — be specific>",
      "impact": "Critical"
    }
  ],
  "resurrection": "<minimum 6 sentences of extremely specific, detailed, actionable advice — exact numbers, exact techniques, explain the psychology behind each recommendation>",
  "closer": "<one final savage funny sentence then 'We're bullying you out of love ❤️'>"
}

Return ONLY the JSON. Find every reason. Roast every reason. Fix every reason.`;
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
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
