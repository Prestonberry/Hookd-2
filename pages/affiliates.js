import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Affiliates() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Affiliate Program</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
        <a href="/pricing" className="nav-link">View Pricing</a>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow">Affiliate Program</div>
        <h1>Get paid <em>every month</em> — forever</h1>
        <p>Most affiliate programs pay you once. We pay you 15% of every subscription, every single month, for as long as your referral stays subscribed. Refer once. Earn forever.</p>
        <a href="https://hookd.getrewardful.com" target="_blank" rel="noopener noreferrer" className="hero-btn">Apply to Join →</a>
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
            { icon: '💸', title: '15% recurring commission', desc: 'On every plan — Creator, Pro, and Agency. Same rate across the board.' },
            { icon: '📅', title: 'Monthly payouts', desc: 'Commissions are calculated and paid out automatically every month via PayPal.' },
            { icon: '$50', title: '$50 minimum payout', desc: 'We send payments once you hit $50 in earned commissions to keep things clean.' },
            { icon: '✋', title: 'Manual approval', desc: 'We review every application to make sure our affiliates are a good fit for HookD.' },
            { icon: '📊', title: 'Real-time dashboard', desc: 'Track your clicks, signups, and earnings in real time through your affiliate dashboard.' },
            { icon: '❌', title: 'No cap on earnings', desc: 'There is no limit to how much you can earn. The more you refer, the more you make.' },
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
        <a href="https://hookd.getrewardful.com" target="_blank" rel="noopener noreferrer" className="cta-btn">Apply Now →</a>
        <div className="cta-sub">Manual approval · Recurring commission · No cap on earnings</div>
      </section>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A; color: #FAFAFA; font-family: 'Inter', sans-serif; min-height: 100vh; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #2A2A2A; background: rgba(10,10,10,0.95); backdrop-filter: blur(10px); }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
        .logo span { color: #FF3B00; }
        .nav-link { color: #888; font-size: 14px; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #FF3B00; }
        .hero { padding: 80px 40px 60px; max-width: 760px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #FF3B00; margin-bottom: 24px; }
        .hero h1 { font-family: 'Syne', sans-serif; font-size: clamp(36px, 5vw, 60px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 20px; }
        .hero h1 em { font-style: normal; color: #FF3B00; }
        .hero p { font-size: 16px; color: #888; line-height: 1.7; max-width: 560px; margin: 0 auto 32px; }
        .hero-btn { display: inline-block; background: #FF3B00; color: white; padding: 16px 32px; border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; transition: background 0.2s; }
        .hero-btn:hover { background: #e03400; }
        .how-section, .details-section, .cta-section { max-width: 900px; margin: 0 auto; padding: 60px 40px; border-top: 1px solid #2A2A2A; }
        h2 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 32px; }
        .steps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .step-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 24px; }
        .step-number { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #FF3B00; letter-spacing: 2px; margin-bottom: 12px; }
        .step-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .step-desc { font-size: 13px; color: #888; line-height: 1.6; }
        .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .detail-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px; }
        .detail-icon { font-size: 20px; margin-bottom: 10px; font-family: 'Syne', sans-serif; font-weight: 800; color: #FF3B00; }
        .detail-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .detail-desc { font-size: 12px; color: #888; line-height: 1.6; }
        .cta-section { text-align: center; }
        .cta-section p { color: #888; font-size: 16px; line-height: 1.7; max-width: 500px; margin: -16px auto 32px; }
        .cta-btn { display: inline-block; background: #FF3B00; color: white; padding: 18px 40px; border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; text-decoration: none; transition: background 0.2s; margin-bottom: 16px; }
        .cta-btn:hover { background: #e03400; }
        .cta-sub { font-size: 13px; color: #555; }
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
