// pages/api/usage.js
// Tracks analysis count per user using Clerk user metadata
// GET — returns current count and limit
// POST — increments count, returns new count

import { getAuth, clerkClient } from '@clerk/nextjs/server';

const FREE_LIMIT = 5;

export default async function handler(req, res) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = user.privateMetadata || {};
  const currentCount = metadata.analysisCount || 0;
  const isSubscribed = metadata.isSubscribed || false;

  if (req.method === 'GET') {
    return res.status(200).json({
      count: currentCount,
      limit: FREE_LIMIT,
      remaining: isSubscribed ? 999 : Math.max(0, FREE_LIMIT - currentCount),
      isSubscribed,
      canAnalyze: isSubscribed || currentCount < FREE_LIMIT,
    });
  }

  if (req.method === 'POST') {
    if (!isSubscribed && currentCount >= FREE_LIMIT) {
      return res.status(403).json({
        error: 'Free limit reached',
        count: currentCount,
        limit: FREE_LIMIT,
        canAnalyze: false,
      });
    }

    const newCount = currentCount + 1;
    await client.users.updateUserMetadata(userId, {
      privateMetadata: { ...metadata, analysisCount: newCount },
    });

    return res.status(200).json({
      count: newCount,
      limit: FREE_LIMIT,
      remaining: isSubscribed ? 999 : Math.max(0, FREE_LIMIT - newCount),
      isSubscribed,
      canAnalyze: isSubscribed || newCount < FREE_LIMIT,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
