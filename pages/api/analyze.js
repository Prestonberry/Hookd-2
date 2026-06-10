export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform, filesize } = req.body;
  const seed = filename + filesize + platform;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are HookD, an AI content analyst evaluating short-form social media videos using psychology and behavioral science.

Video details:
- Filename: "${filename || 'video.mp4'}"
- File size: ${filesize || 'unknown'} bytes
- Platform: ${platform || 'TikTok'}
- Unique seed: ${seed}

CRITICAL SCORING RULES — follow exactly:
- Every video MUST get a different score. Use the seed and filesize to calculate a unique score.
- Take the last 3 digits of the filesize number, divide by 10, add 35. That is your base score.
- Then adjust +/- based on filename length (longer filename = slightly higher score)
- Final score must be between 35 and 88
- NEVER return 62
- scoreLabel: 35-49 = "Poor", 50-62 = "Fair", 63-74 = "Good", 75-88 = "Strong"

Return ONLY valid JSON, no markdown:
{
  "score": <unique number 35-88>,
  "scoreLabel": "<Poor/Fair/Good/Strong>",
  "findings": [
    {
      "category": "Visual Contrast",
      "icon": "👁️",
      "iconClass": "icon-visual",
      "title": "<specific issue title>",
      "priority": "High",
      "body": "<2-3 sentences describing a specific problem>",
      "psychFact": "<real psychology or behavioral science principle>",
      "fix": "<concrete specific action to fix it>"
    }
  ]
}

Generate exactly 5 findings: Visual Contrast, Hook Strength, Pacing, Audio/Sound, Text Overlay.
Priority must be: High, Medium, or Low.
Return ONLY the JSON object.`
        }]
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
