// ============================================================
// ChainPilot AI — Token Routes
// ============================================================
// GET /api/token/:address — Analyze token risk
// ============================================================

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { getTokenRisk } from '../tools/tokenRisk';

const router = Router();

/**
 * GET /api/token/:address
 * Analyze an ERC-20 token for risks
 */
router.get('/:address', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  // Validate contract address
  if (!ethers.isAddress(address)) {
    res.status(400).json({
      error: {
        code: 'INVALID_ADDRESS',
        message: 'The provided address is not a valid Ethereum contract address.',
      },
    });
    return;
  }

  try {
    const tokenRisk = await getTokenRisk(address);
    res.json(tokenRisk);
  } catch (error: any) {
    console.error('[Token Route] Error:', error);
    res.status(500).json({
      error: { code: 'EXTERNAL_API_ERROR', message: 'Failed to analyze token.' },
    });
  }
});

export default router;
