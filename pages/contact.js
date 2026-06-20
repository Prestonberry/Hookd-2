import Head from 'next/head';
import Link from 'next/link';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact — HookD</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <Link href="/" className="logo">Hook<span>D</span></Link>
      </nav>

      <main className="contact-wrap">
        <h1>Contact</h1>
        <p className="sub">Questions, feedback, or something broken? Reach out.</p>

        <a href="mailto:hookdvideos@outlook.com" className="email-card">
          hookdvideos@outlook.com
        </a>

        <Link href="/" className="back-link">← Back to HookD</Link>
      </main>

      <footer>
        <div className="footer-left">
          <span className="footer-logo">Hook<span>D</span></span>
          <span className="footer-copy">© 2026 HookD. All rights reserved.</span>
        </div>
        <div className="footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #EDE6DC; background-image: url('/linen-texture.png'); color: #2B2018; font-family: 'JetBrains Mono', monospace; min-height: 100vh; overflow-x: hidden; letter-spacing: -0.2px; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #DDD0BF; background: rgba(245,240,235,0.95); backdrop-filter: blur(10px); }
        .logo { font-family: 'Archivo Black', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; color: #2B2018; text-decoration: none; }
        .logo span { color: #8B4A2F; }
        .contact-wrap { max-width: 560px; margin: 0 auto; padding: 80px 40px 100px; text-align: center; }
        .contact-wrap h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -1px; margin-bottom: 14px; color: #2B2018; }
        .contact-wrap .sub { font-size: 15px; color: #6B5D4F; line-height: 1.6; margin-bottom: 36px; }
        .email-card { display: inline-block; background: #F4EEE5; border: 1px solid #DDD0BF; border-radius: 14px; padding: 20px 32px; font-family: 'Archivo Black', sans-serif; font-size: 18px; font-weight: 700; color: #8B4A2F; text-decoration: none; transition: all 0.2s; margin-bottom: 40px; }
        .email-card:hover { border-color: #8B4A2F; background: rgba(139,74,47,0.06); }
        .back-link { display: block; font-size: 14px; color: #888; text-decoration: none; font-family: 'Inter', sans-serif; transition: color 0.2s; }
        .back-link:hover { color: #8B4A2F; }
        footer { border-top: 1px solid #DDD0BF; padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .footer-left { display: flex; align-items: center; gap: 16px; }
        .footer-logo { font-family: 'Archivo Black', sans-serif; font-weight: 800; font-size: 16px; color: #2B2018; }
        .footer-logo span { color: #8B4A2F; }
        .footer-copy { font-size: 12px; color: #AAA; }
        .footer-links { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
        .footer-links a { font-size: 13px; color: #888; text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #8B4A2F; }
        @media (max-width: 600px) {
          nav { padding: 16px 20px; }
          .contact-wrap { padding: 56px 20px 60px; }
          footer { flex-direction: column; gap: 16px; padding: 20px; text-align: center; }
        }
      `}</style>
    </>
  );
}
