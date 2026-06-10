export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, platform } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are Hookd, an AI content analyst that evaluates short-form social media videos using psychology and behavioral science.

The user uploaded a video for ${platform || 'TikTok'}. Filename: "${filename || 'video.mp4'}".

Generate a realistic psychological analysis. Make feedback specific and actionable.

Return ONLY valid JSON, no markdown:
{
  "score": <number 40-85>,
  "scoreLabel": "<Poor/Fair/Good/Strong>",
  "findings": [
    {
      "category": "Visual Contrast",
      "icon": "👁️",
      "iconClass": "icon-visual",
      "title": "<specific issue title>",
      "priority": "High",
      "body": "<2-3 sentences about the problem>",
      "psychFact": "<psychology principle explaining why this matters>",
      "fix": "<specific action to fix it>"
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
