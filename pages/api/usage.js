import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

const FREE_LIMIT = 5;

export default async function handler(req, res) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.privateMetadata || {};
    const currentCount = parseInt(metadata.analysisCount || '0');
    const isSubscribed = metadata.isSubscribed === true;

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
        privateMetadata: {
          ...metadata,
          analysisCount: newCount,
        },
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

  } catch (err) {
    console.error('Usage API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
