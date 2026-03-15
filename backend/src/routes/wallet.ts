// ============================================================
// ChainPilot AI — Wallet Routes
// ============================================================
// GET /api/wallet/:address — Direct wallet analysis
// ============================================================

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { getWalletInfo } from '../tools/walletAnalyzer';

const router = Router();

/**
 * GET /api/wallet/:address
 * Direct wallet analysis (bypasses chat agent)
 */
router.get('/:address', async (req: Request, res: Response): Promise<void> => {
  const address = req.params.address as string;

  // Validate — allow ENS or hex address
  if (!String(address).endsWith('.eth') && !ethers.isAddress(address)) {
    res.status(400).json({
      error: {
        code: 'INVALID_ADDRESS',
        message: 'The provided address is not a valid Ethereum address or ENS name.',
      },
    });
    return;
  }

  try {
    const walletInfo = await getWalletInfo(address);
    res.json(walletInfo);
  } catch (error: any) {
    console.error('[Wallet Route] Error:', error);

    if (error.message.includes('Could not resolve ENS')) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: error.message },
      });
      return;
    }

    res.status(500).json({
      error: { code: 'EXTERNAL_API_ERROR', message: 'Failed to analyze wallet.' },
    });
  }
});

export default router;
