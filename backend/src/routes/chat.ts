// ============================================================
// ChainPilot AI — Chat Routes
// ============================================================
// POST /api/chat           — Send message, get SSE response
// GET  /api/chat/:id       — Fetch conversation history
// GET  /api/chat/conversations — List conversations for user
// ============================================================

import { Router, Request, Response } from 'express';
import { processMessage } from '../agents/chainpilotAgent';
import * as supabaseService from '../services/supabaseService';
import { ChatRequest, StreamEvent } from '../types';
import { chatLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/chat
 * Send a message to the AI agent. Returns SSE stream.
 */
router.post('/', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  const { message, conversationId, walletAddress } = req.body as ChatRequest;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'Message is required and must be a non-empty string.' },
    });
    return;
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Helper to send SSE event
  const sendEvent = (event: StreamEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    // Notify client that processing has started
    sendEvent({ type: 'tool_call', content: 'Processing your request...' });

    // Process through agent
    const result = await processMessage(
      message.trim(),
      conversationId,
      walletAddress || (req.headers['x-wallet-address'] as string)
    );

    // Send tool call notifications
    for (const toolName of result.toolCalls) {
      sendEvent({
        type: 'tool_call',
        content: `Using ${toolName.replace(/_/g, ' ')}...`,
      });
    }

    // Send the main response
    sendEvent({
      type: 'text',
      content: result.response,
      conversationId: result.conversationId,
    });

    // Send done event
    sendEvent({
      type: 'done',
      conversationId: result.conversationId,
    });
  } catch (error: any) {
    console.error('[Chat Route] Error:', error);
    sendEvent({
      type: 'error',
      content: error.message || 'An unexpected error occurred.',
    });
  } finally {
    res.end();
  }
});

/**
 * GET /api/chat/conversations
 * List all conversations for a wallet
 * Must be defined BEFORE /:conversationId to avoid route conflicts
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  const walletAddress = (req.query.walletAddress as string) ||
    (req.headers['x-wallet-address'] as string);

  if (!walletAddress) {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'walletAddress is required.' },
    });
    return;
  }

  try {
    const user = await supabaseService.findOrCreateUser(walletAddress);
    const conversations = await supabaseService.listConversations(user.id);

    res.json({ conversations });
  } catch (error: any) {
    console.error('[Chat Route] Error listing conversations:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list conversations.' },
    });
  }
});

/**
 * GET /api/chat/:conversationId
 * Fetch conversation history
 */
router.get('/:conversationId', async (req: Request, res: Response): Promise<void> => {
  const { conversationId } = req.params;

  if (!conversationId) {
    res.status(400).json({
      error: { code: 'MISSING_FIELD', message: 'Conversation ID is required.' },
    });
    return;
  }

  try {
    const messages = await supabaseService.getRecentMessages(conversationId as string, 100);

    res.json({
      conversation: { id: conversationId },
      messages,
    });
  } catch (error: any) {
    console.error('[Chat Route] Error fetching conversation:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversation.' },
    });
  }
});

export default router;
