// ============================================================
// ChainPilot AI — Backend API Client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Send a message to the AI agent and receive a streaming response
 */
export async function sendMessage(
  message: string,
  conversationId?: string,
  walletAddress?: string
): Promise<Response> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
    },
    body: JSON.stringify({
      message,
      conversationId,
      walletAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || 'Failed to send message');
  }

  return response;
}

/**
 * Get conversation history
 */
export async function getConversation(conversationId: string) {
  const response = await fetch(`${API_BASE}/chat/${conversationId}`);
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}

/**
 * List all conversations for a wallet
 */
export async function getConversations(walletAddress: string) {
  const response = await fetch(
    `${API_BASE}/chat/conversations?walletAddress=${walletAddress}`
  );
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

/**
 * Confirm a pending transaction
 */
export async function confirmTransaction(pendingTxId: string) {
  const response = await fetch(`${API_BASE}/transaction/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingTxId, confirmed: true }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || 'Failed to confirm transaction');
  }

  return response.json();
}

/**
 * Reject a pending transaction
 */
export async function rejectTransaction(pendingTxId: string) {
  const response = await fetch(`${API_BASE}/transaction/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingTxId, confirmed: false }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || 'Failed to reject transaction');
  }

  return response.json();
}

/**
 * Direct wallet analysis (bypass chat)
 */
export async function analyzeWallet(address: string) {
  const response = await fetch(`${API_BASE}/wallet/${address}`);
  if (!response.ok) throw new Error('Failed to analyze wallet');
  return response.json();
}

/**
 * Direct transaction explanation
 */
export async function explainTransaction(hash: string) {
  const response = await fetch(`${API_BASE}/transaction/${hash}`);
  if (!response.ok) throw new Error('Failed to explain transaction');
  return response.json();
}

/**
 * Direct token risk analysis
 */
export async function analyzeToken(address: string) {
  const response = await fetch(`${API_BASE}/token/${address}`);
  if (!response.ok) throw new Error('Failed to analyze token');
  return response.json();
}

/**
 * Get DeFi yield opportunities
 */
export async function getDefiYields(token?: string, minApy?: number) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (minApy) params.set('minApy', String(minApy));

  const response = await fetch(`${API_BASE}/defi/yields?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch yields');
  return response.json();
}

/**
 * Health check
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
