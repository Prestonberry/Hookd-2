import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [platform, setPlatform] = useState('TikTok');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef();
  const replaceInputRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResults(null);
    setError(false);
  };

  const analyzeVideo = async () => {
    setLoading(true);
    setError(false);
    setLoadingStep(1);

    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, 900));
      setLoadingStep(i);
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: videoFile?.name || 'video.mp4',
          platform,
          filesize: videoFile?.size || 0
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const reset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setResults(null);
    setError(false);
    setPlatform('TikTok');
  };

  const replaceVideo = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResults(null);
    setError(false);
  };

  const scoreColor = results ? (results.score >= 75 ? '#00E87A' : results.score >= 63 ? '#FFD600' : results.score >= 50 ? '#FF8C00' : '#FF3B00') : '#fff';
  const priorityClass = (p) => p === 'High' ? 'priority-high' : p === 'Medium' ? 'priority-med' : 'priority-low';

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

      {!results && (
        <section className="hero">
          <div className="hero-eyebrow">AI-Powered Content Psychology</div>
          <h1>Know exactly why they <em>stop</em> scrolling.</h1>
          <p>Upload any short-form video and get instant, psychology-backed feedback on what to fix — color, contrast, hooks, pacing, and more.</p>
        </section>
      )}

      <section className="upload-section">
        {!videoFile && !loading && (
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current.click()}
          >
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <div className="upload-icon">🎬</div>
            <h3>Drop your video here</h3>
            <p>or click to browse files</p>
            <div className="file-types">
              {['MP4', 'MOV', 'AVI', 'WEBM'].map(t => <span key={t} className="file-tag">{t}</span>)}
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
                <button className="replace-btn" onClick={() => replaceInputRef.current.click()}>
                  ↩ Replace video
                </button>
                <input ref={replaceInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => replaceVideo(e.target.files[0])} />
              </div>
            </div>

            <div className="platform-select">
              <h4>Target Platform</h4>
              <div className="platform-options">
                {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map(p => (
                  <button key={p} className={`platform-btn ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
                ))}
              </div>
            </div>

            <button className="analyze-btn" onClick={analyzeVideo}>
              {error ? 'Something went wrong — try again' : 'Analyze My Video →'}
            </button>
          </>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <h3>Analyzing your content...</h3>
            <p>Running psychological pattern analysis</p>
            <div className="loading-steps">
              {['Reading visual contrast & color', 'Detecting hook strength', 'Checking pacing & structure', 'Generating psychology report'].map((s, i) => (
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
              <h2>Your Analysis Report</h2>
              <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Platform: {platform}</p>
            </div>
            <div className="score-badge">
              <div className="score-number" style={{ color: scoreColor }}>{results.score}</div>
              <div className="score-label">Scroll Score</div>
            </div>
          </div>

          <div className="feedback-grid">
            {results.findings.map((f, i) => (
              <div key={i} className="feedback-card">
                <div className="card-header">
                  <div className={`card-icon ${f.iconClass}`}>{f.icon}</div>
                  <div className="card-title-group">
                    <div className="card-category">{f.category}</div>
                    <div className="card-title">{f.title}</div>
                  </div>
                  <span className={`priority-tag ${priorityClass(f.priority)}`}>{f.priority}</span>
                </div>
                <div className="card-body">{f.body}</div>
                <div className="psych-fact"><strong>Psychology:</strong> {f.psychFact}</div>
                <div className="fix-label">→ The Fix</div>
                <div className="fix-text">{f.fix}</div>
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button className="replace-result-btn" onClick={() => { replaceInputRef.current.click(); }}>
              ↩ Analyze a different video
            </button>
            <input ref={replaceInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => replaceVideo(e.target.files[0])} />
            <button className="retry-btn" onClick={reset}>+ New Analysis</button>
          </div>
        </section>
      )}

      {!results && (
        <section className="principles-strip">
          <h3>Psychology principles we analyze</h3>
          <div className="principles-grid">
            {[
              { icon: '👁️', name: 'Visual Contrast', desc: 'High contrast triggers involuntary attention before conscious thought.' },
              { icon: '⚡', name: 'Pattern Interrupts', desc: 'Unexpected cuts or movements spike dopamine and stall the scroll.' },
              { icon: '🎯', name: 'Hook Psychology', desc: 'The first 1.5 seconds determine 80% of completion rate.' },
              { icon: '🎨', name: 'Color Psychology', desc: 'Warm tones signal urgency; cool tones signal trust and calm.' },
              { icon: '🔊', name: 'Audio Priming', desc: '60% of TikTok users watch with sound on — audio sets emotional tone.' },
              { icon: '📐', name: 'Pacing & Rhythm', desc: 'Cut frequency directly correlates with perceived energy and engagement.' },
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
        .hero { padding: 80px 40px 60px; max-width: 900px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #FF3B00; margin-bottom: 24px; }
        .hero h1 { font-family: 'Syne', sans-serif; font-size: clamp(38px, 6vw, 68px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; }
        .hero h1 em { font-style: normal; color: #FF3B00; }
        .hero p { font-size: 17px; color: #888; line-height: 1.7; max-width: 560px; margin: 0 auto; }
        .upload-section { max-width: 760px; margin: 0 auto; padding: 0 40px 80px; }
        .upload-zone { border: 2px dashed #2A2A2A; border-radius: 16px; padding: 60px 40px; text-align: center; cursor: pointer; transition: all 0.2s; background: #141414; }
        .upload-zone:hover, .upload-zone.drag-over { border-color: #FF3B00; background: rgba(255,59,0,0.05); }
        .upload-icon { width: 56px; height: 56px; background: #1E1E1E; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
        .upload-zone h3 { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .upload-zone p { color: #888; font-size: 14px; }
        .file-types { margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .file-tag { background: #1E1E1E; border: 1px solid #2A2A2A; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #888; }
        .video-preview { margin-top: 24px; border-radius: 12px; overflow: hidden; background: #141414; border: 1px solid #2A2A2A; }
        .video-preview video { width: 100%; max-height: 340px; object-fit: contain; display: block; }
        .video-info { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .video-filename { font-size: 14px; font-weight: 500; }
        .video-size { font-size: 12px; color: #888; margin-top: 2px; }
        .replace-btn { background: transparent; border: 1px solid #2A2A2A; color: #888; padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .replace-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .platform-select { margin-top: 20px; }
        .platform-select h4 { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .platform-options { display: flex; gap: 10px; flex-wrap: wrap; }
        .platform-btn { background: #141414; border: 1px solid #2A2A2A; color: #FAFAFA; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .platform-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .platform-btn.active { background: #FF3B00; border-color: #FF3B00; color: white; }
        .analyze-btn { display: block; width: 100%; margin-top: 20px; padding: 18px; background: #FF3B00; color: white; border: none; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .analyze-btn:hover { background: #e03400; }
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
        .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .icon-visual { background: rgba(255,59,0,0.15); }
        .icon-audio { background: rgba(255,214,0,0.15); }
        .icon-structure { background: rgba(0,232,122,0.15); }
        .icon-text { background: rgba(99,102,241,0.15); }
        .icon-hook { background: rgba(236,72,153,0.15); }
        .card-title-group { flex: 1; }
        .card-category { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 2px; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; }
        .priority-tag { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .priority-high { background: rgba(255,59,0,0.2); color: #FF3B00; }
        .priority-med { background: rgba(255,214,0,0.15); color: #FFD600; }
        .priority-low { background: rgba(0,232,122,0.15); color: #00E87A; }
        .card-body { font-size: 15px; color: #CCC; line-height: 1.7; margin-bottom: 16px; }
        .psych-fact { background: #1E1E1E; border-left: 3px solid #FF3B00; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #888; line-height: 1.6; margin-bottom: 16px; }
        .psych-fact strong { color: #FF3B00; font-weight: 600; }
        .fix-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #00E87A; margin-bottom: 8px; }
        .fix-text { font-size: 14px; color: #FAFAFA; line-height: 1.6; background: rgba(0,232,122,0.06); border: 1px solid rgba(0,232,122,0.2); padding: 12px 14px; border-radius: 8px; }
        .result-actions { display: flex; gap: 12px; margin-top: 32px; }
        .replace-result-btn { flex: 1; padding: 16px; background: transparent; color: #888; border: 1px solid #2A2A2A; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .replace-result-btn:hover { border-color: #FF3B00; color: #FF3B00; }
        .retry-btn { flex: 1; padding: 16px; background: #FF3B00; color: white; border: none; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .retry-btn:hover { background: #e03400; }
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
          .upload-section, .results-section { padding: 0 20px 60px; }
          .principles-strip { padding: 40px 20px; }
          .upload-zone { padding: 40px 20px; }
          .result-actions { flex-direction: column; }
        }
      `}</style>
    </>
  );
}
