// ============================================================
// ChainPilot AI — DeFi Routes
// ============================================================
// GET /api/defi/yields — Fetch DeFi yield opportunities
// ============================================================

import { Router, Request, Response } from 'express';
import { getDefiYields } from '../tools/defiAdvisor';

const router = Router();

/**
 * GET /api/defi/yields
 * Fetch current DeFi yield opportunities
 *
 * Query params:
 *  - token  (optional): filter by token symbol (e.g. "ETH")
 *  - minApy (optional): minimum APY threshold
 *  - chain  (optional): chain filter (default: "Ethereum")
 */
router.get('/yields', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string | undefined;
  const minApyRaw = req.query.minApy as string | undefined;
  const chain = (req.query.chain as string) || 'Ethereum';

  const minApy = minApyRaw ? parseFloat(minApyRaw) : 0;

  if (minApyRaw && isNaN(minApy)) {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'minApy must be a valid number.' },
    });
    return;
  }

  try {
    const yields = await getDefiYields(token, minApy, chain);
    res.json({ yields });
  } catch (error: any) {
    console.error('[DeFi Route] Error:', error);
    res.status(500).json({
      error: { code: 'EXTERNAL_API_ERROR', message: 'Failed to fetch yield data.' },
    });
  }
});

export default router;
