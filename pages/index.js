import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

// Extract video frames as base64 JPEGs
async function extractFrames(file, numFrames = 8) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);
    const frames = [];

    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      canvas.width = 540;
      canvas.height = Math.round(540 * (video.videoHeight / video.videoWidth)) || 960;
      const duration = video.duration;
      // Always include frame 0 (very first frame) and spread the rest evenly
      const timestamps = [0.01, ...Array.from({ length: numFrames - 1 }, (_, i) =>
        Math.min(0.1 + (duration * 0.9 * (i + 1) / numFrames), duration - 0.05)
      )];
      let index = 0;

      const captureNext = () => {
        if (index >= timestamps.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        video.currentTime = timestamps[index];
      };

      video.addEventListener('seeked', () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.75).split(',')[1]);
        } catch (e) {}
        index++;
        captureNext();
      });

      captureNext();
    });

    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve([]); });
    setTimeout(() => { URL.revokeObjectURL(url); resolve(frames); }, 20000);
  });
}

// Get video metadata (dimensions, duration, has audio)
async function getVideoMetadata(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;

    video.addEventListener('loadedmetadata', () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration),
        isVertical: video.videoHeight > video.videoWidth,
        aspectRatio: `${video.videoWidth}x${video.videoHeight}`
      };
      URL.revokeObjectURL(url);
      resolve(metadata);
    });

    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(null); });
    setTimeout(() => { URL.revokeObjectURL(url); resolve(null); }, 5000);
  });
}

// Extract audio as base64 WAV and detect if audio track exists
async function extractAudio(file) {
  return new Promise(async (resolve) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      let audioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      } catch (e) {
        // No audio track or can't decode
        resolve({ hasAudio: false, audioBase64: null });
        return;
      }

      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // Check if audio is actually silent (all zeros or near-zero)
      let maxAmplitude = 0;
      for (let i = 0; i < Math.min(channelData.length, 10000); i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
      }
      if (maxAmplitude < 0.001) {
        resolve({ hasAudio: false, audioBase64: null });
        return;
      }

      // Downsample to 16kHz for AssemblyAI
      const targetRate = 16000;
      const ratio = sampleRate / targetRate;
      const newLength = Math.floor(channelData.length / ratio);
      const downsampled = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        downsampled[i] = channelData[Math.floor(i * ratio)];
      }

      // Convert to WAV
      const wavBuffer = new ArrayBuffer(44 + downsampled.length * 2);
      const view = new DataView(wavBuffer);
      const ws = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
      ws(0, 'RIFF'); view.setUint32(4, 36 + downsampled.length * 2, true);
      ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      ws(36, 'data'); view.setUint32(40, downsampled.length * 2, true);
      for (let i = 0; i < downsampled.length; i++) {
        view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, downsampled[i])) * 0x7FFF, true);
      }

      const bytes = new Uint8Array(wavBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      resolve({ hasAudio: true, audioBase64: btoa(binary) });
    } catch (e) {
      console.error('Audio extraction error:', e);
      resolve({ hasAudio: false, audioBase64: null });
    }
  });
}

