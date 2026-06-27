import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';

async function extractFrames(file, maxFrames = 20) {
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

async function extractAudio(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try { audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0)); } catch (e) { return { hasAudio: false }; }
    const channelData = audioBuffer.getChannelData(0);
    let maxAmp = 0;
    for (let i = 0; i < Math.min(channelData.length, 10000); i++) maxAmp = Math.max(maxAmp, Math.abs(channelData[i]));
    if (maxAmp < 0.001) return { hasAudio: false };
    return { hasAudio: true };
  } catch (e) { return { hasAudio: false }; }
}

const FREE_LIMIT = 3;

// Each question: id (maps to payload key), question text, helper text,
// options (dropdown choices), and whether free-text is allowed alongside.
const VIRALITY_QUESTIONS = [
  {
    id: 'targetAudience',
    question: 'Who is this video trying to attract?',
    helper: 'e.g. "college girls into fitness," "young founders," "men into self-improvement"',
    options: [],
    freeText: true,
    required: true,
  },
  {
    id: 'videoGoal',
    question: 'What do you want this video to do?',
    helper: 'Pick the closest match, or describe your own.',
    options: ['Get followers', 'Get shares', 'Start a debate', 'Build trust', 'Get profile visits', 'Go viral broadly'],
    freeText: true,
    required: true,
  },
  {
    id: 'targetEmotion',
    question: 'What is the main emotion or reaction you want viewers to feel?',
    helper: 'This helps us judge whether your pacing and hook actually deliver on that feeling.',
    options: ['Curious', 'Called out', 'Inspired', 'Entertained', 'Understood', 'Shocked', 'Motivated'],
    freeText: true,
    required: true,
  },
  {
    id: 'creatorIdentity',
    question: 'What type of creator are you trying to be seen as?',
    helper: 'e.g. "funny big sister," "luxury fitness guy," "chaotic honest friend"',
    options: [],
    freeText: true,
    required: true,
  },
  {
    id: 'recentPattern',
    question: "What's been working or not working for you recently?",
    helper: 'Optional — e.g. "My storytimes do well, but educational videos flop."',
    options: [],
    freeText: true,
    required: false,
  },
];

const CONVERSION_QUESTIONS = [
  {
    id: 'desiredAction',
    question: 'What is the exact action you want people to take?',
    helper: 'e.g. "book a call," "start free trial," "buy now," "join waitlist"',
    options: ['Book a call', 'Start free trial', 'Buy now', 'Join waitlist', 'Download guide'],
    freeText: true,
    required: true,
  },
  {
    id: 'buyerProfile',
    question: 'Who is the buyer, and what problem are they already aware of?',
    helper: 'e.g. "UGC agencies who know their ads are underperforming"',
    options: [],
    freeText: true,
    required: true,
  },
  {
    id: 'mainObjection',
    question: 'What is the main objection stopping them from buying?',
    helper: 'This is what your video needs to overcome.',
    options: ['Too expensive', "Don't trust it", "Don't need it yet", 'Tried something similar', 'Confused how it works', 'Need proof'],
    freeText: true,
    required: true,
  },
  {
    id: 'industry',
    question: 'What industry or niche is this for?',
    helper: 'e.g. "fitness coaching," "B2B SaaS," "skincare"',
    options: [],
    freeText: true,
    required: true,
  },
  {
    id: 'offerDetails',
    question: 'What offer, price, or promise is being sold?',
    helper: 'Optional — e.g. "$29/month AI video feedback tool"',
    options: [],
    freeText: true,
    required: false,
  },
];

