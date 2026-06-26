import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

const plan = {
  id: 'creator',
  name: 'HookD',
  price: 14.99,
  priceId: 'price_1ThopBKHHjJwCkb0CIazXGvV',
  description: 'Everything you need to make content that performs',
  features: [
    '20 Virality Score analyses/month',
    '15 Conversion Score analyses/month',
    '100 Re-Hook Me rewrites/month',
    'Scroll Score + Follower Score',
    'Full funnel stage analysis',
    'Top 5 ranked findings per video',
    'Priority action list',
  ],
  cta: 'Get Started',
};

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, plan: plan.id }),
      });
      const data = await res.json();

      // New checkout session — redirect to Stripe.
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      // Existing subscriber being updated in place — redirect to success.
      if (data.upgraded && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      // Anything else means the server returned an error instead of a URL.
      setError(data.error || 'Could not start checkout. Please try again.');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>HookD — Pricing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
        <a href="/affiliates" className="nav-link">Affiliate Program</a>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow">Simple, Transparent Pricing</div>
        <h1>One plan. <em>Everything</em> included.</h1>
        <p>No tiers, no upsells, no hidden fees. Cancel anytime. Every account starts with a 3-analysis free trial.</p>
      </section>

      <section className="plans-section">
        <div className="single-plan-wrap">
          <div className="plan-card highlighted">
            <div className="popular-badge">All Access</div>
            <div className="plan-name">{plan.name}</div>
            <div className="plan-desc">{plan.description}</div>
            <div className="plan-price">
              <span className="price-dollar">$</span>
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/month</span>
            </div>
            <ul className="plan-features">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <span className="check">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              className="plan-btn plan-btn-primary"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Loading...' : plan.cta}
            </button>
            {error && <div className="checkout-error">{error}</div>}
          </div>
        </div>
      </section>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #EDE6DC; background-image: url('data:image/png;base64,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'); color: #2B2018; font-family: 'JetBrains Mono', monospace; min-height: 100vh; overflow-x: hidden; letter-spacing: -0.2px; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #DDD0BF; position: sticky; top: 0; background: rgba(245,240,235,0.95); backdrop-filter: blur(10px); z-index: 100; }
        .logo { font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 22px; letter-spacing: -0.5px; color: #2B2018; }
        .logo span { color: #8B4A2F; }
        .nav-link { color: #8B7A68; font-size: 14px; text-decoration: none; transition: color 0.2s; font-family: 'JetBrains Mono', monospace; }
        .nav-link:hover { color: #8B4A2F; }
        .hero { padding: 64px 40px 48px; max-width: 700px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #8B4A2F; margin-bottom: 24px; font-family: 'JetBrains Mono', monospace; }
        .hero h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(36px, 5vw, 56px); font-weight: 400; line-height: 1.05; letter-spacing: -2px; margin-bottom: 20px; color: #2B2018; }
        .hero h1 em { font-style: normal; color: #8B4A2F; }
        .hero p { font-size: 15px; color: #5C5043; line-height: 1.7; font-family: 'Inter', sans-serif; }
        .plans-section { max-width: 1100px; margin: 0 auto; padding: 0 40px 80px; }
        .single-plan-wrap { display: flex; justify-content: center; margin-bottom: 40px; }
        .plan-card { background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 16px; padding: 40px 36px; position: relative; display: flex; flex-direction: column; transition: all 0.2s; width: 100%; max-width: 440px; }
        .plan-card:hover { border-color: #C9B8A2; transform: translateY(-3px); }
        .plan-card.highlighted { border-color: #8B4A2F; border-width: 2px; background: #F4EEE5; }
        .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #8B4A2F; color: #EDE6DC; font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; font-family: 'JetBrains Mono', monospace; }
        .plan-name { font-family: 'Archivo Black', sans-serif; font-size: 26px; font-weight: 400; margin-bottom: 8px; color: #2B2018; }
        .plan-desc { font-size: 13px; color: #8B7A68; line-height: 1.5; margin-bottom: 24px; font-family: 'Inter', sans-serif; }
        .plan-price { display: flex; align-items: baseline; gap: 2px; margin-bottom: 28px; }
        .price-dollar { font-size: 20px; font-weight: 600; color: #8B7A68; }
        .price-amount { font-family: 'Archivo Black', sans-serif; font-size: 52px; font-weight: 400; line-height: 1; color: #2B2018; }
        .price-period { font-size: 14px; color: #8B7A68; margin-left: 4px; font-family: 'Inter', sans-serif; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; flex: 1; }
        .plan-features li { font-size: 14px; color: #2B2018; display: flex; align-items: flex-start; gap: 10px; line-height: 1.4; font-family: 'Inter', sans-serif; }
        .check { color: #6B7A4F; font-weight: 700; flex-shrink: 0; }
        .plan-btn { width: 100%; padding: 16px; border-radius: 10px; font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 400; cursor: pointer; transition: all 0.2s; border: none; letter-spacing: -0.3px; }
        .plan-btn-primary { background: #8B4A2F; color: #EDE6DC; }
        .plan-btn-primary:hover { background: #743C26; }
        .plan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .checkout-error { margin-top: 14px; background: rgba(139,74,47,0.08); border: 1px solid rgba(139,74,47,0.3); color: #8B4A2F; font-size: 13px; padding: 10px 14px; border-radius: 8px; text-align: center; font-family: 'Inter', sans-serif; }
        .guarantee { display: flex; align-items: center; gap: 16px; background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; }
        .guarantee-icon { font-size: 28px; }
        .guarantee-title { font-family: 'Archivo Black', sans-serif; font-size: 14px; font-weight: 400; margin-bottom: 4px; color: #2B2018; }
        .guarantee-sub { font-size: 13px; color: #8B7A68; font-family: 'Inter', sans-serif; }
        .affiliate-cta { display: flex; align-items: center; justify-content: space-between; gap: 20px; background: rgba(139,74,47,0.06); border: 1px solid rgba(139,74,47,0.2); border-radius: 14px; padding: 24px 28px; flex-wrap: wrap; }
        .affiliate-cta-title { font-family: 'Archivo Black', sans-serif; font-size: 15px; font-weight: 400; margin-bottom: 4px; color: #2B2018; }
        .affiliate-cta-sub { font-size: 13px; color: #8B7A68; font-family: 'Inter', sans-serif; }
        .affiliate-cta-btn { background: #8B4A2F; color: #EDE6DC; border: none; padding: 12px 24px; border-radius: 8px; font-family: 'Archivo Black', sans-serif; font-size: 13px; font-weight: 400; cursor: pointer; text-decoration: none; white-space: nowrap; letter-spacing: -0.3px; }
        .affiliate-cta-btn:hover { background: #743C26; }
        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .hero { padding: 48px 20px 40px; }
          .plans-section { padding: 0 20px 60px; }
          .affiliate-cta { flex-direction: column; }
          .affiliate-cta-btn { width: 100%; text-align: center; }
        }
      `}</style>
    </>
  );
}
