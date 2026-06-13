import { SignIn } from '@clerk/nextjs';
import Head from 'next/head';

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>HookD — Sign In</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={styles.page}>
        <div style={styles.logo} onClick={() => window.location.href = '/'}>
          Hook<span style={styles.logoD}>D</span>
        </div>
        <div style={styles.container}>
          <SignIn
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  borderRadius: '16px',
                  boxShadow: 'none',
                },
                headerTitle: { color: '#FAFAFA', fontFamily: 'Syne, sans-serif', fontWeight: '800' },
                headerSubtitle: { color: '#888' },
                socialButtonsBlockButton: {
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  color: '#FAFAFA',
                  borderRadius: '8px',
                },
                socialButtonsBlockButtonText: { color: '#FAFAFA' },
                dividerLine: { background: '#2A2A2A' },
                dividerText: { color: '#555' },
                formFieldLabel: { color: '#888' },
                formFieldInput: {
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  color: '#FAFAFA',
                  borderRadius: '8px',
                },
                formButtonPrimary: {
                  background: '#FF3B00',
                  borderRadius: '8px',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: '700',
                },
                footerActionLink: { color: '#FF3B00' },
                identityPreviewText: { color: '#FAFAFA' },
                identityPreviewEditButton: { color: '#FF3B00' },
              },
            }}
            redirectUrl="/"
          />
        </div>
      </div>
      <style>{`
        body { background: #0A0A0A; }
      `}</style>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0A0A0A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '60px',
    paddingBottom: '60px',
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: '800',
    fontSize: '28px',
    letterSpacing: '-0.5px',
    color: '#FAFAFA',
    marginBottom: '40px',
    cursor: 'pointer',
  },
  logoD: { color: '#FF3B00' },
  container: {
    width: '100%',
    maxWidth: '420px',
    padding: '0 20px',
  },
};
