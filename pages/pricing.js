import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

const plans = [
 {
   id: 'creator',
   name: 'Creator',
   price: 14.99,
   priceId: 'price_1ThopBKHHjJwCkb0ClazXGvV',
   emoji: '🔥',
   description: 'For individual creators serious about growth',
   features: [
     '20 Virality Score analyses/month',
     '20 Re-Hook Me rewrites/month',
     'Scroll Score + Follower Score',
     'Top 5 ranked findings per video',
     'Priority action list',
   ],
   cta: 'Start Creating',
   highlight: false,
 },
 {
   id: 'pro',
   name: 'Pro',
   price: 49.99,
   priceId: 'price_1ThorgKHHjJwCkb0y5ZZDr0K',
   emoji: '💰',
   description: 'For creators and businesses who need conversion insights',
   features: [
     '50 Virality Score analyses/month',
     '50 Re-Hook Me rewrites/month',
     '20 Conversion Score analyses/month',
     'Full funnel stage analysis',
     'Campaign-aware feedback',
     'All Creator features included',
   ],
   cta: 'Go Pro',
   highlight: true,
 },
 {
   id: 'agency',
   name: 'Agency',
   price: 99.99,
   priceId: 'price_1ThotBKHHjJwCkb02iwgGEai',
   emoji: '🏢',
   description: 'For agencies and teams managing multiple clients',
   features: [
     '150 Virality Score analyses/month',
     '150 Re-Hook Me rewrites/month',
     '75 Conversion Score analyses/month',
     'Full funnel stage analysis',
     'Campaign-aware feedback',
     'Priority support',
     'All Pro features included',
   ],
   cta: 'Scale Up',
   highlight: false,
 },
];

export default function Pricing() {
 const [loading, setLoading] = useState(null);
 const router = useRouter();

 const handleCheckout = async (plan) => {
   setLoading(plan.id);
   try {
     const res = await fetch('/api/create-checkout', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ priceId: plan.priceId, plan: plan.id }),
     });
     const data = await res.json();
     if (data.url) window.location.href = data.url;
   } catch (err) {
     console.error(err);
   } finally {
     setLoading(null);
   }
 };

 return (
   <>
     <Head>
       <title>HookD — Pricing</title>
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
     </Head>

     <nav>
       <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
       <a href="/affiliates" className="nav-link">Affiliate Program</a>
     </nav>

     <section className="hero">
       <div className="hero-eyebrow">Simple, Transparent Pricing</div>
       <h1>Invest in your <em>growth</em></h1>
       <p>No hidden fees. No long term contracts. Cancel anytime. Every plan includes a 3-analysis free trial.</p>
     </section>

     <section className="plans-section">
       <div className="plans-grid">
         {plans.map((plan) => (
           <div key={plan.id} className={`plan-card ${plan.highlight ? 'highlighted' : ''}`}>
             {plan.highlight && <div className="popular-badge">Most Popular</div>}
             <div className="plan-emoji">{plan.emoji}</div>
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
               className={`plan-btn ${plan.highlight ? 'plan-btn-primary' : 'plan-btn-secondary'}`}
               onClick={() => handleCheckout(plan)}
               disabled={loading === plan.id}
             >
               {loading === plan.id ? 'Loading...' : plan.cta}
             </button>
           </div>
         ))}
       </div>

       <div className="guarantee">
         <div className="guarantee-icon">🛡️</div>
         <div>
           <div className="guarantee-title">3 free analyses — no credit card required</div>
           <div className="guarantee-sub">Try HookD before you commit. Upgrade only when you're ready.</div>
         </div>
       </div>

       <div className="affiliate-cta">
         <div className="affiliate-cta-text">
           <div className="affiliate-cta-title">Know other creators or agencies?</div>
           <div className="affiliate-cta-sub">Earn 15% recurring commission every month — forever — for every person you refer.</div>
         </div>
         <a href="/affiliates" className="affiliate-cta-btn">Join Affiliate Program →</a>
       </div>
     </section>

     <style jsx global>{`
       * { box-sizing: border-box; margin: 0; padding: 0; }
       body { background: #0A0A0A; color: #FAFAFA; font-family: 'Inter', sans-serif; min-height: 100vh; }
       nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #2A2A2A; background: rgba(10,10,10,0.95); backdrop-filter: blur(10px); }
       .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
       .logo span { color: #FF3B00; }
       .nav-link { color: #888; font-size: 14px; text-decoration: none; transition: color 0.2s; }
       .nav-link:hover { color: #FF3B00; }
       .hero { padding: 80px 40px 60px; max-width: 700px; margin: 0 auto; text-align: center; }
       .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #FF3B00; margin-bottom: 24px; }
       .hero h1 { font-family: 'Syne', sans-serif; font-size: clamp(36px, 5vw, 56px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 20px; }
       .hero h1 em { font-style: normal; color: #FF3B00; }
       .hero p { font-size: 16px; color: #888; line-height: 1.7; }
       .plans-section { width: 100%; margin: 0 auto; padding: 0 10px 80px; }
       .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr) !important; gap: 10px; margin-bottom: 40px; }
       .plan-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 16px; padding: 24px 16px; position: relative; display: flex; flex-direction: column; min-width: 0; }
       .plan-card.highlighted { border-color: #FF3B00; background: #1A0A0A; }
       .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #FF3B00; color: white; font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; }
       .plan-emoji { font-size: 28px; margin-bottom: 12px; }
       .plan-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; margin-bottom: 8px; }
       .plan-desc { font-size: 12px; color: #666; line-height: 1.5; margin-bottom: 20px; }
       .plan-price { display: flex; align-items: baseline; gap: 2px; margin-bottom: 20px; }
       .price-dollar { font-size: 18px; font-weight: 600; color: #888; }
       .price-amount { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; line-height: 1; }
       .price-period { font-size: 13px; color: #666; margin-left: 4px; }
       .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; flex: 1; }
       .plan-features li { font-size: 13px; color: #FAFAFA; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
       .check { color: #00E87A; font-weight: 700; flex-shrink: 0; }
       .plan-btn { width: 100%; padding: 14px; border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; }
       .plan-btn-primary { background: #FF3B00; color: white; }
       .plan-btn-primary:hover { background: #e03400; }
       .plan-btn-secondary { background: transparent; color: #FAFAFA; border: 1px solid #2A2A2A; }
       .plan-btn-secondary:hover { border-color: #FF3B00; color: #FF3B00; }
       .plan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
       .guarantee { display: flex; align-items: center; gap: 16px; background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; }
       .guarantee-icon { font-size: 28px; }
       .guarantee-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 4px; }
       .guarantee-sub { font-size: 13px; color: #888; }
       .affiliate-cta { display: flex; align-items: center; justify-content: space-between; gap: 20px; background: rgba(255,59,0,0.06); border: 1px solid rgba(255,59,0,0.2); border-radius: 14px; padding: 24px 28px; flex-wrap: wrap; }
       .affiliate-cta-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
       .affiliate-cta-sub { font-size: 13px; color: #888; }
       .affiliate-cta-btn { background: #FF3B00; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; }
       .affiliate-cta-btn:hover { background: #e03400; }
     `}</style>
   </>
 );
}
