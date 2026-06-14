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

      if (email) {
        // Find user in Clerk by email
        const users = await client.users.getUserList({ emailAddress: [email] });
        if (users.data.length > 0) {
          const user = users.data[0];
          await client.users.updateUserMetadata(user.id, {
            privateMetadata: {
              ...user.privateMetadata,
              isSubscribed: true,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscribedAt: new Date().toISOString(),
            }
          });
          console.log(`Subscribed user: ${email}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Find user by Stripe customer ID
      const users = await client.users.getUserList();
      const user = users.data.find(u => u.privateMetadata?.stripeCustomerId === customerId);

      if (user) {
        await client.users.updateUserMetadata(user.id, {
          privateMetadata: {
            ...user.privateMetadata,
            isSubscribed: false,
            cancelledAt: new Date().toISOString(),
          }
        });
        console.log(`Cancelled subscription for user: ${user.emailAddresses[0]?.emailAddress}`);
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return res.status(200).json({ received: true });
}
