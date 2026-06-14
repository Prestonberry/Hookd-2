import { getAuth, clerkClient } from '@clerk/nextjs/server';

const FREE_LIMIT = 3;

const PLAN_LIMITS = {
  creator: { virality: 20, rehook: 20, conversion: 0 },
  pro: { virality: 50, rehook: 50, conversion: 20 },
  agency: { virality: 150, rehook: 150, conversion: 75 },
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Not signed in' });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.privateMetadata || {};

    const isSubscribed = metadata.isSubscribed === true;
    const plan = metadata.plan || null;
    const limits = plan ? PLAN_LIMITS[plan] : null;

    const viralityCount = Number(metadata.viralityCount) || 0;
    const rehookCount = Number(metadata.rehookCount) || 0;
    const conversionCount = Number(metadata.conversionCount) || 0;
    const freeCount = Number(metadata.analysisCount) || 0;

    if (req.method === 'GET') {
      if (!isSubscribed) {
        return res.status(200).json({
          isSubscribed: false,
          plan: null,
          freeRemaining: Math.max(0, FREE_LIMIT - freeCount),
          canAnalyze: freeCount < FREE_LIMIT,
          canUseVirality: freeCount < FREE_LIMIT,
          canUseRehook: freeCount < FREE_LIMIT,
          canUseConversion: false,
        });
      }

      return res.status(200).json({
        isSubscribed: true,
        plan,
        viralityRemaining: Math.max(0, limits.virality - viralityCount),
        rehookRemaining: Math.max(0, limits.rehook - rehookCount),
        conversionRemaining: Math.max(0, limits.conversion - conversionCount),
        canAnalyze: true,
        canUseVirality: viralityCount < limits.virality,
        canUseRehook: rehookCount < limits.rehook,
        canUseConversion: limits.conversion > 0 && conversionCount < limits.conversion,
      });
    }

    if (req.method === 'POST') {
      const { mode } = req.body || {};

      if (!isSubscribed) {
        if (freeCount >= FREE_LIMIT) {
          return res.status(200).json({
            isSubscribed: false,
            canAnalyze: false,
            freeRemaining: 0,
          });
        }
        await client.users.updateUserMetadata(userId, {
          privateMetadata: { ...metadata, analysisCount: freeCount + 1 },
        });
        return res.status(200).json({
          isSubscribed: false,
          canAnalyze: true,
          freeRemaining: Math.max(0, FREE_LIMIT - (freeCount + 1)),
        });
      }

      // Subscribed — check per-type limits
      if (mode === 'analyze') {
        if (viralityCount >= limits.virality) {
          return res.status(200).json({ isSubscribed: true, canAnalyze: false, reason: 'virality_limit_reached' });
        }
        await client.users.updateUserMetadata(userId, {
          privateMetadata: { ...metadata, viralityCount: viralityCount + 1 },
        });
      } else if (mode === 'rehook') {
        if (rehookCount >= limits.rehook) {
          return res.status(200).json({ isSubscribed: true, canAnalyze: false, reason: 'rehook_limit_reached' });
        }
        await client.users.updateUserMetadata(userId, {
          privateMetadata: { ...metadata, rehookCount: rehookCount + 1 },
        });
      } else if (mode === 'conversion') {
        if (limits.conversion === 0) {
          return res.status(200).json({ isSubscribed: true, canAnalyze: false, reason: 'not_on_plan' });
        }
        if (conversionCount >= limits.conversion) {
          return res.status(200).json({ isSubscribed: true, canAnalyze: false, reason: 'conversion_limit_reached' });
        }
        await client.users.updateUserMetadata(userId, {
          privateMetadata: { ...metadata, conversionCount: conversionCount + 1 },
        });
      }

      return res.status(200).json({ isSubscribed: true, canAnalyze: true, plan });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Usage error:', err.message);
    return res.status(200).json({
      isSubscribed: false,
      canAnalyze: true,
      freeRemaining: FREE_LIMIT,
    });
  }
}
