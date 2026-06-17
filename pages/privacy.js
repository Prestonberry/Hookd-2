import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Privacy() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Privacy Policy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
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
