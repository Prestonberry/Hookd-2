import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Terms() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>HookD — Terms of Service</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <nav>
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Hook<span>D</span></div>
      </nav>

      <div className="container">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: June 14, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using HookD ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. HookD is operated by Preston Berry ("we," "us," or "our").</p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>HookD is an AI-powered video analysis platform that analyzes video content and provides feedback, scores, and recommendations to help creators improve their content performance. The Service uses third-party AI technology, including Anthropic's Claude API, to process and analyze video frames and audio data.</p>
        </section>

        <section>
          <h2>3. AI Analysis Disclosure</h2>
          <p>You understand and acknowledge that:</p>
          <ul>
            <li>Video content you upload is processed by third-party AI services, including Anthropic's Claude API</li>
            <li>AI analysis results are generated automatically and may not always be accurate, complete, or applicable to your specific situation</li>
            <li>HookD's analysis is provided for informational and educational purposes only</li>
            <li>We do not guarantee that following our recommendations will improve your content performance or achieve any specific results</li>
            <li>AI-generated feedback should be used as one input among many in your creative decision-making process</li>
          </ul>
        </section>

        <section>
          <h2>4. User Accounts</h2>
          <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete information when creating your account. You must be at least 18 years old to use the Service.</p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Upload content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
            <li>Upload content that infringes on the intellectual property rights of others</li>
            <li>Upload content depicting minors in any sexual or inappropriate manner</li>
            <li>Attempt to bypass, circumvent, or disable any security features or usage limits</li>
            <li>Use the Service to develop competing products or services</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated scripts, bots, or other tools to access the Service without our permission</li>
            <li>Share your account access with others or resell access to the Service</li>
          </ul>
        </section>

        <section>
          <h2>6. Content You Upload</h2>
          <p>You retain ownership of all content you upload to HookD. By uploading content, you grant us a limited, non-exclusive license to process that content solely for the purpose of providing the Service to you. We do not store your video files permanently. Video frames are extracted, processed by AI, and then discarded. We do not use your content to train AI models or share it with third parties except as necessary to provide the Service.</p>
        </section>

        <section>
          <h2>7. Subscription and Billing</h2>
          <p>HookD offers paid subscription plans with the following terms:</p>
          <ul>
            <li>Subscriptions are billed monthly and renew automatically</li>
            <li>You may cancel your subscription at any time through your account settings</li>
            <li>Cancellations take effect at the end of the current billing period</li>
            <li>We do not offer refunds for partial months or unused analyses</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
            <li>Usage limits reset monthly on your billing date</li>
            <li>Unused analyses do not roll over to the next month</li>
          </ul>
        </section>

        <section>
          <h2>8. Free Trial</h2>
          <p>New users receive 3 free analyses with no credit card required. Free trial analyses are subject to the same acceptable use policy as paid plans. We reserve the right to modify or discontinue the free trial at any time.</p>
        </section>

        <section>
          <h2>9. Intellectual Property</h2>
          <p>The Service, including all software, designs, text, graphics, and other content created by HookD, is owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our Service without our express written permission.</p>
        </section>

        <section>
          <h2>10. Disclaimer of Warranties</h2>
          <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY AI-GENERATED ANALYSIS OR RECOMMENDATIONS.</p>
        </section>

        <section>
          <h2>11. Limitation of Liability</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOOKD AND ITS OWNERS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM.</p>
        </section>

        <section>
          <h2>12. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless HookD and its owners, employees, and affiliates from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.</p>
        </section>

        <section>
          <h2>13. Third-Party Services</h2>
          <p>The Service integrates with third-party services including Anthropic (AI analysis), Stripe (payments), and Clerk (authentication). Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the practices of these third-party services.</p>
        </section>

        <section>
          <h2>14. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service will immediately cease. We will not refund any prepaid subscription fees upon termination for cause.</p>
        </section>

        <section>
          <h2>15. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Hillsborough County, Florida.</p>
        </section>

        <section>
          <h2>16. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by email or by posting a notice on the Service. Your continued use of the Service after such notice constitutes your acceptance of the updated Terms.</p>
        </section>

        <section>
          <h2>17. Contact</h2>
          <p>If you have questions about these Terms, please contact us at prestonvberry@outlook.com.</p>
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
