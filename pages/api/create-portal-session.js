import Stripe from 'stripe';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const customerId = user.privateMetadata?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: 'No subscription found for this account' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal session error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
