import Stripe from 'stripe';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  const { priceId, plan } = req.body;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    const metadata = user.privateMetadata || {};
    const existingSubscriptionId = metadata.stripeSubscriptionId;
    const isSubscribed = metadata.isSubscribed === true;

    // ---- Resolve ONE reusable Stripe customer for this user ----
    // This is the key fix: never let Stripe auto-create a new customer
    // on each checkout (which previously caused duplicate customers).
    let customerId = metadata.stripeCustomerId;

    if (!customerId) {
      // Try to find an existing customer by email before making a new one.
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
          metadata: { userId },
        });
        customerId = created.id;
      }
      // Persist it so every future checkout/portal call reuses the same customer.
      await client.users.updateUserMetadata(userId, {
        privateMetadata: { ...metadata, stripeCustomerId: customerId },
      });
    }

    // If the user already has an active subscription, UPGRADE/DOWNGRADE it
    // instead of creating a brand new one (prevents double-charging).
    if (isSubscribed && existingSubscriptionId) {
      let subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(existingSubscriptionId);
      } catch (err) {
        subscription = null;
      }

      if (subscription && subscription.status !== 'canceled') {
        const currentItemId = subscription.items.data[0].id;

        const updatedSubscription = await stripe.subscriptions.update(existingSubscriptionId, {
          items: [{ id: currentItemId, price: priceId }],
          proration_behavior: 'create_prorations',
          metadata: { userId, plan },
        });

        await client.users.updateUserMetadata(userId, {
          privateMetadata: {
            ...metadata,
            stripeCustomerId: customerId,
            plan,
            isSubscribed: true,
            stripeSubscriptionId: updatedSubscription.id,
          },
        });

        return res.status(200).json({ upgraded: true, redirectUrl: `${req.headers.origin}/?success=true&plan=${plan}` });
      }
    }

    // No active subscription — create a normal new checkout session,
    // attached to the reusable customer (NOT customer_email).
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      success_url: `${req.headers.origin}/?success=true&plan=${plan}`,
      cancel_url: `${req.headers.origin}/pricing`,
      allow_promotion_codes: true,
      metadata: { userId, plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