// Send video to Railway FFmpeg server for real analysis
async function analyzeWithRailway(file) {
  try {
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch('/api/proxy-analyze', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Railway analysis error:', e);
    return null;
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [platform, setPlatform] = useState('TikTok');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [contentType, setContentType] = useState('');
  const fileInputRef = useRef();
  const replaceInputRef = useRef();

  const [hookScript, setHookScript] = useState('');
  const [hookResults, setHookResults] = useState(null);
  const [hookLoading, setHookLoading] = useState(false);

  const [flopFile, setFlopFile] = useState(null);
  const [flopUrl, setFlopUrl] = useState(null);
  const [flopMeta, setFlopMeta] = useState(null);
  const [flopContext, setFlopContext] = useState('');
  const [flopResults, setFlopResults] = useState(null);
  const [flopLoading, setFlopLoading] = useState(false);
  const flopInputRef = useRef();

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResults(null);
    setError(false);
    const meta = await getVideoMetadata(file);
    setVideoMeta(meta);
  };

  const handleFlopFile = async (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setFlopFile(file);
    setFlopUrl(URL.createObjectURL(file));
    setFlopResults(null);
    const meta = await getVideoMetadata(file);
    setFlopMeta(meta);
  };

  const steps = [
    'Uploading your video...',
    'Running full video analysis...',
    'Processing results...',
    'Generating your roast...'
  ];

  const analyzeVideo = async () => {
    setLoading(true);
    setError(false);

    try {
      setLoadingStep(1);
      setLoadingMsg(steps[0]);

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('platform', platform);
      formData.append('contentType', contentType);
      formData.append('mode', 'analyze');

      setLoadingStep(2);
      setLoadingMsg(steps[1]);

      const res = await fetch('/api/proxy-analyze', {
        method: 'POST',
        body: formData
      });

      setLoadingStep(3);
      setLoadingMsg(steps[2]);

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();

      setLoadingStep(4);
      setLoadingMsg(steps[3]);

      setResults(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setLoadingStep(0);
      setLoadingMsg('');
    }
  };

  const reHook = async () => {
    if (!hookScript.trim()) return;
    setHookLoading(true);
    setHookResults(null);
    try {
      const formData = new FormData();
      formData.append('mode', 'rehook');
      formData.append('script', hookScript);
      formData.append('platform', platform);
      // Create a tiny dummy file since Railway expects a video field
      const dummyBlob = new Blob(['dummy'], { type: 'video/mp4' });
      formData.append('video', dummyBlob, 'dummy.mp4');

      const res = await fetch('/api/proxy-analyze', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Server error');
      setHookResults(await res.json());
    } catch (err) { console.error(err); }
    finally { setHookLoading(false); }
  };

  const analyzeFlop = async () => {
    setFlopLoading(true);
    setFlopResults(null);
    try {
      const formData = new FormData();
      if (flopFile) formData.append('video', flopFile);
      formData.append('platform', platform);
      formData.append('mode', 'flop');
      formData.append('flop_context', flopContext);

      const res = await fetch('/api/proxy-analyze', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Analysis failed');
      setFlopResults(await res.json());
    } catch (err) { console.error(err); }
    finally { setFlopLoading(false); }
  };

  const importanceColor = (imp) => {
    if (!imp) return '#888';
    const i = imp.toLowerCase();
    if (i.includes('critical')) return '#FF3B00';
    if (i.includes('high')) return '#FF8C00';
    if (i.includes('medium')) return '#FFD600';
    return '#00E87A';
  };

  const scoreColor = results ? (results.score >= 75 ? '#00E87A' : results.score >= 63 ? '#FFD600' : results.score >= 50 ? '#FF8C00' : '#FF3B00') : '#fff';
  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

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
          <button className={`tab ${activeTab === 'flop' ? 'active' : ''}`} onClick={() => setActiveTab('flop')}>💀 Why Did This Flop</button>
        </div>
      </div>

      {activeTab === 'analyze' && (
        <>
          {!results && (
            <section className="hero">
              <div className="hero-eyebrow">AI-Powered Content Psychology</div>
              <h1>Know exactly why they <em>stop</em> scrolling.</h1>
              <p>We extract real frames, analyze your audio, detect your pacing, and give brutally specific feedback based on what we actually observe. No generic BS.</p>
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
                  <span className="atag">👁️ Visual Frames</span>
                  <span className="atag">🎵 Audio Analysis</span>
                  <span className="atag">✂️ Cut Detection</span>
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
                      <div className="video-size">
                        {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                        {videoMeta && ` · ${videoMeta.width}×${videoMeta.height} · ${videoMeta.duration}s`}
                      </div>
                    </div>
                    <button className="replace-btn" onClick={() => replaceInputRef.current.click()}>↩ Replace</button>
                    <input ref={replaceInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                  </div>
                </div>
                <div className="platform-select">
                  <h4>Content Type</h4>
                  <div className="content-type-grid">
                    {[
                      { id: "talking", emoji: "🗣️", label: "Talking to Camera", desc: "You're speaking to the viewer — tutorials, advice, opinions, fitness tips, education, reviews" },
                      { id: "footage", emoji: "🎬", label: "Footage / Vlog", desc: "Clips of things happening — day in the life, travel, room tours, behind the scenes, hauls" },
                      { id: "skit", emoji: "😂", label: "Skit / Comedy / Trends", desc: "You're performing — comedy bits, skits, trend participation, reactions, characters" },
                      { id: "product", emoji: "🛍️", label: "Product / Brand", desc: "Promoting or showcasing something — ads, reviews, unboxings, business content" },
                      { id: "aesthetic", emoji: "🎵", label: "Aesthetic / Vibe", desc: "Mood-driven content — music videos, artistic edits, fashion, visual storytelling with no talking" },
                    ].map(ct => (
                      <button key={ct.id} className={`content-type-btn ${contentType === ct.id ? 'active' : ''}`} onClick={() => setContentType(ct.id)}>
                        <div className="ct-top">
                          <span className="ct-emoji">{ct.emoji}</span>
                          <span className="ct-label">{ct.label}</span>
                        </div>
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
                <button className="analyze-btn" onClick={analyzeVideo} disabled={!contentType}>{error ? 'Something went wrong — try again' : contentType ? 'Roast My Video →' : 'Select a content type first'}</button>
              </>
            )}

            {loading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <h3>{loadingMsg || 'Analyzing...'}</h3>
                <p>Full analysis: visuals + audio + pacing</p>
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
                  <h2>The Verdict Is In 💀</h2>
                  <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Platform: {platform} · {results.totalIssues || results.findings?.length} issues found</p>
                </div>
                <div className="score-badge">
                  <div className="score-number" style={{ color: scoreColor }}>{results.score}</div>
                  <div className="score-label">Scroll Score</div>
                </div>
              </div>
              <div className="feedback-grid">
                {results.findings?.map((f, i) => (
                  <div key={i} className="feedback-card">
                    <div className="card-header">
                      <div className="card-icon-wrap" style={{ background: importanceColor(f.importance) + '22' }}>
                        <span style={{ fontSize: 20 }}>{f.icon || '⚠️'}</span>
                      </div>
                      <div className="card-title-group">
                        <div className="card-category" style={{ color: importanceColor(f.importance) }}>#{f.rank} — {f.importance}</div>
                        <div className="card-title">{f.title}</div>
                      </div>
                    </div>
                    <div className="roast-box">{f.roast}</div>
                    <div className="psych-fact"><strong>Psychology:</strong> {f.psychFact}</div>
                    <div className="fix-label">→ THE FIX (because we actually love you)</div>
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
                <button className="replace-result-btn" onClick={() => { setResults(null); setVideoFile(null); setVideoUrl(null); setVideoMeta(null); setError(false); setContentType(''); }}>↩ Try another video</button>
                <button className="retry-btn" onClick={() => { setResults(null); setVideoFile(null); setVideoUrl(null); setVideoMeta(null); setError(false); setContentType(''); }}>+ New Analysis</button>
              </div>
            </section>
          )}
        </>
      )}

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
          <textarea className="script-input" placeholder="Paste your hook or opening line here..." value={hookScript} onChange={(e) => setHookScript(e.target.value)} rows={4} />
          <button className="analyze-btn" onClick={reHook} disabled={hookLoading || !hookScript.trim()}>{hookLoading ? 'Rewriting...' : 'Re-Hook Me →'}</button>
          {hookLoading && <div className="loading-state"><div className="loading-spinner" /><h3>Rewriting 5 ways...</h3><p>Using psychological frameworks proven to stop scrolls</p></div>}
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
                    <button className="copy-btn" onClick={() => copyToClipboard(h.hook)}>Copy ↗</button>
                  </div>
                ))}
              </div>
              <button className="retry-btn" style={{ width: '100%', marginTop: 24 }} onClick={() => { setHookResults(null); setHookScript(''); }}>+ Rewrite Another Hook</button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'flop' && (
        <section className="tool-section">
          <div className="tool-hero">
            <div className="tool-emoji">💀</div>
            <h2>Why Did This Flop</h2>
            <p>Upload the video that died. We analyze the visuals, audio, and pacing to tell you exactly why. Zero mercy. Bring tissues.</p>
          </div>
          {!flopFile ? (
            <div className="upload-zone" onClick={() => flopInputRef.current.click()}>
              <input ref={flopInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFlopFile(e.target.files[0])} />
              <div className="upload-icon">💀</div>
              <h3>Upload the victim</h3>
              <p>The video that flopped. Don't be shy.</p>
            </div>
          ) : (
            <div className="video-preview">
              <video src={flopUrl} controls />
              <div className="video-info">
                <div>
                  <div className="video-filename">{flopFile.name}</div>
                  <div className="video-size">
                    {(flopFile.size / 1024 / 1024).toFixed(1)} MB — Ready for its autopsy
                    {flopMeta && ` · ${flopMeta.width}×${flopMeta.height}`}
                  </div>
                </div>
                <button className="replace-btn" onClick={() => { setFlopFile(null); setFlopUrl(null); setFlopResults(null); setFlopMeta(null); }}>↩ Replace</button>
              </div>
            </div>
          )}
          <input ref={flopInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFlopFile(e.target.files[0])} />
          <div className="platform-select" style={{ marginTop: 20 }}>
            <h4>Platform it flopped on</h4>
            <div className="platform-options">
              {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map(p => (
                <button key={p} className={`platform-btn ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
              ))}
            </div>
          </div>
          <textarea className="script-input" placeholder="Optional: How many views? What were you expecting? The more context, the more brutal we can be." value={flopContext} onChange={(e) => setFlopContext(e.target.value)} rows={3} style={{ marginTop: 16 }} />
          <button className="analyze-btn flop-btn" onClick={analyzeFlop} disabled={flopLoading}>{flopLoading ? 'Performing autopsy...' : 'Perform The Autopsy →'}</button>
          {flopLoading && <div className="loading-state"><div className="loading-spinner" /><h3>Performing the autopsy...</h3><p>Analyzing visuals, audio, and pacing</p></div>}
          {flopResults && (
            <div className="flop-results">
              <div className="verdict-card"><div className="verdict-label">⚖️ THE VERDICT</div><div className="verdict-text">{flopResults.verdict}</div></div>
              <div className="autopsy-label">🔬 THE AUTOPSY</div>
              {flopResults.autopsy?.map((a, i) => (
                <div key={i} className="autopsy-card">
                  <div className="autopsy-header">
                    <span className="autopsy-rank">#{a.rank || i + 1}</span>
                    <span className="autopsy-reason">{a.reason}</span>
                    <span className="autopsy-impact" style={{ color: a.impact === 'Critical' ? '#FF3B00' : a.impact === 'High' ? '#FF8C00' : '#FFD600' }}>{a.impact}</span>
                  </div>
                  <div className="autopsy-roast">{a.roast}</div>
                  <div className="psych-fact"><strong>The Data:</strong> {a.data}</div>
                </div>
              ))}
              <div className="resurrection-card"><div className="resurrection-label">🔄 THE RESURRECTION</div><div className="resurrection-text">{flopResults.resurrection}</div></div>
              <div className="closer-card">{flopResults.closer}</div>
              <button className="retry-btn" style={{ width: '100%', marginTop: 24 }} onClick={() => { setFlopResults(null); setFlopFile(null); setFlopUrl(null); setFlopContext(''); setFlopMeta(null); }}>+ Autopsy Another Video</button>
            </div>
          )}
        </section>
      )}

      {!results && !hookResults && !flopResults && activeTab === 'analyze' && (
        <section className="principles-strip">
          <h3>What we actually analyze</h3>
          <div className="principles-grid">
            {[
              { icon: '👁️', name: 'Real Visual Analysis', desc: 'We extract 8 actual frames and Claude sees your exact colors, lighting, background, and contrast.' },
              { icon: '🎵', name: 'Real Audio Analysis', desc: 'AssemblyAI processes your audio, distinguishes speech from music, and measures pace in WPM.' },
              { icon: '✂️', name: 'Real Cut Detection', desc: 'Histogram-based algorithm samples your video 10 times per second to detect actual cuts.' },
              { icon: '📐', name: 'Exact Dimensions', desc: 'We read your actual video width and height so we never wrongly suggest shooting vertical.' },
              { icon: '🧠', name: 'Hook Psychology', desc: 'The first 1.5 seconds determine 80% of your completion rate. We analyze it specifically.' },
              { icon: '🎯', name: 'Ranked by Impact', desc: 'Every finding ranked Critical to Polish so you know exactly what to fix first.' },
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
        .content-type-grid { display: flex; flex-direction: column; gap: 10px; }
        .content-type-btn { background: #141414; border: 1px solid #2A2A2A; color: #888; padding: 14px 16px; border-radius: 12px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 6px; text-align: left; width: 100%; }
        .content-type-btn:hover { border-color: #FF3B00; color: #FAFAFA; background: rgba(255,59,0,0.05); }
        .content-type-btn.active { background: rgba(255,59,0,0.12); border-color: #FF3B00; color: #FF3B00; }
        .ct-top { display: flex; align-items: center; gap: 10px; }
        .ct-emoji { font-size: 20px; flex-shrink: 0; }
        .ct-label { font-size: 14px; font-weight: 600; color: inherit; }
        .ct-desc { font-size: 12px; color: #666; line-height: 1.4; padding-left: 30px; }
        .content-type-btn.active .ct-desc { color: rgba(255,59,0,0.7); }
        .content-type-btn:hover .ct-desc { color: #888; }
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
        .analyze-btn { display: block; width: 100%; margin-top: 20px; padding: 18px; background: #FF3B00; color: white; border: none; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .analyze-btn:hover { background: #e03400; }
        .analyze-btn:disabled { background: #2A2A2A; color: #555; cursor: not-allowed; }
        .flop-btn { background: #1A0A0A; border: 2px solid #FF3B00; }
        .flop-btn:hover:not(:disabled) { background: #FF3B00; }
        .script-input { width: 100%; background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 16px; color: #FAFAFA; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; resize: vertical; transition: border-color 0.2s; }
        .script-input:focus { outline: none; border-color: #FF3B00; }
        .script-input::placeholder { color: #555; }
        .loading-state { text-align: center; padding: 60px 20px; }
        .loading-spinner { width: 48px; height: 48px; border: 3px solid #2A2A2A; border-top-color: #FF3B00; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state h3 { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .loading-state p { color: #888; font-size: 14px; }
        .loading-steps { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin-left: auto; margin-right: auto; }
        .loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #888; text-align: left; padding: 10px 14px; background: #141414; border-radius: 8px; border: 1px solid #2A2A2A; opacity: 0.4; transition: all 0.3s; }
        .loading-step.active { opacity: 1; color: #FAFAFA; border-color: #FF3B00; }
        .loading-step.done { opacity: 1; color: #00E87A; border-color: rgba(0,232,122,0.3); }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .results-section { max-width: 760px; margin: 0 auto; padding: 40px 40px 80px; }
        .results-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .results-header h2 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .score-badge { display: flex; flex-direction: column; align-items: center; background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 16px 24px; min-width: 100px; }
        .score-number { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; line-height: 1; }
        .score-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .feedback-grid { display: flex; flex-direction: column; gap: 16px; }
        .feedback-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 24px; }
        .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .card-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .card-title-group { flex: 1; }
        .card-category { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; line-height: 1.3; }
        .roast-box { background: #1A0A0A; border-left: 3px solid #FF3B00; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #FFB3A0; line-height: 1.7; margin-bottom: 16px; font-style: italic; }
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
        .flop-results { margin-top: 24px; display: flex; flex-direction: column; gap: 16px; }
        .verdict-card { background: #1A0A0A; border: 2px solid #FF3B00; border-radius: 14px; padding: 24px; }
        .verdict-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #FF3B00; margin-bottom: 12px; }
        .verdict-text { font-size: 15px; color: #FFB3A0; line-height: 1.8; font-style: italic; }
        .autopsy-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #888; margin: 8px 0; }
        .autopsy-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px; }
        .autopsy-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .autopsy-rank { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #FF3B00; }
        .autopsy-reason { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; flex: 1; }
        .autopsy-impact { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .autopsy-roast { font-size: 14px; color: #FFB3A0; line-height: 1.7; margin-bottom: 12px; font-style: italic; background: #1A0A0A; padding: 12px 14px; border-radius: 8px; }
        .resurrection-card { background: rgba(0,232,122,0.06); border: 1px solid rgba(0,232,122,0.2); border-radius: 14px; padding: 24px; }
        .resurrection-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #00E87A; margin-bottom: 12px; }
        .resurrection-text { font-size: 15px; color: #FAFAFA; line-height: 1.8; }
        .closer-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px; font-size: 15px; color: #FFB3A0; font-style: italic; text-align: center; line-height: 1.7; }
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
        }
      `}</style>
    </>
  );
}
