import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Accessibility() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Accessibility</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
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
        body { background: #0A0A0A; color: #FAFAFA; font-family: 'Inter', sans-serif; min-height: 100vh; }
        nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #2A2A2A; background: rgba(10,10,10,0.95); }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
        .logo span { color: #FF3B00; }
        .container { max-width: 760px; margin: 0 auto; padding: 60px 40px 80px; }
        h1 { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; margin-bottom: 8px; letter-spacing: -1px; }
        .updated { font-size: 13px; color: #555; margin-bottom: 48px; }
        section { margin-bottom: 36px; }
        h2 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #FAFAFA; }
        p { font-size: 14px; color: #888; line-height: 1.8; margin-bottom: 12px; }
        ul { list-style: disc; padding-left: 20px; margin-bottom: 12px; }
        ul li { font-size: 14px; color: #888; line-height: 1.8; margin-bottom: 4px; }
        @media (max-width: 600px) {
          .container { padding: 40px 20px 60px; }
          nav { padding: 16px 20px; }
        }
      `}</style>
    </>
  );
}
