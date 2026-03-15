// ============================================================
// ChainPilot AI — Transaction Routes
// ============================================================
// GET  /api/transaction/:hash   — Explain a transaction
// POST /api/transaction/confirm — Confirm/reject pending tx
// ============================================================

import { Router, Request, Response } from 'express';
import { getTransactionInfo } from '../tools/transactionExplainer';
import { sendETH, transferERC20 } from '../tools/transactionExecutor';
import * as supabaseService from '../services/supabaseService';
import { txLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/transaction/:hash
 * Explain a transaction (bypasses chat agent)
 */
router.get('/:hash', async (req: Request, res: Response): Promise<void> => {
  const hash = req.params.hash as string;

  // Validate tx hash format
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    res.status(400).json({
      error: {
        code: 'INVALID_TX_HASH',
        message: 'The provided transaction hash is invalid. Must be 66 hex characters starting with 0x.',
      },
    });
    return;
  }

  try {
    const txInfo = await getTransactionInfo(hash);
    res.json(txInfo);
  } catch (error: any) {
    console.error('[Transaction Route] Error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: error.message },
      });
      return;
    }

    res.status(500).json({
      error: { code: 'EXTERNAL_API_ERROR', message: 'Failed to explain transaction.' },
    });
  }
});

/**
 * POST /api/transaction/confirm
 * Confirm and broadcast a pending transaction, or reject it
 */
router.post('/confirm', txLimiter, async (req: Request, res: Response): Promise<void> => {
  const { pendingTxId, confirmed } = req.body;

  if (!pendingTxId) {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'pendingTxId is required.' },
    });
    return;
  }

  if (typeof confirmed !== 'boolean') {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'confirmed must be a boolean.' },
    });
    return;
  }

  try {
    // Fetch pending transaction from database
    const pendingTx = await supabaseService.getPendingTransaction(pendingTxId);

    if (!pendingTx) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pending transaction not found.' },
      });
      return;
    }

    if (pendingTx.status !== 'awaiting_confirmation') {
      res.status(409).json({
        error: {
          code: 'TX_ALREADY_CONFIRMED',
          message: `Transaction has already been ${pendingTx.status}.`,
        },
      });
      return;
    }

    // If rejected
    if (!confirmed) {
      await supabaseService.updatePendingTransaction(pendingTxId, {
        status: 'rejected',
      });

      res.json({
        status: 'rejected',
        message: 'Transaction cancelled by user.',
      });
      return;
    }

    // Execute the confirmed transaction
    await supabaseService.updatePendingTransaction(pendingTxId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });

    const txParams = pendingTx.txParams;
    let result;

    if (pendingTx.txType === 'send_eth') {
      result = await sendETH(txParams.to, txParams.amount, true);
    } else if (pendingTx.txType === 'transfer_erc20') {
      result = await transferERC20(
        txParams.tokenAddress,
        txParams.to,
        txParams.amount,
        true
      );
    } else {
      res.status(400).json({
        error: { code: 'INTERNAL_ERROR', message: `Unknown tx type: ${pendingTx.txType}` },
      });
      return;
    }

    // Result is a TransactionResult (since confirmed=true)
    const txResult = result as { txHash: string; explorerUrl: string; status: string };

    // Update database
    await supabaseService.updatePendingTransaction(pendingTxId, {
      status: txResult.status === 'mined' ? 'mined' : 'broadcast',
      tx_hash: txResult.txHash,
      broadcast_at: new Date().toISOString(),
    });

    res.json({
      status: txResult.status,
      txHash: txResult.txHash,
      explorerUrl: txResult.explorerUrl,
    });
  } catch (error: any) {
    console.error('[Transaction Route] Confirm error:', error);

    // Update database with failure
    try {
      await supabaseService.updatePendingTransaction(pendingTxId, {
        status: 'failed',
        error_message: error.message,
      });
    } catch {
      // Non-critical
    }

    res.status(500).json({
      error: { code: 'AGENT_ERROR', message: error.message || 'Transaction execution failed.' },
    });
  }
});

export default router;
