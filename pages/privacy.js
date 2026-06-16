import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Privacy() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Privacy Policy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
      </nav>

      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: June 14, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>HookD ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using HookD, you agree to the collection and use of information in accordance with this policy.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p><strong>Account Information:</strong> When you create an account, we collect your email address and any profile information you provide through Clerk, our authentication provider.</p>
          <p><strong>Video Content:</strong> When you upload videos for analysis, we temporarily process video frames and audio data. We do not permanently store your video files. Extracted frames are sent to Anthropic's API for analysis and are not retained after processing.</p>
          <p><strong>Usage Data:</strong> We collect data about how you use the Service, including the number of analyses performed, feature usage, and timestamps. This data is stored in your account metadata.</p>
          <p><strong>Payment Information:</strong> Payment processing is handled by Stripe. We do not store your credit card information. We receive confirmation of payment and subscription status from Stripe.</p>
          <p><strong>Technical Data:</strong> We may collect IP addresses, browser type, device information, and other technical data for security and rate limiting purposes.</p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide, operate, and improve the Service</li>
            <li>To process your video content and generate AI analysis</li>
            <li>To manage your account and subscription</li>
            <li>To enforce usage limits based on your subscription plan</li>
            <li>To prevent fraud, abuse, and unauthorized access</li>
            <li>To communicate with you about your account and the Service</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. AI Processing Disclosure</h2>
          <p>Video frames extracted from your uploaded content are sent to Anthropic's Claude API for AI analysis. This processing is necessary to provide the core functionality of the Service. By using HookD, you consent to this processing. Anthropic's privacy policy governs their handling of data sent to their API. We do not use your content to train AI models.</p>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>We use the following third-party services to operate HookD:</p>
          <ul>
            <li><strong>Clerk</strong> — Authentication and user management. Stores your email, account metadata, and usage counts.</li>
            <li><strong>Stripe</strong> — Payment processing and subscription management.</li>
            <li><strong>Anthropic</strong> — AI analysis of your video content.</li>
            <li><strong>Upstash</strong> — Rate limiting and abuse prevention.</li>
            <li><strong>Vercel</strong> — Hosting and infrastructure.</li>
          </ul>
          <p>Each of these services has their own privacy policy governing how they handle data. We encourage you to review their policies.</p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>We retain your account information for as long as your account is active. Usage counts and subscription data are retained as part of your account. Video content is not permanently stored — frames are processed and discarded after analysis is complete. You may request deletion of your account and associated data at any time by contacting us.</p>
        </section>

        <section>
          <h2>7. Data Security</h2>
          <p>We implement industry-standard security measures to protect your information, including encrypted connections (HTTPS), secure authentication through Clerk, and access controls. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.</p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li>The right to access the personal data we hold about you</li>
            <li>The right to correct inaccurate personal data</li>
            <li>The right to request deletion of your personal data</li>
            <li>The right to object to or restrict processing of your data</li>
            <li>The right to data portability</li>
          </ul>
          <p>To exercise any of these rights, please contact us at prestonvberry@outlook.com.</p>
        </section>

        <section>
          <h2>9. Children's Privacy</h2>
          <p>The Service is not directed to children under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us and we will take steps to delete such information.</p>
        </section>

        <section>
          <h2>10. International Users</h2>
          <p>HookD is operated from the United States. If you are located outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States. By using the Service, you consent to this transfer.</p>
        </section>

        <section>
          <h2>11. Cookies</h2>
          <p>We use cookies and similar tracking technologies to maintain your session and authentication state. These are essential cookies required for the Service to function. We do not use tracking cookies for advertising purposes.</p>
        </section>

        <section>
          <h2>12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by email or by posting a notice on the Service. Your continued use of the Service after such notice constitutes your acceptance of the updated policy.</p>
        </section>

        <section>
          <h2>13. Contact Us</h2>
          <p>If you have questions about this Privacy Policy or how we handle your data, please contact us at prestonvberry@outlook.com.</p>
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
        strong { color: #FAFAFA; }
        ul { list-style: disc; padding-left: 20px; }
        ul li { font-size: 14px; color: #888; line-height: 1.8; margin-bottom: 4px; }
        @media (max-width: 600px) {
          .container { padding: 40px 20px 60px; }
          nav { padding: 16px 20px; }
        }
      `}</style>
    </>
  );
}
