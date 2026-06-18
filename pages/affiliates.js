import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Affiliates() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Affiliate Program</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
        <a href="/pricing" className="nav-link">View Pricing</a>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow">Affiliate Program</div>
        <h1>Get paid <em>every month</em> — forever</h1>
        <p>Most affiliate programs pay you once. We pay you 15% of every subscription, every single month, for as long as your referral stays subscribed. Refer once. Earn forever.</p>
        <button className="hero-btn hero-btn-disabled" disabled>Coming Soon</button>
      </section>

      <section className="how-section">
        <h2>How it works</h2>
        <div className="steps-grid">
          {[
            { step: '01', title: 'Apply & get approved', desc: 'Fill out a quick application. We manually review every affiliate to keep the program quality high.' },
            { step: '02', title: 'Get your unique link', desc: 'Once approved you get a personal referral link that tracks every signup you send our way.' },
            { step: '03', title: 'Share HookD', desc: 'Share your link with your audience — creators, agencies, marketers, anyone who makes video content.' },
            { step: '04', title: 'Earn every month', desc: 'Every time your referral pays their monthly subscription, 15% goes to you. Automatically. Forever.' },
          ].map((s) => (
            <div key={s.step} className="step-card">
              <div className="step-number">{s.step}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="details-section">
        <h2>Program details</h2>
        <div className="details-grid">
          {[
            { icon: 'PCT', title: '15% recurring commission', desc: 'On every plan — Creator, Pro, and Agency. Same rate across the board.' },
            { icon: 'MO', title: 'Monthly payouts', desc: 'Commissions are calculated and paid out automatically every month via PayPal.' },
            { icon: '$50', title: '$50 minimum payout', desc: 'We send payments once you hit $50 in earned commissions to keep things clean.' },
            { icon: 'OK', title: 'Manual approval', desc: 'We review every application to make sure our affiliates are a good fit for HookD.' },
            { icon: 'LIVE', title: 'Real-time dashboard', desc: 'Track your clicks, signups, and earnings in real time through your affiliate dashboard.' },
            { icon: 'MAX', title: 'No cap on earnings', desc: 'There is no limit to how much you can earn. The more you refer, the more you make.' },
          ].map((d, i) => (
            <div key={i} className="detail-card">
              <div className="detail-icon">{d.icon}</div>
              <div className="detail-title">{d.title}</div>
              <div className="detail-desc">{d.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to earn?</h2>
        <p>Join the HookD affiliate program and start earning recurring income from every creator and agency you refer.</p>
        <button className="cta-btn cta-btn-disabled" disabled>Coming Soon</button>
        <div className="cta-sub">Manual approval · Recurring commission · No cap on earnings</div>
      </section>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #EDE6DC; background-image: url('data:image/png;base64,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'); color: #2B2018; font-family: 'JetBrains Mono', monospace; min-height: 100vh; overflow-x: hidden; letter-spacing: -0.2px; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #DDD0BF; position: sticky; top: 0; background: rgba(245,240,235,0.95); backdrop-filter: blur(10px); z-index: 100; }
        .logo { font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 22px; letter-spacing: -0.5px; color: #2B2018; }
        .logo span { color: #8B4A2F; }
        .nav-link { color: #8B7A68; font-size: 14px; text-decoration: none; transition: color 0.2s; font-family: 'JetBrains Mono', monospace; }
        .nav-link:hover { color: #8B4A2F; }
        .hero { padding: 64px 40px 56px; max-width: 760px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #8B4A2F; margin-bottom: 24px; font-family: 'JetBrains Mono', monospace; }
        .hero h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(36px, 5vw, 60px); font-weight: 400; line-height: 1.05; letter-spacing: -2px; margin-bottom: 20px; color: #2B2018; }
        .hero h1 em { font-style: normal; color: #8B4A2F; }
        .hero p { font-size: 15px; color: #5C5043; line-height: 1.7; max-width: 560px; margin: 0 auto 32px; font-family: 'Inter', sans-serif; }
        .hero-btn { display: inline-block; background: #8B4A2F; color: #EDE6DC; padding: 16px 32px; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 16px; font-weight: 400; text-decoration: none; transition: background 0.2s; border: none; cursor: pointer; letter-spacing: -0.3px; }
        .hero-btn:hover { background: #743C26; }
        .hero-btn-disabled, .hero-btn-disabled:hover { background: #E2D7C8; color: #A89A88; cursor: not-allowed; border: 1px solid #DDD0BF; }
        .cta-btn-disabled, .cta-btn-disabled:hover { background: #E2D7C8; color: #A89A88; cursor: not-allowed; border: 1px solid #DDD0BF; }
        .how-section, .details-section, .cta-section { max-width: 900px; margin: 0 auto; padding: 56px 40px; border-top: 1px solid #DDD0BF; }
        h2 { font-family: 'Archivo Black', sans-serif; font-size: 28px; font-weight: 400; letter-spacing: -0.5px; margin-bottom: 32px; color: #2B2018; }
        .steps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .step-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 24px; transition: all 0.2s; }
        .step-card:hover { border-color: #C9B8A2; transform: translateY(-2px); }
        .step-number { font-family: 'Archivo Black', sans-serif; font-size: 13px; font-weight: 400; color: #8B4A2F; letter-spacing: 2px; margin-bottom: 12px; }
        .step-title { font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 400; margin-bottom: 8px; color: #2B2018; letter-spacing: -0.3px; }
        .step-desc { font-size: 13px; color: #8B7A68; line-height: 1.6; font-family: 'Inter', sans-serif; }
        .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .detail-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 20px; transition: all 0.2s; }
        .detail-card:hover { border-color: #C9B8A2; transform: translateY(-2px); }
        .detail-icon { font-size: 14px; margin-bottom: 10px; font-family: 'Archivo Black', sans-serif; font-weight: 400; color: #8B4A2F; letter-spacing: 1px; }
        .detail-title { font-family: 'Archivo Black', sans-serif; font-size: 14px; font-weight: 400; margin-bottom: 6px; color: #2B2018; letter-spacing: -0.3px; }
        .detail-desc { font-size: 12px; color: #8B7A68; line-height: 1.6; font-family: 'Inter', sans-serif; }
        .cta-section { text-align: center; }
        .cta-section p { color: #5C5043; font-size: 15px; line-height: 1.7; max-width: 500px; margin: -16px auto 32px; font-family: 'Inter', sans-serif; }
        .cta-btn { display: inline-block; background: #8B4A2F; color: #EDE6DC; padding: 18px 40px; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 18px; font-weight: 400; text-decoration: none; transition: background 0.2s; margin-bottom: 16px; border: none; cursor: pointer; letter-spacing: -0.3px; }
        .cta-btn:hover { background: #743C26; }
        .cta-sub { font-size: 13px; color: #8B7A68; font-family: 'JetBrains Mono', monospace; }
        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .hero { padding: 48px 20px 40px; }
          .how-section, .details-section, .cta-section { padding: 40px 20px; }
          .steps-grid, .details-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
