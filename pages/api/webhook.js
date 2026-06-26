import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const client = await clerkClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      // Single plan — everyone resolves to 'creator'.
      const plan = session.metadata?.plan || 'creator';

      if (email) {
        const users = await client.users.getUserList({ emailAddress: [email] });
        if (users.data.length > 0) {
          const user = users.data[0];
          const existingMetadata = user.privateMetadata || {};
          const wasAlreadySubscribed = existingMetadata.isSubscribed === true;

          await client.users.updateUserMetadata(user.id, {
            privateMetadata: {
              ...existingMetadata,
              isSubscribed: true,
              plan,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscribedAt: existingMetadata.subscribedAt || new Date().toISOString(),
              cancelAtPeriodEnd: false,
              accessUntil: null,
              viralityCount: wasAlreadySubscribed ? (existingMetadata.viralityCount || 0) : 0,
              rehookCount: wasAlreadySubscribed ? (existingMetadata.rehookCount || 0) : 0,
              conversionCount: wasAlreadySubscribed ? (existingMetadata.conversionCount || 0) : 0,
            }
          });
          console.log(`Subscribed user: ${email} on plan: ${plan} (was already subscribed: ${wasAlreadySubscribed})`);
        }
      }
    }

    // Fires when a subscription is marked to cancel at period end (status
    // stays "active" with cancel_at_period_end: true), or when a scheduled
    // cancellation is undone. We track cancel_at_period_end here so we know
    // NOT to revoke access until the real end date — the actual revocation
    // happens in customer.subscription.deleted below, only once Stripe
    // truly ends it.
    //
    // Note: with a single plan there are no upgrades/downgrades to track,
    // so this block only handles cancellation scheduling, not plan swaps.
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const users = await client.users.getUserList();
      const user = users.data.find(u => u.privateMetadata?.stripeCustomerId === customerId);

      if (user) {
        const existingMetadata = user.privateMetadata || {};
        const updates = { ...existingMetadata };
        let changed = false;

        // Track whether this subscription is scheduled to cancel at period
        // end, and exactly when that period ends, WITHOUT revoking access
        // yet. Access is only revoked when subscription.deleted actually fires.
        if (subscription.cancel_at_period_end) {
          updates.cancelAtPeriodEnd = true;
          updates.accessUntil = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
          changed = true;
        } else if (existingMetadata.cancelAtPeriodEnd) {
          // Cancellation was undone (e.g. user resubscribed before period end).
          updates.cancelAtPeriodEnd = false;
          updates.accessUntil = null;
          changed = true;
        }

        if (changed) {
          await client.users.updateUserMetadata(user.id, { privateMetadata: updates });
          console.log(`Subscription updated for ${user.emailAddresses[0]?.emailAddress}: cancelAtPeriodEnd=${!!updates.cancelAtPeriodEnd}`);
        }
      }
    }

    // This fires only when Stripe actually ends the subscription for good —
    // either because "cancel immediately" was used, or because a
    // "cancel at period end" subscription has now reached that end date.
    // This is the ONLY place access should be revoked.
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const users = await client.users.getUserList();
      const user = users.data.find(u => u.privateMetadata?.stripeCustomerId === customerId);

      if (user) {
        // Safety check: if this user has ANOTHER active subscription on a
        // different Stripe customer (a leftover from the old duplicate-
        // customer bug), don't revoke access — they're still paying via
        // that other subscription.
        let stillHasOtherActiveSub = false;
        try {
          const otherSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 5,
          });
          stillHasOtherActiveSub = otherSubs.data.some(s => s.id !== subscription.id);
        } catch (e) {
          console.error('Error checking for other active subscriptions:', e.message);
        }

        if (!stillHasOtherActiveSub) {
          await client.users.updateUserMetadata(user.id, {
            privateMetadata: {
              ...user.privateMetadata,
              isSubscribed: false,
              plan: null,
              cancelAtPeriodEnd: false,
              accessUntil: null,
              cancelledAt: new Date().toISOString(),
            }
          });
          console.log(`Subscription truly ended for user: ${user.emailAddresses[0]?.emailAddress}`);
        } else {
          console.log(`Subscription deleted for ${user.emailAddresses[0]?.emailAddress}, but another active subscription exists — access preserved.`);
        }
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return res.status(200).json({ received: true });
}
