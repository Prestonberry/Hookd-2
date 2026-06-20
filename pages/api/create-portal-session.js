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

    // Look up the customer's active subscription so we can deep-link
    // the portal directly to it (some Stripe accounts won't show the
    // subscription management section unless we do this explicitly).
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const sessionParams = {
      customer: customerId,
      return_url: `${req.headers.origin}/`,
    };

    if (subscriptions.data.length > 0) {
      sessionParams.flow_data = {
        type: 'subscription_update',
        subscription_update: {
          subscription: subscriptions.data[0].id,
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal session error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