function ContextQuiz({ questions, step, setStep, answers, setAnswers, onComplete, accent = '#8B4A2F' }) {
  const q = questions[step];
  const value = answers[q.id] || '';
  const isLast = step === questions.length - 1;
  const canAdvance = q.required ? value.trim().length > 0 : true;

  const setValue = (v) => setAnswers(prev => ({ ...prev, [q.id]: v }));

  const advance = () => {
    if (!canAdvance) return;
    if (isLast) { onComplete(); return; }
    setStep(step + 1);
  };

  const goBack = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="quiz-wrap">
      <div className="quiz-progress">
        {questions.map((_, i) => (
          <div key={i} className={`quiz-dot ${i === step ? 'quiz-dot-active' : i < step ? 'quiz-dot-done' : ''}`} style={i <= step ? { background: accent } : {}} />
        ))}
      </div>
      <div className="quiz-step-label">Question {step + 1} of {questions.length}{!q.required ? ' (optional)' : ''}</div>
      <h3 className="quiz-question">{q.question}</h3>
      {q.helper && <p className="quiz-helper">{q.helper}</p>}

      {q.options.length > 0 && (
        <div className="quiz-options">
          {q.options.map(opt => (
            <button
              key={opt}
              className={`quiz-option-btn ${value === opt ? 'quiz-option-active' : ''}`}
              style={value === opt ? { borderColor: accent, background: accent + '14', color: accent } : {}}
              onClick={() => setValue(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.freeText && (
        <input
          className="quiz-freetext"
          type="text"
          placeholder={q.options.length > 0 ? 'Or type your own answer...' : 'Type your answer...'}
          value={q.options.includes(value) ? '' : value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      <div className="quiz-nav-row">
        <button className="quiz-back-btn" onClick={goBack} disabled={step === 0}>Back</button>
        {!q.required && !value.trim() && (
          <button className="quiz-skip-btn" onClick={() => { setValue(''); advance(); }}>Skip</button>
        )}
        <button
          className="quiz-next-btn"
          style={canAdvance ? { background: accent } : {}}
          onClick={advance}
          disabled={!canAdvance}
        >
          {isLast ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState('virality');
  const [usageData, setUsageData] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [contentType, setContentType] = useState('');
  const [viralityAnswers, setViralityAnswers] = useState({});
  const [showViralityQuiz, setShowViralityQuiz] = useState(false);
  const [viralityQuizStep, setViralityQuizStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();
  const replaceInputRef = useRef();
  const [convFile, setConvFile] = useState(null);
  const [convUrl, setConvUrl] = useState(null);
  const [funnelStage, setFunnelStage] = useState('');
  const [conversionAnswers, setConversionAnswers] = useState({});
  const [showConversionQuiz, setShowConversionQuiz] = useState(false);
  const [conversionQuizStep, setConversionQuizStep] = useState(0);
  const [convLoading, setConvLoading] = useState(false);
  const [convResults, setConvResults] = useState(null);
  const [convError, setConvError] = useState(false);
  const [convDragOver, setConvDragOver] = useState(false);
  const convInputRef = useRef();
  const [hookScript, setHookScript] = useState('');
  const [hookContext, setHookContext] = useState('');
  const [hookType, setHookType] = useState('talking');
  const [hookResults, setHookResults] = useState(null);
  const [hookLoading, setHookLoading] = useState(false);
  const [hookError, setHookError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/usage').then(r => r.json()).then(setUsageData).catch(console.error);
    }
    if (router.query.success) {
      fetch('/api/usage').then(r => r.json()).then(setUsageData);
    }
  }, [isSignedIn, router.query]);

  const checkAndIncrementUsage = async (mode) => {
    if (!isSignedIn) { setShowAuthPrompt(true); return false; }
    const res = await fetch('/api/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    // Merge rather than replace: the POST response only returns a few
    // fields (isSubscribed, canAnalyze, plan), so replacing would wipe the
    // remaining-count fields from the GET and leave usageData in a stale,
    // partially-undefined state that breaks the next action until refresh.
    setUsageData(prev => ({ ...prev, ...data }));
    if (!data.canAnalyze) { setShowPaywall(true); return false; }
    // Re-sync the full usage object in the background so remaining counts
    // (nav badge, limits) stay accurate after this action.
    fetch('/api/usage').then(r => r.json()).then(fresh => setUsageData(fresh)).catch(() => {});
    return true;
  };

  const handleManageSubscription = async () => {
    if (!isSignedIn) { setShowAuthPrompt(true); return; }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push('/pricing');
      }
    } catch (err) {
      console.error(err);
      router.push('/pricing');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleFile = (file) => {
    if (!isSignedIn) { setShowAuthPrompt(true); return; }
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file); setVideoUrl(URL.createObjectURL(file));
    setResults(null); setError(false);
    setShowViralityQuiz(false); setViralityQuizStep(0); setViralityAnswers({});
  };

  const handleConvFile = (file) => {
    if (!isSignedIn) { setShowAuthPrompt(true); return; }
    if (!file || !file.type.startsWith('video/')) return;
    setConvFile(file); setConvUrl(URL.createObjectURL(file));
    setConvResults(null); setConvError(false);
    setShowConversionQuiz(false); setConversionQuizStep(0); setConversionAnswers({});
  };

  const viralitySteps = ['Extracting frames...', 'Getting video info...', 'Checking audio...', 'Analyzing content...', 'Writing recommendations...'];
  const convSteps = ['Extracting frames...', 'Getting video info...', 'Checking audio...', 'Analyzing funnel fit...', 'Writing recommendations...'];

  const analyzeVideo = async () => {
    const canProceed = await checkAndIncrementUsage('analyze');
    if (!canProceed) return;
    setLoading(true); setError(false); setLoadingStep(1); setLoadingMsg(viralitySteps[0]);
    try {
      const frames = await extractFrames(videoFile, 20);
      setLoadingStep(2); setLoadingMsg(viralitySteps[1]);
      const meta = await getVideoMetadata(videoFile);
      setLoadingStep(3); setLoadingMsg(viralitySteps[2]);
      const { hasAudio } = await extractAudio(videoFile);
      setLoadingStep(4); setLoadingMsg(viralitySteps[3]);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze', filename: videoFile?.name || 'video.mp4',
          platform: 'TikTok', contentType, filesize: videoFile?.size || 0,
          frames, hasAudio, videoDuration: meta?.duration || 0,
          videoWidth: meta?.width || 0, videoHeight: meta?.height || 0,
          isVertical: meta?.isVertical ?? true, cutCount: 0,
          context: viralityAnswers
        })
      });
      setLoadingStep(5); setLoadingMsg(viralitySteps[4]);
      if (!res.ok) throw new Error('Analysis failed');
      setResults(await res.json());
    } catch (err) { console.error(err); setError(true); }
    finally { setLoading(false); setLoadingStep(0); setLoadingMsg(''); }
  };

  const analyzeConversion = async () => {
    const canProceed = await checkAndIncrementUsage('conversion');
    if (!canProceed) return;
    setConvLoading(true); setConvError(false); setLoadingStep(1); setLoadingMsg(convSteps[0]);
    try {
      const frames = await extractFrames(convFile, 20);
      setLoadingStep(2); setLoadingMsg(convSteps[1]);
      const meta = await getVideoMetadata(convFile);
      setLoadingStep(3); setLoadingMsg(convSteps[2]);
      const { hasAudio } = await extractAudio(convFile);
      setLoadingStep(4); setLoadingMsg(convSteps[3]);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'conversion', filename: convFile?.name || 'video.mp4',
          funnelStage, filesize: convFile?.size || 0,
          frames, hasAudio, videoDuration: meta?.duration || 0,
          videoWidth: meta?.width || 0, videoHeight: meta?.height || 0,
          isVertical: meta?.isVertical ?? true,
          context: conversionAnswers
        })
      });
      setLoadingStep(5); setLoadingMsg(convSteps[4]);
      if (!res.ok) throw new Error('Analysis failed');
      setConvResults(await res.json());
    } catch (err) { console.error(err); setConvError(true); }
    finally { setConvLoading(false); setLoadingStep(0); setLoadingMsg(''); }
  };

  const reHook = async (isRegenerate = false) => {
    if (!hookScript.trim()) return;
    if (!isSignedIn) { setShowAuthPrompt(true); return; }
    setHookError('');
    const canProceed = await checkAndIncrementUsage('rehook');
    if (!canProceed) {
      // Usage check failed (limit reached or error). For a regenerate this
      // would otherwise look like a dead button, so surface it.
      if (isRegenerate) setHookError("You've used all your Re-Hooks for this month.");
      return;
    }
    setHookLoading(true);
    // On a fresh rewrite, clear old results so the loading state shows.
    // On a regenerate, KEEP the current results on screen (so the button
    // doesn't vanish mid-click) until the new set arrives and replaces them.
    if (!isRegenerate) setHookResults(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'rehook', script: hookScript, platform: 'TikTok', hookContext, hookType, regenerate: isRegenerate })
      });
      if (!res.ok) throw new Error('Failed');
      setHookResults(await res.json());
    } catch (err) {
      console.error(err);
      setHookError('Something went wrong generating hooks. Please try again.');
    }
    finally { setHookLoading(false); }
  };

  const resetAnalyze = () => { setResults(null); setVideoFile(null); setVideoUrl(null); setError(false); setContentType(''); setViralityAnswers({}); setShowViralityQuiz(false); setViralityQuizStep(0); };
  const resetConv = () => { setConvResults(null); setConvFile(null); setConvUrl(null); setConvError(false); setFunnelStage(''); setConversionAnswers({}); setShowConversionQuiz(false); setConversionQuizStep(0); };

  const ic = (imp) => {
    if (!imp) return '#888';
    const i = imp.toLowerCase();
    if (i.includes('critical')) return '#8B4A2F';
    if (i.includes('high')) return '#A66A3D';
    if (i.includes('medium')) return '#B89968';
    return '#6B7A4F';
  };

  const scoreColor = (score) => score >= 75 ? '#6B7A4F' : score >= 63 ? '#B89968' : score >= 50 ? '#A66A3D' : '#8B4A2F';
  const copy = (t) => navigator.clipboard.writeText(t);

  const remaining = usageData?.freeRemaining ?? FREE_LIMIT;
  const isSubscribed = usageData?.isSubscribed ?? false;

  const contentTypes = [
    { id: 'talking', label: 'Talking to Camera', desc: "Tutorials, advice, opinions, fitness tips, education, reviews" },
    { id: 'footage', label: 'Footage / Vlog', desc: 'Day in the life, travel, room tours, behind the scenes, hauls' },
    { id: 'skit', label: 'Skit / Comedy / Trends', desc: "Comedy bits, skits, trend participation, reactions, characters" },
    { id: 'product', label: 'Product / Brand', desc: 'Ads, reviews, unboxings, business content' },
    { id: 'aesthetic', label: 'Aesthetic / Vibe', desc: 'Music videos, artistic edits, fashion, visual storytelling' },
  ];

  const funnelStages = [
    { id: 'top', label: 'Top of Funnel', desc: 'Awareness — reaching new audiences who have never heard of you' },
    { id: 'middle', label: 'Middle of Funnel', desc: "Consideration — nurturing people who know you but haven't bought yet" },
    { id: 'bottom', label: 'Bottom of Funnel', desc: 'Conversion — closing people who are ready to buy or take action' },
  ];

  const analyzeCards = [
    { name: '20 Visual Frames', desc: 'Claude sees your entire video start to finish.' },
    { name: 'Audio Analysis', desc: 'We detect audio and use it for pacing feedback.' },
    { name: 'Scroll Score', desc: 'How likely this stops the scroll.' },
    { name: 'Follower Score', desc: 'How likely viewers convert to followers.' },
    { name: 'Conversion Score', desc: 'How optimized your ad is for its funnel stage.' },
    { name: 'Ranked by Impact', desc: 'Top 5 findings ranked by what to fix first.' },
  ];

  if (!isLoaded) return (
    <div style={{ background: '#EDE6DC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #DDD0BF', borderTopColor: '#8B4A2F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>HookD — Know Why They Stop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      {showAuthPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="modal">
            <h2>Create your free account</h2>
            <p>Sign up to get 3 free analyses. No credit card required.</p>
            <SignUpButton mode="modal" afterSignUpUrl="/">
              <button className="modal-btn-primary" onClick={() => setShowAuthPrompt(false)}>Create Free Account</button>
            </SignUpButton>
            <SignInButton mode="modal" afterSignInUrl="/">
              <button className="modal-btn-secondary" onClick={() => setShowAuthPrompt(false)}>Already have an account? Sign in</button>
            </SignInButton>
            <button className="modal-dismiss" onClick={() => setShowAuthPrompt(false)}>Maybe later</button>
          </div>
        </div>
      )}

      {showPaywall && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="modal">
            <h2>You've hit your limit</h2>
            <p>Upgrade to keep analyzing and making content that performs.</p>
            <div className="paywall-plans">
              <button className="paywall-plan highlighted" onClick={() => router.push('/pricing')}>
                <div className="paywall-popular">All Access</div>
                <div className="paywall-plan-name">HookD</div>
                <div className="paywall-plan-price">$14.99/mo</div>
                <div className="paywall-plan-desc">20 Virality · 15 Conversion · 100 Re-Hooks</div>
              </button>
            </div>
            <button className="modal-btn-primary" onClick={() => router.push('/pricing')}>Get Started</button>
            <button className="modal-dismiss" onClick={() => setShowPaywall(false)}>Maybe later</button>
          </div>
        </div>
      )}

      <nav>
        <div className="logo">Hook<span>D</span></div>
        <div className="nav-right">
          {isSignedIn ? (
            <>
              {!isSubscribed && (
                <div className="free-badge">
                  {remaining > 0 ? `${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left` : 'Free limit reached'}
                </div>
              )}
              <a href="/pricing" className="nav-upgrade">Upgrade</a>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <SignInButton mode="modal" afterSignInUrl="/">
                <button className="nav-signin">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal" afterSignUpUrl="/">
                <button className="nav-upgrade">Start Free</button>
              </SignUpButton>
            </>
          )}
        </div>
      </nav>

      <div className="tabs-wrapper">
        <div className="tabs">
          <button className={`tab ${activeTab === 'virality' ? 'active' : ''}`} onClick={() => setActiveTab('virality')}>Virality Score</button>
          <button className={`tab ${activeTab === 'conversion' ? 'active' : ''}`} onClick={() => setActiveTab('conversion')}>Conversion Score</button>
          <button className={`tab ${activeTab === 'rehook' ? 'active' : ''}`} onClick={() => setActiveTab('rehook')}>Re-Hook Me</button>
        </div>
      </div>

      {activeTab === 'virality' && (
        <>
          {!results && !loading && !videoFile && (
            <section className="hero">
              <div className="hero-eyebrow">AI-Powered Content Analysis</div>
              <h1>Know exactly why they <em>stop</em> scrolling.</h1>
              <p>Upload your video. Get a complete performance report — what's working, what's killing your reach, and exactly how to fix it.</p>
              {!isSignedIn && (
                <SignUpButton mode="modal" afterSignUpUrl="/">
                  <button className="hero-cta">Start Free — 3 Analyses</button>
                </SignUpButton>
              )}
            </section>
          )}
          <section className="upload-section">
            {!videoFile && !loading && (
              <div className="upload-flank">
                <div className="flank-col">
                  {analyzeCards.slice(0, 3).map((c, i) => (
                    <div key={i} className="flank-card">
                      <div className="flank-card-name">{c.name}</div>
                      <div className="flank-card-desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!isSignedIn) { setShowAuthPrompt(true); return; } handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => isSignedIn ? fileInputRef.current.click() : setShowAuthPrompt(true)}>
                  <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                  <div className="upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h3>Drop your video here</h3>
                  <p>We analyze visuals, audio, and pacing.</p>
                  <div className="file-types">{['MP4', 'MOV', 'AVI', 'WEBM'].map(t => <span key={t} className="file-tag">{t}</span>)}</div>
                  <div className="analysis-tags">
                    <span className="atag">20 Visual Frames</span>
                    <span className="atag">Audio Analysis</span>
                    <span className="atag">Two Scores</span>
                  </div>
                </div>
                <div className="flank-col">
                  {analyzeCards.slice(3, 6).map((c, i) => (
                    <div key={i} className="flank-card">
                      <div className="flank-card-name">{c.name}</div>
                      <div className="flank-card-desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {videoFile && !loading && !results && !showViralityQuiz && (
              <>
                <div className="video-preview">
                  <video src={videoUrl} controls playsInline style={{ minHeight: "200px" }} />
                  <div className="video-info">
                    <div>
                      <div className="video-filename">{videoFile.name}</div>
                      <div className="video-size">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button className="replace-btn" onClick={() => replaceInputRef.current.click()}>Replace</button>
                    <input ref={replaceInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                  </div>
                </div>
                <div className="platform-select">
                  <h4>Content Type</h4>
                  <div className="content-type-grid">
                    {contentTypes.map(ct => (
                      <button key={ct.id} className={`content-type-btn ${contentType === ct.id ? 'active' : ''}`} onClick={() => setContentType(ct.id)}>
                        <div className="ct-label">{ct.label}</div>
                        <span className="ct-desc">{ct.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="analyze-btn"
                  onClick={() => { setViralityQuizStep(0); setShowViralityQuiz(true); }}
                  disabled={!contentType}
                >
                  {contentType ? 'Continue' : 'Select a content type first'}
                </button>
              </>
            )}
            {videoFile && !loading && !results && showViralityQuiz && (
              <ContextQuiz
                questions={VIRALITY_QUESTIONS}
                step={viralityQuizStep}
                setStep={setViralityQuizStep}
                answers={viralityAnswers}
                setAnswers={setViralityAnswers}
                onComplete={() => { setShowViralityQuiz(false); analyzeVideo(); }}
              />
            )}
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <h3>{loadingMsg || 'Analyzing...'}</h3>
                <p>This can take up to a minute — hang tight, it's worth it.</p>
                <div className="loading-steps">
                  {viralitySteps.map((s, i) => (
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
                <h2>Your Virality Report</h2>
                <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{results.findings?.length} findings</p>
              </div>
              <div className="scores-row">
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(results.score) }}>
                    {results.score}<span className="score-denom">/100</span>
                  </div>
                  <div className="score-title">Scroll Score</div>
                  <div className="score-subtitle">How likely this stops the scroll</div>
                  <div className="score-label-badge" style={{ background: scoreColor(results.score) + '22', color: scoreColor(results.score) }}>{results.scoreLabel}</div>
                </div>
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(results.followerScore) }}>
                    {results.followerScore}<span className="score-denom">/100</span>
                  </div>
                  <div className="score-title">Follower Score</div>
                  <div className="score-subtitle">How likely this converts to follows</div>
                  <div className="score-label-badge" style={{ background: scoreColor(results.followerScore) + '22', color: scoreColor(results.followerScore) }}>{results.followerScoreLabel}</div>
                </div>
              </div>
              <div className="feedback-grid">
                {results.findings?.map((f, i) => (
                  <div key={i} className="feedback-card">
                    <div className="card-header">
                      <div className="card-rank" style={{ color: ic(f.importance) }}>#{f.rank}</div>
                      <div className="card-title-group">
                        <div className="card-category" style={{ color: ic(f.importance) }}>{f.importance} · {f.category}</div>
                        <div className="card-title">{f.title}</div>
                      </div>
                    </div>
                    <div className="psych-fact"><strong>Why it matters:</strong> {f.psychFact}</div>
                    <div className="fix-label">What to do</div>
                    <div className="fix-text">{f.fix}</div>
                  </div>
                ))}
              </div>
              <div className="result-actions">
                <button className="replace-result-btn" onClick={resetAnalyze}>Try another video</button>
                <button className="retry-btn" onClick={resetAnalyze}>New Analysis</button>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'conversion' && (
        <>
          {!convResults && !convLoading && !convFile && (
            <section className="hero">
              <div className="hero-eyebrow">AI-Powered Funnel Analysis</div>
              <h1>Know exactly how well this <em>converts.</em></h1>
              <p>Upload your ad or business video. Tell us where it sits in your funnel. We tell you exactly how optimized it is — and what's missing.</p>
            </section>
          )}
          <section className="upload-section">
            {!convFile && !convLoading && (
              <div className="upload-flank">
                <div className="flank-col">
                  {analyzeCards.slice(0, 3).map((c, i) => (
                    <div key={i} className="flank-card">
                      <div className="flank-card-name">{c.name}</div>
                      <div className="flank-card-desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div className={`upload-zone ${convDragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setConvDragOver(true); }}
                  onDragLeave={() => setConvDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setConvDragOver(false); if (!isSignedIn) { setShowAuthPrompt(true); return; } handleConvFile(e.dataTransfer.files[0]); }}
                  onClick={() => isSignedIn ? convInputRef.current.click() : setShowAuthPrompt(true)}>
                  <input ref={convInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleConvFile(e.target.files[0])} />
                  <div className="upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <h3>Drop your ad or business video</h3>
                  <p>We analyze it against what drives conversions at your funnel stage.</p>
                  <div className="file-types">{['MP4', 'MOV', 'AVI', 'WEBM'].map(t => <span key={t} className="file-tag">{t}</span>)}</div>
                  <div className="analysis-tags">
                    <span className="atag">Top of Funnel</span>
                    <span className="atag">Mid Funnel</span>
                    <span className="atag">Bottom of Funnel</span>
                  </div>
                </div>
                <div className="flank-col">
                  {analyzeCards.slice(3, 6).map((c, i) => (
                    <div key={i} className="flank-card">
                      <div className="flank-card-name">{c.name}</div>
                      <div className="flank-card-desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {convFile && !convLoading && !convResults && !showConversionQuiz && (
              <>
                <div className="video-preview">
                  <video src={convUrl} controls playsInline style={{ minHeight: "200px" }} />
                  <div className="video-info">
                    <div>
                      <div className="video-filename">{convFile.name}</div>
                      <div className="video-size">{(convFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button className="replace-btn" onClick={() => { setConvFile(null); setConvUrl(null); setConvResults(null); }}>Replace</button>
                  </div>
                </div>
                <div className="platform-select" style={{ marginTop: 20 }}>
                  <h4>Where does this sit in your funnel?</h4>
                  <div className="content-type-grid">
                    {funnelStages.map(fs => (
                      <button key={fs.id} className={`content-type-btn ${funnelStage === fs.id ? 'active' : ''}`} onClick={() => setFunnelStage(fs.id)}>
                        <div className="ct-label">{fs.label}</div>
                        <span className="ct-desc">{fs.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="analyze-btn"
                  onClick={() => { setConversionQuizStep(0); setShowConversionQuiz(true); }}
                  disabled={!funnelStage}
                >
                  {funnelStage ? 'Continue' : 'Select your funnel stage first'}
                </button>
              </>
            )}
            {convFile && !convLoading && !convResults && showConversionQuiz && (
              <ContextQuiz
                questions={CONVERSION_QUESTIONS}
                step={conversionQuizStep}
                setStep={setConversionQuizStep}
                answers={conversionAnswers}
                setAnswers={setConversionAnswers}
                onComplete={() => { setShowConversionQuiz(false); analyzeConversion(); }}
              />
            )}
            {convLoading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <h3>{loadingMsg || 'Analyzing...'}</h3>
                <p>This can take up to a minute — hang tight, it's worth it.</p>
                <div className="loading-steps">
                  {convSteps.map((s, i) => (
                    <div key={i} className={`loading-step ${loadingStep === i + 1 ? 'active' : loadingStep > i + 1 ? 'done' : ''}`}>
                      <div className="step-dot" />{s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          {convResults && (
            <section className="results-section">
              <div className="results-header">
                <h2>Your Conversion Report</h2>
                <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
                  {funnelStage === 'top' ? 'Top of Funnel' : funnelStage === 'middle' ? 'Middle of Funnel' : 'Bottom of Funnel'} · {convResults.findings?.length} findings
                </p>
              </div>
              <div className="scores-row">
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(convResults.conversionScore) }}>
                    {convResults.conversionScore}<span className="score-denom">/100</span>
                  </div>
                  <div className="score-title">Conversion Score</div>
                  <div className="score-subtitle">How optimized this is for your funnel stage</div>
                  <div className="score-label-badge" style={{ background: scoreColor(convResults.conversionScore) + '22', color: scoreColor(convResults.conversionScore) }}>{convResults.conversionScoreLabel}</div>
                </div>
                <div className="score-card">
                  <div className="score-number" style={{ color: scoreColor(convResults.funnelFitScore) }}>
                    {convResults.funnelFitScore}<span className="score-denom">/100</span>
                  </div>
                  <div className="score-title">Funnel Fit Score</div>
                  <div className="score-subtitle">How well this matches your funnel stage</div>
                  <div className="score-label-badge" style={{ background: scoreColor(convResults.funnelFitScore) + '22', color: scoreColor(convResults.funnelFitScore) }}>{convResults.funnelFitScoreLabel}</div>
                </div>
              </div>
              <div className="feedback-grid">
                {convResults.findings?.map((f, i) => (
                  <div key={i} className="feedback-card">
                    <div className="card-header">
                      <div className="card-rank" style={{ color: ic(f.importance) }}>#{f.rank}</div>
                      <div className="card-title-group">
                        <div className="card-category" style={{ color: ic(f.importance) }}>{f.importance} · {f.category}</div>
                        <div className="card-title">{f.title}</div>
                      </div>
                    </div>
                    <div className="psych-fact"><strong>Why it matters:</strong> {f.psychFact}</div>
                    <div className="fix-label">What to do</div>
                    <div className="fix-text">{f.fix}</div>
                  </div>
                ))}
              </div>
              <div className="result-actions">
                <button className="replace-result-btn" onClick={resetConv}>Try another video</button>
                <button className="retry-btn" onClick={resetConv}>New Analysis</button>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'rehook' && (
        <section className="tool-section">
          <div className="tool-hero">
            <h2>Re-Hook Me</h2>
            <p>Paste your hook. Tell us what type it is. We rewrite it 5 ways using proven psychological frameworks.</p>
          </div>
          <div className="platform-select" style={{ marginBottom: 20 }}>
            <h4>Hook Type</h4>
            <div className="hook-type-grid">
              <button className={`hook-type-btn ${hookType === 'talking' ? 'active' : ''}`} onClick={() => setHookType('talking')}>
                <div className="hook-type-label">Talking Hook</div>
                <div className="hook-type-desc">The opening spoken line of your video — where you speak directly to camera.</div>
              </button>
              <button className={`hook-type-btn ${hookType === 'typed' ? 'active' : ''}`} onClick={() => setHookType('typed')}>
                <div className="hook-type-label">Typed Hook</div>
                <div className="hook-type-desc">On-screen text over a trending or music video — the viewer reads it.</div>
              </button>
            </div>
          </div>
          <textarea className="script-input" placeholder={hookType === 'typed' ? 'Paste your typed hook or on-screen text here...' : 'Paste your opening line here...'} value={hookScript} onChange={(e) => setHookScript(e.target.value)} rows={3} />
          <textarea className="script-input" placeholder="Optional: What is this video about? Give context so we preserve your message." value={hookContext} onChange={(e) => setHookContext(e.target.value)} rows={3} style={{ marginTop: 10, borderColor: '#C9B8A2' }} />
          <button className="analyze-btn" onClick={() => reHook(false)} disabled={hookLoading || !hookScript.trim()}>{hookLoading ? 'Rewriting...' : 'Rewrite My Hook'}</button>
          {hookLoading && <div className="loading-state"><div className="loading-spinner" /><h3>Rewriting 5 ways...</h3></div>}
          {hookResults && (
            <div className="hook-results">
              <div className="hook-original">
                <div className="hook-original-label">Your original — {hookResults.hookType === 'typed' ? 'Typed Hook' : 'Talking Hook'}</div>
                <div className="hook-original-text">"{hookResults.original}"</div>
              </div>
              <div className="hooks-grid">
                {hookResults.hooks?.map((h, i) => (
                  <div key={i} className="hook-card">
                    <div className="hook-card-header">
                      <span className="hook-style">{h.style}</span>
                      <span className="hook-duration">{hookResults.hookType === 'typed' ? h.wordCount : h.duration}</span>
                    </div>
                    <div className="hook-text">"{h.hook}"</div>
                    <div className="hook-why">{h.why}</div>
                    <button className="copy-btn" onClick={() => copy(h.hook)}>Copy</button>
                  </div>
                ))}
              </div>
              <div className="hook-regenerate-row">
                <button className="hook-regen-btn" onClick={() => reHook(true)} disabled={hookLoading}>
                  {hookLoading ? 'Generating...' : '↻ Generate a different set'}
                </button>
                <div className="hook-regen-note">Uses 1 of your monthly Re-Hooks</div>
                {hookError && <div className="checkout-error" style={{ marginTop: 4 }}>{hookError}</div>}
              </div>
              <button className="retry-btn" style={{ width: '100%', marginTop: 16 }} onClick={() => { setHookResults(null); setHookScript(''); setHookContext(''); setHookLoading(false); setHookError(''); }}>Rewrite Another Hook</button>
            </div>
          )}
        </section>
      )}

      <footer>
        <div className="footer-left">
          <span className="footer-logo">Hook<span>D</span></span>
          <span className="footer-copy">© 2026 HookD. All rights reserved.</span>
        </div>
        <div className="footer-links">
          {isSignedIn && (
            <button className="footer-manage-btn" onClick={handleManageSubscription} disabled={portalLoading}>
              {portalLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
          <a href="/pricing">Pricing</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/accessibility">Accessibility</a>
          <a href="/contact">Contact</a>
        </div>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #EDE6DC; background-image: url('/linen-texture.png'); color: #2B2018; font-family: 'JetBrains Mono', monospace; min-height: 100vh; overflow-x: hidden; letter-spacing: -0.2px; }
        #__next { width: 100vw; overflow-x: hidden; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #DDD0BF; position: sticky; top: 0; background: rgba(245,240,235,0.95); backdrop-filter: blur(10px); z-index: 100; }
        .logo { font-family: 'Archivo Black', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; color: #2B2018; }
        .logo span { color: #8B4A2F; }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .free-badge { background: rgba(139,74,47,0.1); border: 1px solid rgba(139,74,47,0.3); color: #8B4A2F; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
        .nav-signin { background: transparent; border: 1px solid #C9B8A2; color: #2B2018; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        .nav-signin:hover { border-color: #8B4A2F; color: #8B4A2F; }
        .nav-upgrade { background: #2B2018; color: #EDE6DC; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; text-decoration: none; cursor: pointer; border: none; font-family: 'Inter', sans-serif; transition: background 0.2s; }
        .nav-upgrade:hover { background: #4A3829; }
        .tabs-wrapper { border-bottom: 1px solid #DDD0BF; padding: 0 40px; background: #EDE6DC; position: sticky; top: 65px; z-index: 99; }
        .tabs { display: flex; gap: 4px; max-width: 760px; margin: 0 auto; overflow-x: auto; }
        .tab { background: transparent; border: none; color: #888; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; padding: 16px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; }
        .tab:hover { color: #2B2018; }
        .tab.active { color: #8B4A2F; border-bottom-color: #8B4A2F; }
        .hero { padding: 48px 40px 24px; max-width: 900px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #8B4A2F; margin-bottom: 14px; }
        .hero h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(36px, 5.5vw, 60px); font-weight: 800; line-height: 1.02; letter-spacing: -2px; margin-bottom: 16px; color: #2B2018; }
        .hero h1 em { font-style: normal; color: #8B4A2F; }
        .hero p { font-size: 16px; color: #6B5D4F; line-height: 1.6; max-width: 540px; margin: 0 auto 8px; }
        .hero-cta { background: #2B2018; color: #EDE6DC; border: none; padding: 16px 32px; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .hero-cta:hover { background: #4A3829; }
        .upload-section { max-width: 1360px; margin: 0 auto; padding: 0 56px 56px; }
        .upload-flank { display: grid; grid-template-columns: 1fr minmax(420px, 1.3fr) 1fr; gap: 72px; align-items: center; }
        .flank-col { display: flex; flex-direction: column; gap: 28px; }
        .flank-col:first-child { text-align: right; }
        .flank-card { position: relative; background: transparent; border: none; padding: 0; transition: all 0.2s; cursor: default; }
        .flank-card-name { font-family: 'Archivo Black', sans-serif; font-size: 13px; font-weight: 400; margin-bottom: 6px; color: #2B2018; letter-spacing: 0.3px; padding-bottom: 6px; display: inline-block; border-bottom: 2px solid #8B4A2F; }
        .flank-card-desc { font-size: 11px; color: #6B5D4F; line-height: 1.5; }
        .flank-col:last-child .flank-card::before { content: ''; position: absolute; top: 9px; left: -28px; width: 24px; height: 2px; background: #C9B8A2; }
        .flank-col:first-child .flank-card::before { content: ''; position: absolute; top: 9px; right: -28px; width: 24px; height: 2px; background: #C9B8A2; }
        .tool-section { max-width: 760px; margin: 0 auto; padding: 24px 40px 48px; }
        .tool-hero { text-align: center; margin-bottom: 32px; }
        .tool-hero h2 { font-family: 'Archivo Black', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; color: #2B2018; }
        .tool-hero p { color: #666; font-size: 15px; line-height: 1.7; max-width: 500px; margin: 0 auto; }
        .upload-zone { border: 2px dashed #C9B8A2; border-radius: 16px; padding: 36px 40px; text-align: center; cursor: pointer; transition: all 0.2s; background: #F4EEE5; }
        .upload-zone:hover, .upload-zone.drag-over { border-color: #8B4A2F; background: rgba(139,74,47,0.04); }
        .upload-icon { width: 48px; height: 48px; background: #E2D7C8; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
        .upload-zone h3 { font-family: 'Archivo Black', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #2B2018; }
        .upload-zone p { color: #888; font-size: 14px; }
        .file-types { margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .file-tag { background: #E2D7C8; border: 1px solid #C9B8A2; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #888; }
        .analysis-tags { margin-top: 14px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .atag { background: rgba(139,74,47,0.1); border: 1px solid rgba(139,74,47,0.3); color: #8B4A2F; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .video-preview { margin-top: 24px; border-radius: 12px; overflow: hidden; background: #F4EEE5; border: 1px solid #DDD0BF; }
        .video-preview video { width: 100%; min-height: 200px; max-height: 380px; object-fit: contain; display: block; background: #E2D7C8; }
        .video-info { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .video-filename { font-size: 14px; font-weight: 500; word-break: break-all; color: #2B2018; }
        .video-size { font-size: 12px; color: #888; margin-top: 2px; }
        .replace-btn { background: transparent; border: 1px solid #C9B8A2; color: #888; padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; white-space: nowrap; flex-shrink: 0; }
        .replace-btn:hover { border-color: #8B4A2F; color: #8B4A2F; }
        .platform-select { margin-top: 20px; }
        .platform-select h4 { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .content-type-grid { display: flex; flex-direction: column; gap: 10px; }
        .content-type-btn { background: #F4EEE5; border: 1px solid #DDD0BF; color: #888; padding: 14px 16px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 6px; text-align: left; width: 100%; }
        .content-type-btn:hover { border-color: #8B4A2F; color: #2B2018; background: rgba(139,74,47,0.04); }
        .content-type-btn.active { background: rgba(139,74,47,0.08); border-color: #8B4A2F; color: #8B4A2F; }
        .ct-label { font-size: 14px; font-weight: 600; color: inherit; }
        .ct-desc { font-size: 12px; color: #999; line-height: 1.4; }
        .content-type-btn.active .ct-desc { color: rgba(139,74,47,0.7); }
        .hook-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .quiz-wrap { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 16px; padding: 28px 26px; margin-top: 20px; }
        .quiz-progress { display: flex; gap: 6px; margin-bottom: 18px; }
        .quiz-dot { flex: 1; height: 4px; border-radius: 2px; background: #DDD0BF; transition: background 0.2s; }
        .quiz-dot-done { background: #C9B8A2; }
        .quiz-step-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8B7A68; margin-bottom: 10px; font-family: 'Inter', sans-serif; }
        .quiz-question { font-family: 'Archivo Black', sans-serif; font-size: 22px; font-weight: 700; line-height: 1.3; color: #2B2018; margin-bottom: 8px; }
        .quiz-helper { font-size: 13px; color: #8B7A68; line-height: 1.5; margin-bottom: 18px; font-family: 'Inter', sans-serif; }
        .quiz-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .quiz-option-btn { background: #FFFFFF; border: 1.5px solid #DDD0BF; color: #6B5D4F; padding: 10px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .quiz-option-btn:hover { border-color: #8B4A2F; }
        .quiz-freetext { width: 100%; background: #FFFFFF; border: 1.5px solid #DDD0BF; border-radius: 10px; padding: 14px 16px; font-size: 14px; color: #2B2018; font-family: 'Inter', sans-serif; margin-bottom: 4px; }
        .quiz-freetext:focus { outline: none; border-color: #8B4A2F; }
        .quiz-nav-row { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
        .quiz-back-btn { background: transparent; border: 1px solid #C9B8A2; color: #8B7A68; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
        .quiz-back-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .quiz-skip-btn { background: transparent; border: none; color: #AAA; padding: 12px 14px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; text-decoration: underline; }
        .quiz-next-btn { margin-left: auto; background: #8B4A2F; color: #EDE6DC; border: none; padding: 12px 28px; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; }
        .quiz-next-btn:disabled { background: #C9B8A2; color: #999; cursor: not-allowed; }
        .hook-type-btn { background: #F4EEE5; border: 1px solid #DDD0BF; color: #888; padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; text-align: left; }
        .hook-type-btn:hover { border-color: #8B4A2F; color: #2B2018; background: rgba(139,74,47,0.04); }
        .hook-type-btn.active { background: rgba(139,74,47,0.08); border-color: #8B4A2F; color: #8B4A2F; }
        .hook-type-label { font-size: 14px; font-weight: 700; margin-bottom: 6px; color: inherit; }
        .hook-type-desc { font-size: 12px; color: #999; line-height: 1.5; }
        .hook-type-btn.active .hook-type-desc { color: rgba(139,74,47,0.7); }
        .analyze-btn { display: block; width: 100%; margin-top: 20px; padding: 18px; background: #2B2018; color: #EDE6DC; border: none; border-radius: 12px; font-family: 'Archivo Black', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .analyze-btn:hover { background: #4A3829; }
        .analyze-btn:disabled { background: #C9B8A2; color: #999; cursor: not-allowed; }
        .script-input { width: 100%; background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 12px; padding: 16px; color: #2B2018; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; resize: vertical; transition: border-color 0.2s; }
        .script-input:focus { outline: none; border-color: #8B4A2F; }
        .script-input::placeholder { color: #AAA; }
        .loading-state { text-align: center; padding: 60px 20px; }
        .loading-spinner { width: 48px; height: 48px; border: 3px solid #DDD0BF; border-top-color: #8B4A2F; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state h3 { font-family: 'Archivo Black', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #2B2018; }
        .loading-state p { color: #8B4A2F; font-size: 14px; font-weight: 500; }
        .loading-steps { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin-left: auto; margin-right: auto; }
        .loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #888; text-align: left; padding: 10px 14px; background: #F4EEE5; border-radius: 8px; border: 1px solid #DDD0BF; opacity: 0.4; transition: all 0.3s; }
        .loading-step.active { opacity: 1; color: #2B2018; border-color: #8B4A2F; }
        .loading-step.done { opacity: 1; color: #6B7A4F; border-color: rgba(107,122,79,0.3); }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .results-section { max-width: 760px; margin: 0 auto; padding: 24px 40px 48px; }
        .results-header { margin-bottom: 24px; }
        .results-header h2 { font-family: 'Archivo Black', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #2B2018; }
        .scores-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
        .score-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 24px; text-align: center; }
        .score-number { font-family: 'Archivo Black', sans-serif; font-size: 52px; font-weight: 800; line-height: 1; margin-bottom: 8px; }
        .score-denom { font-size: 22px; font-weight: 400; opacity: 0.45; margin-left: 2px; }
        .score-title { font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 4px; color: #2B2018; }
        .score-subtitle { font-size: 12px; color: #888; line-height: 1.4; margin-bottom: 12px; }
        .score-label-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .feedback-grid { display: flex; flex-direction: column; gap: 16px; }
        .feedback-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 24px; }
        .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .card-rank { font-family: 'Archivo Black', sans-serif; font-size: 22px; font-weight: 800; flex-shrink: 0; line-height: 1; }
        .card-title-group { flex: 1; }
        .card-category { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .card-title { font-family: 'Archivo Black', sans-serif; font-size: 17px; font-weight: 700; line-height: 1.3; color: #2B2018; }
        .psych-fact { background: #E2D7C8; border-left: 3px solid #C9B8A2; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 16px; }
        .psych-fact strong { color: #2B2018; font-weight: 600; }
        .fix-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6B7A4F; margin-bottom: 8px; }
        .fix-text { font-size: 14px; color: #2B2018; line-height: 1.8; background: rgba(107,122,79,0.06); border: 1px solid rgba(107,122,79,0.2); padding: 14px 16px; border-radius: 8px; }
        .result-actions { display: flex; gap: 12px; margin-top: 32px; }
        .replace-result-btn { flex: 1; padding: 16px; background: transparent; color: #888; border: 1px solid #C9B8A2; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; }
        .replace-result-btn:hover { border-color: #8B4A2F; color: #8B4A2F; }
        .retry-btn { flex: 1; padding: 16px; background: #2B2018; color: #EDE6DC; border: none; border-radius: 12px; font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; }
        .retry-btn:hover { background: #4A3829; }
        .hook-results { margin-top: 24px; }
        .hook-original { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .hook-original-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #AAA; margin-bottom: 8px; }
        .hook-original-text { font-size: 16px; color: #888; font-style: italic; }
        .hooks-grid { display: flex; flex-direction: column; gap: 16px; }
        .hook-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 20px; }
        .hook-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .hook-style { font-family: 'Archivo Black', sans-serif; font-size: 14px; font-weight: 700; color: #8B4A2F; }
        .hook-duration { font-size: 12px; color: #AAA; background: #E2D7C8; padding: 3px 8px; border-radius: 6px; }
        .hook-text { font-size: 18px; font-weight: 600; line-height: 1.5; margin-bottom: 12px; color: #2B2018; }
        .hook-why { font-size: 13px; color: #888; line-height: 1.6; margin-bottom: 16px; }
        .copy-btn { background: transparent; border: 1px solid #C9B8A2; color: #888; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .copy-btn:hover { border-color: #6B7A4F; color: #6B7A4F; }
        .hook-regenerate-row { margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .hook-regen-btn { width: 100%; padding: 16px; background: transparent; color: #8B4A2F; border: 1px solid #8B4A2F; border-radius: 12px; font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .hook-regen-btn:hover { background: rgba(139,74,47,0.06); }
        .hook-regen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .hook-regen-note { font-size: 11px; color: #AAA; font-family: 'Inter', sans-serif; }
        .checkout-error { background: rgba(139,74,47,0.08); border: 1px solid rgba(139,74,47,0.3); color: #8B4A2F; font-size: 13px; padding: 10px 14px; border-radius: 8px; text-align: center; font-family: 'Inter', sans-serif; }
        footer { border-top: 1px solid #DDD0BF; padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .footer-left { display: flex; align-items: center; gap: 16px; }
        .footer-logo { font-family: 'Archivo Black', sans-serif; font-weight: 800; font-size: 16px; color: #2B2018; }
        .footer-logo span { color: #8B4A2F; }
        .footer-copy { font-size: 12px; color: #AAA; }
        .footer-links { display: flex; gap: 20px; align-items: center; }
        .footer-manage-btn { background: transparent; border: 1px solid #C9B8A2; color: #8B4A2F; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        .footer-manage-btn:hover { border-color: #8B4A2F; background: rgba(139,74,47,0.08); }
        .footer-manage-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .footer-links a { font-size: 13px; color: #888; text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #8B4A2F; }
        .modal { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 20px; padding: 40px 20px; max-width: 620px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }
        .modal h2 { font-family: 'Archivo Black', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; color: #2B2018; }
        .modal p { font-size: 14px; color: #888; line-height: 1.7; margin-bottom: 28px; }
        .modal-btn-primary { display: block; width: 100%; padding: 16px; background: #2B2018; color: #EDE6DC; border: none; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 12px; transition: background 0.2s; }
        .modal-btn-primary:hover { background: #4A3829; }
        .modal-btn-secondary { display: block; width: 100%; padding: 14px; background: transparent; color: #888; border: 1px solid #C9B8A2; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 14px; cursor: pointer; margin-bottom: 12px; transition: all 0.2s; }
        .modal-btn-secondary:hover { border-color: #8B4A2F; color: #2B2018; }
        .modal-dismiss { background: transparent; border: none; color: #AAA; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
        .modal-dismiss:hover { color: #888; }
        .paywall-plans { display: flex; flex-direction: row; gap: 8px; margin-bottom: 32px; width: 100%; justify-content: center; align-items: stretch; }
        .paywall-plan { background: #E2D7C8; border: 1px solid #C9B8A2; border-radius: 10px; padding: 12px 6px; cursor: pointer; transition: all 0.15s; position: relative; box-sizing: border-box; flex: 1; min-width: 0; }
        .paywall-plan:hover { border-color: #8B4A2F; }
        .paywall-plan.highlighted { border-color: #8B4A2F; background: rgba(139,74,47,0.08); }
        .paywall-popular { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #8B4A2F; color: white; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 10px; white-space: nowrap; text-transform: uppercase; }
        .paywall-plan-name { font-family: 'Archivo Black', sans-serif; font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #2B2018; }
        .paywall-plan-price { font-family: 'Archivo Black', sans-serif; font-size: 18px; font-weight: 800; color: #8B4A2F; margin-bottom: 4px; }
        .paywall-plan-desc { font-size: 10px; color: #888; line-height: 1.3; }
        @media (max-width: 600px) {
          nav { padding: 16px 20px; }
          .hero { padding: 48px 20px 40px; }
          .upload-section, .tool-section, .results-section { padding: 0 20px 60px; }
          .upload-flank { grid-template-columns: 1fr; gap: 20px; }
          .flank-col:first-child { text-align: left; }
          .flank-card::before { display: none !important; }
          .flank-col { flex-direction: column; }
          .upload-zone { padding: 40px 20px; }
          .result-actions { flex-direction: column; }
          .tabs-wrapper { padding: 0 20px; }
          .scores-row { grid-template-columns: 1fr; }
          .paywall-plans { flex-direction: column; }
          .hook-type-grid { grid-template-columns: 1fr; }
          footer { flex-direction: column; gap: 16px; padding: 20px; text-align: center; }
        }
      `}</style>
    </>
  );
}
