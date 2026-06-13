import { useState, useRef } from 'react';
import Head from 'next/head';

// Extract frames — 1 per second up to 30
async function extractFrames(file, maxFrames = 30) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);
    const frames = [];
    video.src = url;
    video.muted = true;
    video.addEventListener('loadedmetadata', () => {
      canvas.width = 480;
      canvas.height = Math.round(480 * (video.videoHeight / video.videoWidth)) || 854;
      const duration = video.duration;
      const numFrames = Math.min(maxFrames, Math.ceil(duration));
      const timestamps = Array.from({ length: numFrames }, (_, i) =>
        Math.min((duration / numFrames) * i + 0.1, duration - 0.1)
      );
      let index = 0;
      const captureNext = () => {
        if (index >= timestamps.length) { URL.revokeObjectURL(url); resolve(frames); return; }
        video.currentTime = timestamps[index];
      };
      video.addEventListener('seeked', () => {
        try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); frames.push(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]); } catch (e) {}
        index++; captureNext();
      });
      captureNext();
    });
    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve([]); });
    setTimeout(() => resolve(frames), 30000);
  });
}

async function getVideoMetadata(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.addEventListener('loadedmetadata', () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: Math.round(video.duration), isVertical: video.videoHeight > video.videoWidth });
      URL.revokeObjectURL(url);
    });
    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(null); });
    setTimeout(() => resolve(null), 5000);
  });
}

