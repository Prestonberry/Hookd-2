import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Accessibility() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Accessibility</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
      </nav>

      <div className="container">
        <h1>Accessibility Statement</h1>
        <p className="updated">Last updated: June 14, 2026</p>

        <section>
          <h2>Our Commitment</h2>
          <p>HookD is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying relevant accessibility standards.</p>
        </section>

        <section>
          <h2>Conformance Status</h2>
          <p>We are actively working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines explain how to make web content more accessible to people with disabilities. We acknowledge that some areas of our Service may not yet fully conform to these standards and we are committed to addressing these gaps.</p>
        </section>

        <section>
          <h2>What We Are Doing</h2>
          <ul>
            <li>Conducting ongoing reviews of our interface for accessibility issues</li>
            <li>Working to ensure sufficient color contrast throughout the application</li>
            <li>Implementing keyboard navigation support across all interactive elements</li>
            <li>Adding appropriate labels and ARIA attributes to UI components</li>
            <li>Ensuring all functionality is available without requiring a mouse</li>
            <li>Making our content compatible with screen readers and assistive technologies</li>
          </ul>
        </section>

        <section>
          <h2>Known Limitations</h2>
          <p>We are aware that the following areas may present accessibility challenges and are actively working to resolve them:</p>
          <ul>
            <li>Video upload interface may have limited screen reader support</li>
            <li>Some interactive elements may lack sufficient ARIA labels</li>
            <li>Color contrast in certain UI elements may not fully meet WCAG AA standards</li>
          </ul>
          <p>We are committed to resolving these issues as part of our ongoing development process.</p>
        </section>

        <section>
          <h2>Feedback and Contact</h2>
          <p>We welcome your feedback on the accessibility of HookD. If you experience accessibility barriers or have suggestions for improvement, please contact us:</p>
          <ul>
            <li>Email: prestonvberry@outlook.com</li>
          </ul>
          <p>We aim to respond to accessibility feedback within 2 business days. If you are unable to access any part of our Service due to a disability, we will work with you to provide the information or functionality you need through an alternative method.</p>
        </section>

        <section>
          <h2>Technical Specifications</h2>
          <p>HookD relies on the following technologies for conformance with WCAG 2.1:</p>
          <ul>
            <li>HTML</li>
            <li>CSS</li>
            <li>JavaScript (React/Next.js)</li>
          </ul>
        </section>

        <section>
          <h2>Formal Complaints</h2>
          <p>If you are not satisfied with our response to your accessibility concern, you may contact the relevant disability rights authority in your jurisdiction.</p>
        </section>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #EDE6DC; background-image: url('data:image/png;base64,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'); color: #2B2018; font-family: 'JetBrains Mono', monospace; min-height: 100vh; overflow-x: hidden; letter-spacing: -0.2px; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #DDD0BF; position: sticky; top: 0; background: rgba(245,240,235,0.95); backdrop-filter: blur(10px); z-index: 100; }
        .logo { font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 22px; letter-spacing: -0.5px; color: #2B2018; }
        .logo span { color: #8B4A2F; }
        .container { max-width: 760px; margin: 0 auto; padding: 56px 40px 80px; }
        h1 { font-family: 'Archivo Black', sans-serif; font-size: 40px; font-weight: 400; margin-bottom: 8px; letter-spacing: -1px; color: #2B2018; }
        .updated { font-size: 13px; color: #8B7A68; margin-bottom: 48px; font-family: 'JetBrains Mono', monospace; }
        section { margin-bottom: 36px; }
        h2 { font-family: 'Archivo Black', sans-serif; font-size: 17px; font-weight: 400; margin-bottom: 12px; color: #8B4A2F; letter-spacing: -0.3px; }
        p { font-size: 14px; color: #5C5043; line-height: 1.8; margin-bottom: 12px; font-family: 'Inter', sans-serif; }
        strong { color: #2B2018; font-weight: 600; }
        ul { list-style: disc; padding-left: 20px; margin-bottom: 12px; }
        ul li { font-size: 14px; color: #5C5043; line-height: 1.8; margin-bottom: 4px; font-family: 'Inter', sans-serif; }
        @media (max-width: 600px) {
          .container { padding: 40px 20px 60px; }
          nav { padding: 16px 20px; }
        }
      `}</style>
    </>
  );
}
