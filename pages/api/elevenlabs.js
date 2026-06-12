// pages/api/elevenlabs.js
// HookD — ElevenLabs TTS route
// Maps persona ID → ElevenLabs voice ID, calls TTS, streams audio back as base64

const VOICE_MAP = {
  babe: {
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam — casual, warm, slightly condescending
    name: "Babe Just Get A Real Job",
    settings: {
      stability: 0.45,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true,
    },
  },
  boss: {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — clipped, professional, passive-aggressive
    name: "Per My Last Email",
    settings: {
      stability: 0.65,
      similarity_boost: 0.80,
      style: 0.15,
      use_speaker_boost: true,
    },
  },
  chef: {
    voiceId: "ErXwobaYiN019PkySvjV", // Antoni — intense, dramatic, slightly British
    name: "Hell's Creator",
    settings: {
      stability: 0.35,
      similarity_boost: 0.85,
      style: 0.55,
      use_speaker_boost: true,
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, personaId } = req.body;

  if (!text || !personaId) {
    return res.status(400).json({ error: "Missing text or personaId" });
  }

  const persona = VOICE_MAP[personaId];
  if (!persona) {
    return res.status(400).json({
      error: `Unknown persona: ${personaId}. Valid options: babe, boss, chef`,
    });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ElevenLabs API key not configured" });
  }

  // Trim text to ~500 chars for cost control — roast intros are punchy anyway
  const trimmedText = text.length > 500 ? text.slice(0, 497) + "..." : text;

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${persona.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: "eleven_monolingual_v1",
          voice_settings: persona.settings,
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", elevenRes.status, errText);
      return res.status(elevenRes.status).json({
        error: "ElevenLabs API error",
        detail: errText,
      });
    }

    // Convert audio buffer to base64 so the browser can play it directly
    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return res.status(200).json({
      audio: base64Audio,
      mimeType: "audio/mpeg",
      persona: persona.name,
    });
  } catch (err) {
    console.error("ElevenLabs route error:", err);
    return res.status(500).json({ error: "Failed to generate audio" });
  }
}