// Extract audio as base64 for AssemblyAI
async function extractAudio(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try { audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0)); } catch (e) { return { hasAudio: false, audioBase64: null }; }
    const channelData = audioBuffer.getChannelData(0);
    let maxAmp = 0;
    for (let i = 0; i < Math.min(channelData.length, 10000); i++) maxAmp = Math.max(maxAmp, Math.abs(channelData[i]));
    if (maxAmp < 0.001) return { hasAudio: false, audioBase64: null };
    // Convert to base64 for AssemblyAI
    const uint8 = new Uint8Array(arrayBuffer);
    const binary = uint8.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    const audioBase64 = btoa(binary);
    return { hasAudio: true, audioBase64 };
  } catch (e) { return { hasAudio: false, audioBase64: null }; }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [platform, setPlatform] = useState('TikTok');
  const [contentType, setContentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();
  const replaceInputRef = useRef();

  const [hookScript, setHookScript] = useState('');
  const [hookContext, setHookContext] = useState('');
  const [hookResults, setHookResults] = useState(null);
  const [hookLoading, setHookLoading] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResults(null);
    setError(false);
  };

  const steps = ['Extracting frames...', 'Getting video info...', 'Transcribing audio...', 'Analyzing your content...', 'Writing recommendations...'];

  const analyzeVideo = async () => {
    setLoading(true);
    setError(false);
    setLoadingStep(1);
    setLoadingMsg(steps[0]);
    try {
      const frames = await extractFrames(videoFile, 20);
      setLoadingStep(2); setLoadingMsg(steps[1]);
      const meta = await getVideoMetadata(videoFile);
      setLoadingStep(3); setLoadingMsg(steps[2]);
      const { hasAudio } = await extractAudio(videoFile);
      setLoadingStep(4); setLoadingMsg(steps[3]);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze',
          filename: videoFile?.name || 'video.mp4',
          platform, contentType,
          filesize: videoFile?.size || 0,
          frames, hasAudio,
          videoDuration: meta?.duration || 0,
          videoWidth: meta?.width || 0,
          videoHeight: meta?.height || 0,
          isVertical: meta?.isVertical ?? true,
          cutCount: 0
        })
      });

      setLoadingStep(5); setLoadingMsg(steps[4]);
      if (!res.ok) throw new Error('Analysis failed');
      setResults(await res.json());
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false); setLoadingStep(0); setLoadingMsg('');
    }
  };

  const reHook = async () => {
    if (!hookScript.trim()) return;
    setHookLoading(true); setHookResults(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'rehook', script: hookScript, platform, hookContext })
      });
      if (!res.ok) throw new Error('Failed');
      setHookResults(await res.json());
    } catch (err) { console.error(err); }
    finally { setHookLoading(false); }
  };

  const resetAnalyze = () => {
    setResults(null); setVideoFile(null); setVideoUrl(null);
    setError(false); setContentType('');
  };

  const ic = (imp) => {
    if (!imp) return '#888';
    const i = imp.toLowerCase();
    if (i.includes('critical')) return '#FF3B00';
    if (i.includes('high')) return '#FF8C00';
    if (i.includes('medium')) return '#FFD600';
    return '#00E87A';
  };

  const scoreColor = (score) => score >= 75 ? '#00E87A' : score >= 63 ? '#FFD600' : score >= 50 ? '#FF8C00' : '#FF3B00';
  const copy = (t) => navigator.clipboard.writeText(t);

  const contentTypes = [
    { id: 'talking', emoji: '🗣️', label: 'Talking to Camera', desc: "You're speaking to the viewer — tutorials, advice, opinions, fitness tips, education, reviews" },
    { id: 'footage', emoji: '🎬', label: 'Footage / Vlog', desc: 'Clips of things happening — day in the life, travel, room tours, behind the scenes, hauls' },
    { id: 'skit', emoji: '😂', label: 'Skit / Comedy / Trends', desc: "You're performing — comedy bits, skits, trend participation, reactions, characters" },
    { id: 'product', emoji: '🛍️', label: 'Product / Brand', desc: 'Promoting or showcasing something — ads, reviews, unboxings, business content' },
    { id: 'aesthetic', emoji: '🎵', label: 'Aesthetic / Vibe', desc: 'Mood-driven content — music videos, artistic edits, fashion, visual storytelling with no talking' },
  ];

  return (
    <>
      <Head>
        <title>HookD — Know Why They Stop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo">Hook<span>D</span></div>
        <div className="nav-tag">Beta</div>
      </nav>

      <div className="tabs-wrapper">
        <div className="tabs">
          <button className={`tab ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => setActiveTab('analyze')}>🎬 Analyze</button>
          <button className={`tab ${activeTab === 'rehook' ? 'active' : ''}`} onClick={() => setActiveTab('rehook')}>🎣 Re-Hook Me</button>
        </div>
      </div>

      {/* ANALYZE */}
      {activeTab === 'analyze' && (
        <>
          {!results && !loading && !videoFile && (
            <section className="hero">
              <div className="hero-eyebrow">AI-Powered Content Analysis</div>
              <h1>Know exactly why they <em>stop</em> scrolling.</h1>
              <p>Upload your video. Get a complete performance report — what's working, what's killing your reach, and exactly how to fix it.</p>
            </section>
          )}
          <section className="upload-section">
            {!videoFile && !loading && (
              <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current.click()}>
                <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                <div className="upload-icon">🎬</div>
                <h3>Drop your video here</h3>
                <p>We analyze visuals, audio, and pacing. For real.</p>
                <div className="file-types">{['MP4', 'MOV', 'AVI', 'WEBM'].map(t => <span key={t} className="file-tag">{t}</span>)}</div>
                <div className="analysis-tags">
                  <span className="atag">👁️ 30 Visual Frames</span>
                  <span className="atag">🎵 Full Transcription</span>
                  <span className="atag">📊 Sentiment Analysis</span>
                </div>
              </div>
            )}

            {videoFile && !loading && !results && (
              <>
                <div className="video-preview">
                  <video src={videoUrl} controls />
                  <div className="video-info">
                    <div>
                      <div className="video-filename">{videoFile.name}</div>
                      <div className="video-size">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button className="replace-btn" onClick={() => replaceInputRef.current.click()}>↩ Replace</button>
                    <input ref={replaceInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                  </div>
                </div>

                <div className="platform-select">
                  <h4>Content Type</h4>
                  <div className="content-type-grid">
                    {contentTypes.map(ct => (
                      <button key={ct.id} className={`content-type-btn ${contentType === ct.id ? 'active' : ''}`} onClick={() => setContentType(ct.id)}>
                        <div className="ct-top"><span className="ct-emoji">{ct.emoji}</span><span className="ct-label">{ct.label}</span></div>
                        <span className="ct-desc">{ct.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="platform-select" style={{ marginTop: 20 }}>
                  <h4>Target Platform</h4>
                  <div className="platform-options">
                    {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map(p => (
                      <button key={p} className={`platform-btn ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
                    ))}
                  </div>
                </div>

                <button className="analyze-btn" onClick={analyzeVideo} disabled={!contentType}>
                  {error ? 'Something went wrong — try again' : contentType ? 'Analyze My Video →' : 'Select a content type first'}
                </button>
              </>
            )}

            {loading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <h3>{loadingMsg || 'Analyzing...'}</h3>
                <p>This can take up to a minute — hang tight, it's worth it.</p>
                <div className="loading-steps">
                  {steps.map((s, i) => (
                    <div key={i} className={`loading-step ${loadingStep === i + 1 ? 'active' : loadingStep > i + 1 ? 'done' : ''}`}>
                      <div className="step-dot" />{s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {results && (
            <section className="results-section">
              <div className="results-header">
                <div>
                  <h2>Your Content Report 📊</h2>
                  <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Platform: {platform} · {results.totalIssues || results.findings?.length} findings</p>
                </div>
              </div>

              {/* Two scores */}
              <div className="scores-row">
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(results.score) }}>{results.score}</div>
                  <div className="score-title">Scroll Score</div>
                  <div className="score-subtitle">How likely this stops the scroll</div>
                  <div className="score-label-badge" style={{ background: scoreColor(results.score) + '22', color: scoreColor(results.score) }}>{results.scoreLabel}</div>
                </div>
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(results.followerScore) }}>{results.followerScore}</div>
                  <div className="score-title">Follower Score</div>
                  <div className="score-subtitle">How likely this converts to follows</div>
                  <div className="score-label-badge" style={{ background: scoreColor(results.followerScore) + '22', color: scoreColor(results.followerScore) }}>{results.followerScoreLabel}</div>
                </div>
              </div>

              <div className="feedback-grid">
                {results.findings?.map((f, i) => (
                  <div key={i} className="feedback-card">
                    <div className="card-header">
                      <div className="card-icon-wrap" style={{ background: ic(f.importance) + '22' }}>
                        <span style={{ fontSize: 20 }}>{f.icon || '⚠️'}</span>
                      </div>
                      <div className="card-title-group">
                        <div className="card-category" style={{ color: ic(f.importance) }}>#{f.rank} — {f.importance}</div>
                        <div className="card-title">{f.title}</div>
                      </div>
                    </div>
                    <div className="psych-fact"><strong>Why it matters:</strong> {f.psychFact}</div>
                    <div className="fix-label">→ WHAT TO DO</div>
                    <div className="fix-text">{f.fix}</div>
                  </div>
                ))}
              </div>

              <div className="rehook-prompt">
                <div className="rehook-prompt-icon">🎣</div>
                <div>
                  <div className="rehook-prompt-title">Want to fix your hook?</div>
                  <div className="rehook-prompt-sub">Paste your script and we'll rewrite it 5 ways</div>
                </div>
                <button className="rehook-prompt-btn" onClick={() => setActiveTab('rehook')}>Re-Hook Me →</button>
              </div>

              <div className="result-actions">
                <button className="replace-result-btn" onClick={resetAnalyze}>↩ Try another video</button>
                <button className="retry-btn" onClick={resetAnalyze}>+ New Analysis</button>
              </div>
            </section>
          )}
        </>
      )}

      {/* RE-HOOK */}
      {activeTab === 'rehook' && (
        <section className="tool-section">
          <div className="tool-hero">
            <div className="tool-emoji">🎣</div>
            <h2>Re-Hook Me</h2>
            <p>Paste your hook. We rewrite it 5 ways using proven psychological frameworks. Creators screenshot this. You're welcome.</p>
          </div>
          <div className="platform-select" style={{ marginBottom: 16 }}>
            <h4>Target Platform</h4>
            <div className="platform-options">
              {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map(p => (
                <button key={p} className={`platform-btn ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
              ))}
            </div>
          </div>
          <textarea className="script-input" placeholder="Paste your hook or opening line here..." value={hookScript} onChange={(e) => setHookScript(e.target.value)} rows={3} />
          <textarea className="script-input" placeholder="Optional: What is this video actually about? Give us context so we preserve your exact message." value={hookContext} onChange={(e) => setHookContext(e.target.value)} rows={3} style={{ marginTop: 10, borderColor: '#333' }} />
          <button className="analyze-btn" onClick={reHook} disabled={hookLoading || !hookScript.trim()}>{hookLoading ? 'Rewriting...' : 'Re-Hook Me →'}</button>
          {hookLoading && <div className="loading-state"><div className="loading-spinner" /><h3>Rewriting 5 ways...</h3></div>}
          {hookResults && (
            <div className="hook-results">
              <div className="hook-original">
                <div className="hook-original-label">Your original</div>
                <div className="hook-original-text">"{hookResults.original}"</div>
              </div>
              <div className="hooks-grid">
                {hookResults.hooks?.map((h, i) => (
                  <div key={i} className="hook-card">
                    <div className="hook-card-header">
                      <span className="hook-emoji">{h.emoji}</span>
                      <span className="hook-style">{h.style}</span>
                      <span className="hook-duration">{h.spokenDuration}</span>
                    </div>
                    <div className="hook-text">"{h.hook}"</div>
                    <div className="hook-why">{h.why}</div>
                    <button className="copy-btn" onClick={() => copy(h.hook)}>Copy ↗</button>
                  </div>
                ))}
              </div>
              <button className="retry-btn" style={{ width: '100%', marginTop: 24 }} onClick={() => { setHookResults(null); setHookScript(''); }}>+ Rewrite Another Hook</button>
            </div>
          )}
        </section>
      )}

      {!results && !hookResults && activeTab === 'analyze' && !videoFile && !loading && (
        <section className="principles-strip">
          <h3>What we actually analyze</h3>
          <div className="principles-grid">
            {[
              { icon: '👁️', name: '30 Visual Frames', desc: 'One frame per second so Claude sees your entire video like a flipbook — not just 5 snapshots.' },
              { icon: '🎵', name: 'Full Transcription', desc: 'AssemblyAI transcribes every word, measures your pace in WPM, and counts filler words.' },
              { icon: '📊', name: 'Sentiment Analysis', desc: 'We analyze the emotional arc of your speech — positive, negative, neutral — to see if it matches your content goal.' },
              { icon: '📐', name: 'Exact Dimensions', desc: 'We read your actual video dimensions so we never wrongly suggest shooting vertical.' },
              { icon: '🎯', name: 'Two Scores', desc: 'Scroll Score measures hook strength. Follower Score measures how likely viewers convert to followers.' },
              { icon: '🏆', name: 'Ranked by Impact', desc: 'Top 5 findings ranked by importance so you always know exactly what to fix first.' },
            ].map((p, i) => (
              <div key={i} className="principle-item">
                <div className="p-icon">{p.icon}</div>
                <div className="p-name">{p.name}</div>
                <div className="p-desc">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A; color: #FAFAFA; font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #2A2A2A; position: sticky; top: 0; background: rgba(10,10,10,0.95); backdrop-filter: blur(10px); z-index: 100; }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
        .logo span { color: #FF3B00; }
        .nav-tag { background: #FF3B00; color: #fff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
        .tabs-wrapper { border-bottom: 1px solid #2A2A2A; padding: 0 40px; background: #0A0A0A; position: sticky; top: 65px; z-index: 99; }
        .tabs { display: flex; gap: 4px; max-width: 760px; margin: 0 auto; overflow-x: auto; }
        .tab { background: transparent; border: none; color: #888; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; padding: 16px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; }
        .tab:hover { color: #FAFAFA; }
        .tab.active { color: #FF3B00; border-bottom-color: #FF3B00; }
        .hero { padding: 80px 40px 60px; max-width: 900px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #FF3B00; margin-bottom: 24px; }
        .hero h1 { font-family: 'Syne', sans-serif; font-size: clamp(38px, 6vw, 68px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; }
        .hero h1 em { font-style: normal; color: #FF3B00; }
        .hero p { font-size: 17px; color: #888; line-height: 1.7; max-width: 560px; margin: 0 auto; }
        .upload-section { max-width: 760px; margin: 0 auto; padding: 0 40px 80px; }
        .tool-section { max-width: 760px; margin: 0 auto; padding: 40px 40px 80px; }
        .tool-hero { text-align: center; margin-bottom: 32px; }
        .tool-emoji { font-size: 48px; margin-bottom: 16px; }
        .tool-hero h2 { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; }
        .tool-hero p { color: #888; font-size: 15px; line-height: 1.7; max-width: 500px; margin: 0 auto; }
        .upload-zone { border: 2px dashed #2A2A2A; border-radius: 16px; padding: 60px 40px; text-align: center; cursor: pointer; transition: all 0.2s; background: #141414; }
        .upload-zone:hover, .upload-zone.drag-over { border-color: #FF3B00; background: rgba(255,59,0,0.05); }
        .upload-icon { width: 56px; height: 56px; background: #1E1E1E; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
        .upload-zone h3 { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .upload-zone p { color: #888; font-size: 14px; }
        .file-types { margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .file-tag { background: #1E1E1E; border: 1px solid #2A2A2A; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #888; }
        .analysis-tags { margin-top: 14px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .atag { background: rgba(255,59,0,0.1); border: 1px solid rgba(255,59,0,0.3); color: #FF3B00; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .video-preview { margin-top: 24px; border-radius: 12px; overflow: hidden; background: #141414; border: 1px solid #2A2A2A; }
        .video-preview video { width: 100%; max-height: 380px; object-fit: contain; display: block; background: #000; }
        .video-info { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .video-filename { font-size: 14px; font-weight: 500; word-break: break-all; }
        .video-size { font-size: 12px; color: #888; margin-top: 2px; }
        .replace-btn { background: transparent; border: 1px solid #2A2A2A; color: #888; padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; white-space: nowrap; flex-shrink: 0; }
        .replace-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .platform-select { margin-top: 20px; }
        .platform-select h4 { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .platform-options { display: flex; gap: 10px; flex-wrap: wrap; }
        .platform-btn { background: #141414; border: 1px solid #2A2A2A; color: #FAFAFA; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .platform-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .platform-btn.active { background: #FF3B00; border-color: #FF3B00; color: white; }
        .content-type-grid { display: flex; flex-direction: column; gap: 10px; }
        .content-type-btn { background: #141414; border: 1px solid #2A2A2A; color: #888; padding: 14px 16px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 6px; text-align: left; width: 100%; }
        .content-type-btn:hover { border-color: #FF3B00; color: #FAFAFA; background: rgba(255,59,0,0.05); }
        .content-type-btn.active { background: rgba(255,59,0,0.12); border-color: #FF3B00; color: #FF3B00; }
        .ct-top { display: flex; align-items: center; gap: 10px; }
        .ct-emoji { font-size: 20px; flex-shrink: 0; }
        .ct-label { font-size: 14px; font-weight: 600; color: inherit; }
        .ct-desc { font-size: 12px; color: #666; line-height: 1.4; padding-left: 30px; }
        .content-type-btn.active .ct-desc { color: rgba(255,59,0,0.7); }
        .analyze-btn { display: block; width: 100%; margin-top: 20px; padding: 18px; background: #FF3B00; color: white; border: none; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .analyze-btn:hover { background: #e03400; }
        .analyze-btn:disabled { background: #2A2A2A; color: #555; cursor: not-allowed; }
        .script-input { width: 100%; background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 16px; color: #FAFAFA; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; resize: vertical; transition: border-color 0.2s; }
        .script-input:focus { outline: none; border-color: #FF3B00; }
        .script-input::placeholder { color: #555; }
        .loading-state { text-align: center; padding: 60px 20px; }
        .loading-spinner { width: 48px; height: 48px; border: 3px solid #2A2A2A; border-top-color: #FF3B00; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state h3 { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .loading-state p { color: #FF3B00; font-size: 14px; font-weight: 500; }
        .loading-steps { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin-left: auto; margin-right: auto; }
        .loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #888; text-align: left; padding: 10px 14px; background: #141414; border-radius: 8px; border: 1px solid #2A2A2A; opacity: 0.4; transition: all 0.3s; }
        .loading-step.active { opacity: 1; color: #FAFAFA; border-color: #FF3B00; }
        .loading-step.done { opacity: 1; color: #00E87A; border-color: rgba(0,232,122,0.3); }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .results-section { max-width: 760px; margin: 0 auto; padding: 40px 40px 80px; }
        .results-header { margin-bottom: 24px; }
        .results-header h2 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .scores-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
        .score-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 24px; text-align: center; }
        .score-number { font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800; line-height: 1; margin-bottom: 8px; }
        .score-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .score-subtitle { font-size: 12px; color: #666; line-height: 1.4; margin-bottom: 12px; }
        .score-label-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .feedback-grid { display: flex; flex-direction: column; gap: 16px; }
        .feedback-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 24px; }
        .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .card-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .card-title-group { flex: 1; }
        .card-category { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; line-height: 1.3; }
        .psych-fact { background: #1E1E1E; border-left: 3px solid #444; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #888; line-height: 1.6; margin-bottom: 16px; }
        .psych-fact strong { color: #FAFAFA; font-weight: 600; }
        .fix-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #00E87A; margin-bottom: 8px; }
        .fix-text { font-size: 14px; color: #FAFAFA; line-height: 1.8; background: rgba(0,232,122,0.06); border: 1px solid rgba(0,232,122,0.2); padding: 14px 16px; border-radius: 8px; }
        .rehook-prompt { display: flex; align-items: center; gap: 16px; background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px 24px; margin-top: 24px; flex-wrap: wrap; }
        .rehook-prompt-icon { font-size: 28px; }
        .rehook-prompt-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; }
        .rehook-prompt-sub { font-size: 13px; color: #888; margin-top: 2px; }
        .rehook-prompt-btn { margin-left: auto; background: #FF3B00; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .result-actions { display: flex; gap: 12px; margin-top: 32px; }
        .replace-result-btn { flex: 1; padding: 16px; background: transparent; color: #888; border: 1px solid #2A2A2A; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; }
        .replace-result-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .retry-btn { flex: 1; padding: 16px; background: #FF3B00; color: white; border: none; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; }
        .retry-btn:hover { background: #e03400; }
        .hook-results { margin-top: 24px; }
        .hook-original { background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .hook-original-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
        .hook-original-text { font-size: 16px; color: #888; font-style: italic; }
        .hooks-grid { display: flex; flex-direction: column; gap: 16px; }
        .hook-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px; }
        .hook-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .hook-emoji { font-size: 22px; }
        .hook-style { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #FF3B00; flex: 1; }
        .hook-duration { font-size: 12px; color: #555; background: #1E1E1E; padding: 3px 8px; border-radius: 6px; }
        .hook-text { font-size: 18px; font-weight: 600; line-height: 1.5; margin-bottom: 12px; }
        .hook-why { font-size: 13px; color: #888; line-height: 1.6; margin-bottom: 16px; }
        .copy-btn { background: transparent; border: 1px solid #2A2A2A; color: #888; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .copy-btn:hover { border-color: #00E87A; color: #00E87A; }
        .principles-strip { border-top: 1px solid #2A2A2A; padding: 48px 40px; max-width: 760px; margin: 0 auto; }
        .principles-strip h3 { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 24px; }
        .principles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .principle-item { padding: 16px; background: #141414; border-radius: 10px; border: 1px solid #2A2A2A; }
        .p-icon { font-size: 20px; margin-bottom: 8px; }
        .p-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .p-desc { font-size: 12px; color: #888; line-height: 1.5; }
        @media (max-width: 600px) {
          nav { padding: 16px 20px; }
          .hero { padding: 48px 20px 40px; }
          .upload-section, .tool-section, .results-section { padding: 0 20px 60px; }
          .principles-strip { padding: 40px 20px; }
          .upload-zone { padding: 40px 20px; }
          .result-actions { flex-direction: column; }
          .tabs-wrapper { padding: 0 20px; }
          .rehook-prompt { gap: 12px; }
          .rehook-prompt-btn { width: 100%; }
          .scores-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
