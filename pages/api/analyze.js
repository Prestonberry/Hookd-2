export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    filename, platform, filesize, mode, script, flop_context, 
    frames, audioData, videoDuration, cutCount,
    cutTimestamps, avgSecsBetweenCuts,
    videoWidth, videoHeight, isVertical, hasAudio,
    audioType, railwaySummary, audioAnalysis: railwayAudioAnalysis,
    contentType
  } = req.body;
  
  const analysisMode = mode || 'analyze';

  try {
    // ============================================================
    // ASSEMBLYAI AUDIO ANALYSIS WITH AUDIO TYPE DETECTION
    // ============================================================
    async function analyzeAudio(audioBase64) {
      if (!audioBase64 || !process.env.ASSEMBLYAI_API_KEY) return null;
      
      try {
        // Upload audio
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

        // Request transcription WITH audio type detection
        const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            audio_url: upload_url,
            filter_profanity: false,
            disfluencies: true,
            speech_threshold: 0.5, // Higher threshold — only flag as speech if very confident
            audio_start_from: 0,
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
            
            // Detect if this is music/lyrics vs real speech
            // Music lyrics tend to be: short poetic phrases, rhyming, slow WPM, few filler words
            const looksLikeMusic = (
              wpm < 60 && // Very slow = likely music
              wordCount < 20 && // Few words = likely music
              text.length > 0
            );

            // Count filler words — only meaningful if it's speech
            const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually'];
            let fillerCount = 0;
            fillerWords.forEach(fw => {
              const matches = text.toLowerCase().match(new RegExp('\\b' + fw + '\\b', 'g'));
              if (matches) fillerCount += matches.length;
            });

            return {
              transcript: text.substring(0, 300),
              wordCount,
              wpm,
              fillerCount,
              duration: Math.round(duration),
              hasContent: wordCount > 3,
              looksLikeMusic,
              isSpeech: wordCount >= 10 && wpm >= 60 && !looksLikeMusic
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

    // ============================================================
    // BUILD PRECISE AUDIO CONTEXT
    // ============================================================
    let audioContext = '';
    
    if (hasAudio === false) {
      audioContext = `AUDIO: This video has NO audio track at all. It is completely silent. Give feedback about adding sound.`;
    } else if (!audioAnalysis) {
      audioContext = `AUDIO: Video has audio (confirmed by file analysis) but transcription was unavailable. Do not comment on speaking pace or lyrics. Do give feedback on the importance of audio strategy for ${platform || 'TikTok'}.`;
    } else if (!audioAnalysis.hasContent || audioAnalysis.wordCount <= 3) {
      audioContext = `AUDIO: Video has audio confirmed. AssemblyAI detected ${audioAnalysis.wordCount} words — this is likely background music, ambient sound, or sound effects with no voiceover. Duration: ${audioAnalysis.duration}s. DO NOT give feedback about speaking pace or voice quality. DO give feedback about whether adding a voiceover on top of the music would improve performance.`;
    } else if (audioAnalysis.looksLikeMusic) {
      audioContext = `AUDIO: AssemblyAI detected what appears to be SONG LYRICS or music (${audioAnalysis.wordCount} words at ${audioAnalysis.wpm} WPM — characteristic of music not speech). Transcript: "${audioAnalysis.transcript}". DO NOT critique this as the creator's speaking pace. DO give feedback about voiceover strategy — should they add their own voice on top of this music?`;
    } else {
      audioContext = `AUDIO: Creator is SPEAKING in this video (confirmed speech). Words: ${audioAnalysis.wordCount}. Pace: ${audioAnalysis.wpm} WPM (optimal for ${platform || 'TikTok'}: 130-160 WPM). Filler words: ${audioAnalysis.fillerCount}. Duration: ${audioAnalysis.duration}s. Transcript: "${audioAnalysis.transcript}". Give specific feedback on their actual speaking pace and filler words.`;
    }

    // ============================================================
    // BUILD PRECISE VIDEO DIMENSIONS CONTEXT
    // ============================================================
    let orientationContext = '';
    if (videoWidth && videoHeight) {
      const orientation = videoHeight > videoWidth ? 'VERTICAL' : videoWidth > videoHeight ? 'HORIZONTAL/LANDSCAPE' : 'SQUARE';
      const aspectRatio = `${videoWidth}x${videoHeight}`;
      const isOptimal = videoHeight > videoWidth; // vertical is optimal for TikTok/Reels
      orientationContext = `VIDEO DIMENSIONS: Confirmed ${orientation} video (${aspectRatio} pixels). ${isOptimal ? 'Good — vertical is correct for ' + (platform || 'TikTok') + '. Do NOT suggest they reshoot in vertical.' : 'WARNING: This is ' + orientation + ' format. ' + (platform || 'TikTok') + ' is a vertical-first platform — this is a real problem to address.'}`;
    } else if (isVertical !== undefined) {
      orientationContext = `VIDEO ORIENTATION: ${isVertical ? 'VERTICAL (correct for ' + (platform || 'TikTok') + ') — do NOT suggest reshoot in vertical' : 'HORIZONTAL — this is a problem for ' + (platform || 'TikTok') + ' which is vertical-first'}.`;
    } else {
      orientationContext = `VIDEO ORIENTATION: Unknown — do not make assumptions about orientation.`;
    }

    // ============================================================
    // BUILD PRECISE PACING CONTEXT  
    // ============================================================
    let pacingContext = '';
    if (railwaySummary) {
      // Use the full FFmpeg analysis from Railway — this is 100% accurate
      pacingContext = railwaySummary;
    } else if (videoDuration && videoDuration > 0) {
      if (cutCount !== undefined && cutCount !== null) {
        pacingContext = `PACING: Video is ${videoDuration} seconds long. Estimated cuts: ${cutCount}. NOTE: This is a browser-side estimate — camera movement may cause overcounting. Do not make very confident claims about exact cut count. Optimal for ${platform || 'TikTok'}: 1 cut every 1-2 seconds.`;
      } else {
        pacingContext = `PACING: Video is ${videoDuration} seconds long. Cut count unavailable.`;
      }
    } else {
      pacingContext = `PACING: Duration unknown — do not make definitive claims about video length or cut count.`;
    }

    // ============================================================
    // BUILD PROMPTS
    // ============================================================
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
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: frame }
          });
        });
      }

      const contentTypeInstructions = {
        'talking': `CONTENT TYPE: TALKING TO CAMERA
The creator is speaking directly to the viewer. This covers tutorials, advice, opinions, education, fitness tips, book reviews, commentary — anything where the person IS the content.
PRIORITY DIMENSIONS:
- Eye contact with camera lens (not screen) — critical for connection
- Energy, delivery, and expressiveness — flat delivery loses viewers fast
- Hook statement in first 3 seconds — did they say something compelling immediately?
- Face lighting — is the face clear and well-lit?
- Audio clarity — is the voice easy to hear and understand?
- Speaking pace — too slow loses attention, too fast loses comprehension
- Body language and gestures — stiff or natural and engaging?
- Caption strategy — are captions present for muted viewers?
- Background — clean and intentional or distracting?
DO NOT heavily critique the environment or aesthetic unless it is actively hurting the video. The PERSON and their DELIVERY is what matters here.`,

        'footage': `CONTENT TYPE: FOOTAGE / VLOG / DAY IN THE LIFE
The content is made up of clips showing things happening — environments, experiences, activities, travel, room tours, hauls, behind the scenes. The world is the content, not a talking head.
PRIORITY DIMENSIONS:
- Visual storytelling — does it tell a clear story without needing words?
- Hook — does the first frame create instant curiosity about what's happening?
- Pacing and cuts — do cuts create energy and narrative momentum?
- Lighting across different settings — is it consistently watchable?
- Color palette and visual consistency
- Music choice and whether it matches the energy
- Text overlays guiding the narrative at key moments
- Thumbnail potential — is there a visually compelling frame?
DO NOT critique speaking delivery unless there is a voiceover. Focus on VISUAL STORYTELLING and PACING.`,

        'skit': `CONTENT TYPE: SKIT / COMEDY / PERFORMANCE / TRENDS
The creator is performing — acting out a scenario, doing a comedy bit, participating in a trend, reacting, or playing a character.
PRIORITY DIMENSIONS:
- Hook energy in the first 0.5 seconds — performance needs to grab immediately
- Comedic or dramatic timing — is the punchline, reaction, or reveal timed correctly?
- Energy level — does the performance have enough energy for the platform?
- Facial expressions and commitment to the bit
- Pattern interrupts and unexpected moments
- Sound design and audio effects if used
- Trend execution — if it's a trend format, is it executed clearly?
- Rewatchability — is there a reason to watch it again?
DO NOT apply tutorial or business metrics. Focus on PERFORMANCE, TIMING, and ENTERTAINMENT VALUE.`,

        'product': `CONTENT TYPE: PRODUCT / BRAND / PROMOTION
The video is promoting, showcasing, or reviewing a product, service, or brand. This includes business content, ads, testimonials, unboxings, and reviews.
PRIORITY DIMENSIONS:
- Value proposition clarity — does the viewer understand what's being offered within 3 seconds?
- Product visibility — is what's being shown clearly seen and well-lit?
- Trust signals — does it look credible and professional?
- Hook — does it open with a problem being solved or a compelling benefit?
- Call to action — is there a clear next step for the viewer?
- Text overlays highlighting key benefits or offers
- Pacing — does it hold attention long enough to deliver the message?
Focus on CONVERSION, CLARITY, and CREDIBILITY.`,

        'aesthetic': `CONTENT TYPE: AESTHETIC / VIBE / MUSIC / ARTISTIC
The content is mood-driven — visual aesthetics, music videos, artistic edits, fashion, or content where the feeling IS the point. There may be no talking at all.
PRIORITY DIMENSIONS:
- Visual cohesion — do all frames feel like they belong together?
- Color grading and consistency across the video
- Music sync — do cuts align with beats or musical moments?
- Mood and atmosphere — is the intended feeling clear and consistent?
- Visual contrast and composition in each frame
- Uniqueness — does it stand out in a feed of similar content?
- Pacing relative to the music and mood
DO NOT apply talking head, tutorial, or business metrics here. Focus entirely on MOOD, AESTHETICS, and VISUAL IMPACT.`
      };
      const contentInstruction = contentTypeInstructions[contentType] || `CONTENT TYPE: General short-form content. Analyze all dimensions equally.`;

      prompt = `You are HookD, the most brutally honest AI content analyst on the internet. No filter. Profanity welcome. Savage and funny. But you back everything up with SPECIFIC observations from the actual data you have — not guesses.

REAL DATA YOU HAVE ABOUT THIS VIDEO:
${frames && frames.length > 0 ? `VISUAL: You have been given ${frames.length} actual frames extracted from the video. You can SEE the real content. Reference SPECIFIC things: exact colors, exact backgrounds, exact lighting, what objects are visible, text on screen, whether a face is present, clothing colors, room details.` : 'VISUAL: No frames available.'}

${orientationContext}

${audioContext}

${pacingContext}

Video file: "${filename || 'video.mp4'}" | Platform: ${platform || 'TikTok'}
Use EXACTLY: score ${finalScore}, scoreLabel "${scoreLabel}"

${contentInstruction}

CRITICAL RULES:
1. Only state things as fact if you have confirmed data above. If uncertain, say "appears to" or "based on the frames."
2. If video is confirmed vertical — DO NOT suggest shooting vertical. It already is.
3. If audio is music not speech — DO NOT critique speaking pace.
4. If cut count may be underestimated — say "at least X cuts detected" not "zero cuts."
5. Reference SPECIFIC things you actually see in the frames — colors, objects, settings.
6. Be savage, funny, and use profanity — but make sure every roast is based on something real you observed.
7. DO NOT suggest buying new equipment, new lights, or new products. Work with what they have. Suggest free alternatives (move a lamp, open a window, use their phone flashlight).
8. DO NOT assume the creator's intended vibe or aesthetic. You can observe what is there, but never say "you were going for X but failed." Analyze what exists, not what you think they wanted.
9. For text overlays and captions — tell them WHAT TYPE of text is needed and WHY, not the exact words. Say "add a text hook in the first frame" not "write THIS EXACT CAPTION." The creator knows their content and audience — you are the coach pointing direction, not the creative director writing their content.
10. For CTAs — identify that one is missing, explain exactly why it's hurting their performance with data, tell them what CATEGORY of CTA fits this content (follow, comment, share, duet), then end with a line like "You know your audience — bring your personality to it." Never write the actual CTA for them. Prompt them to think of one that feels natural to their brand.
11. For transitions — only suggest transition TYPES that match the video's existing style and energy. Do not suggest fades or dissolves for high-energy content. Do not suggest rapid cuts for slow atmospheric content.
12. For captions/text — do NOT suggest putting different text every 1-2 seconds. That is not standard practice. Suggest strategic text placement at key moments only.
13. Your job is to identify problems and point the direction. The creator's job is to bring their own creative ideas to the fix. Be the initiator, not the replacement.

Find EVERY problem across all dimensions: visual contrast, color, hook, first 3 seconds, lighting, background, body language, text overlays, audio strategy, pacing, call to action, platform optimization, thumbnail potential, emotional engagement.

For EACH finding:
- roast: 3-4 sentences savage funny roast with profanity. Reference SPECIFIC things from your data — actual colors you see, actual audio data, actual dimensions. Make it feel like you watched every second.
- psychFact: real behavioral science with specific stats/numbers
- fix: detailed actionable direction — tell them WHAT needs to change and WHY it matters with data, point them toward the TYPE of solution, then hand it back to them with a line that prompts their own creativity (e.g. "You know your audience and your brand — bring that to this fix"). Do NOT write specific captions, CTAs, or creative copy for them. Do NOT suggest buying equipment. Minimum 4 sentences. End: "We're bullying you out of love ❤️"

Sort: Critical → High → Medium → Polish. Generate 6-10 findings.

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "score": ${finalScore},
  "scoreLabel": "${scoreLabel}",
  "totalIssues": 7,
  "findings": [
    {
      "rank": 1,
      "importance": "Critical",
      "category": "Hook Strength",
      "icon": "🎯",
      "iconClass": "icon-hook",
      "title": "Specific title based on what you actually see",
      "roast": "Savage specific roast referencing actual observed data",
      "psychFact": "Real psychology with numbers",
      "fix": "Detailed specific fix. We're bullying you out of love ❤️"
    }
  ]
}`;

      messageContent.push({ type: 'text', text: prompt });

    } else if (analysisMode === 'rehook') {
      prompt = `You are HookD's Re-Hook engine. You are a world class viral content strategist.

Rewrite this hook 5 ways using proven psychological frameworks:
Original: "${script || 'No script provided'}"
Platform: "${platform || 'TikTok'}"

Rules:
- Each must be completely different in structure and opening word
- Must work spoken in the first 3 seconds
- Must be specific to the original topic — not generic
- Must be genuinely good enough to go viral
- Vary length: some punchy under 8 words, some up to 20 words

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "original": "the original hook text here",
  "hooks": [
    {"style": "Curiosity Gap", "emoji": "🧠", "hook": "rewritten hook", "why": "specific psychological mechanism", "spokenDuration": "2s"},
    {"style": "Controversy", "emoji": "🔥", "hook": "rewritten hook", "why": "specific psychological mechanism", "spokenDuration": "2s"},
    {"style": "Relatability", "emoji": "😭", "hook": "rewritten hook", "why": "specific psychological mechanism", "spokenDuration": "2s"},
    {"style": "Shock Stat", "emoji": "📊", "hook": "rewritten hook", "why": "specific psychological mechanism", "spokenDuration": "2s"},
    {"style": "Story Open", "emoji": "🎬", "hook": "rewritten hook", "why": "specific psychological mechanism", "spokenDuration": "2s"}
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

      prompt = `You are HookD's Why Did This Flop analyzer. Most brutally honest content critic alive. Zero filter. Profanity required. Funny specific comparisons. But resurrection advice is extremely detailed and genuinely helpful.

REAL DATA ABOUT THIS VIDEO:
${frames && frames.length > 0 ? `VISUAL: ${frames.length} real frames from the video. Reference SPECIFIC things you see.` : 'VISUAL: No frames.'}
${orientationContext}
${audioContext}
${pacingContext}

Video: "${filename || 'video.mp4'}" | Platform: "${platform || 'TikTok'}"
Creator context: "${flop_context || 'No context provided'}"

CRITICAL RULES: Only state as fact what you have confirmed data for. Reference specific things you actually see in frames. Don't guess orientation, don't misidentify music as speech. Do NOT suggest buying new equipment or products. Do NOT assume their intended vibe. Do NOT write specific captions or CTAs for them — identify what's missing and point the direction, let them create the content. Be the coach, not the creative director.

RESPOND WITH ONLY VALID JSON. NO TEXT BEFORE OR AFTER. START WITH { END WITH }

{
  "verdict": "Savage opening referencing specific things you actually observe in the data",
  "autopsy": [
    {"rank": 1, "reason": "Specific reason title", "roast": "Funny savage specific roast", "data": "Real data or psychology stat", "impact": "Critical"},
    {"rank": 2, "reason": "Specific reason title", "roast": "Funny savage specific roast", "data": "Real data or psychology stat", "impact": "High"},
    {"rank": 3, "reason": "Specific reason title", "roast": "Funny savage specific roast", "data": "Real data or psychology stat", "impact": "High"},
    {"rank": 4, "reason": "Specific reason title", "roast": "Funny savage specific roast", "data": "Real data or psychology stat", "impact": "Medium"}
  ],
  "resurrection": "Minimum 6 sentences of extremely specific actionable advice based on confirmed data. Exact numbers. Exact steps.",
  "closer": "One final savage funny sentence based on something specific you observed. We're bullying you out of love ❤️"
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
      console.error('No JSON in response:', text.substring(0, 200));
      return res.status(500).json({ error: 'Invalid response format' });
    }

    const result = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
