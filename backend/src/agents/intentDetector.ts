// ============================================================
// ChainPilot AI — Intent Detector
// ============================================================
// Lightweight LLM call to classify user intent before full
// agent invocation. Enables pre-validation and analytics.
// ============================================================

import { ChatGroq } from '@langchain/groq';
import { INTENT_DETECTION_PROMPT } from './prompts/intentDetection';
import { IntentResult, IntentType } from '../types';
import { ethers } from 'ethers';

const VALID_INTENTS: IntentType[] = [
  'wallet_analysis',
  'transaction_explanation',
  'token_analysis',
  'contract_explanation',
  'whale_tracking',
  'defi_strategy',
  'send_eth',
  'transfer_token',
  'swap_tokens',
  'portfolio_analysis',
  'general_question',
];

/**
 * Detect the intent of a user message using a lightweight LLM call
 */
export async function detectIntent(message: string): Promise<IntentResult> {
  try {
    const llm = new ChatGroq({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0,
      maxTokens: 256,
      apiKey: process.env.GROQ_API_KEY,
    });

    const prompt = INTENT_DETECTION_PROMPT.replace('{message}', message);
    const response = await llm.invoke(prompt);

    // Parse JSON response
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackIntentDetection(message);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate intent
    const intent = parsed.intent as IntentType;
    if (!VALID_INTENTS.includes(intent)) {
      return fallbackIntentDetection(message);
    }

    return {
      intent,
      params: parsed.params || {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch (error) {
    console.error('[IntentDetector] LLM call failed, using fallback:', error);
    return fallbackIntentDetection(message);
  }
}

/**
 * Validate extracted parameters for an intent
 */
export function validateIntentParams(result: IntentResult): {
  valid: boolean;
  error?: string;
} {
  const intentStr: string = result.intent;
  const p = result.params as Record<string, string>;

  if (intentStr === 'wallet_analysis' || intentStr === 'portfolio_analysis') {
    const addr = p['wallet_address'];
    if (addr && !ethers.isAddress(addr) && !String(addr).endsWith('.eth')) {
      return { valid: false, error: `Invalid wallet address: ${addr}` };
    }
  }

  if (intentStr === 'transaction_explanation') {
    const hash = p['transaction_hash'];
    if (hash && !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return { valid: false, error: `Invalid transaction hash: ${hash}` };
    }
  }

  if (intentStr === 'token_analysis') {
    const addr = p['token_address'];
    if (addr && !ethers.isAddress(addr)) {
      return { valid: false, error: `Invalid token address: ${addr}` };
    }
  }

  if (intentStr === 'contract_explanation') {
    const addr = p['contract_address'];
    if (addr && !ethers.isAddress(addr)) {
      return { valid: false, error: `Invalid contract address: ${addr}` };
    }
  }

  if (intentStr === 'send_eth') {
    const addr = p['receiver_address'];
    if (addr && !ethers.isAddress(addr) && !String(addr).endsWith('.eth')) {
      return { valid: false, error: `Invalid receiver address: ${addr}` };
    }
    const amount = parseFloat(p['amount']);
    if (p['amount'] && (isNaN(amount) || amount <= 0)) {
      return { valid: false, error: `Invalid amount: ${p['amount']}` };
    }
  }

  if (intentStr === 'transfer_token') {
    const addr = p['receiver_address'];
    if (addr && !ethers.isAddress(addr) && !String(addr).endsWith('.eth')) {
      return { valid: false, error: `Invalid receiver address: ${addr}` };
    }
  }

  return { valid: true };
}

/**
 * Rule-based fallback intent detection (no LLM needed)
 */
function fallbackIntentDetection(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Extract addresses and hashes
  const addressMatch = message.match(/0x[0-9a-fA-F]{40}/);
  const hashMatch = message.match(/0x[0-9a-fA-F]{64}/);
  const ensMatch = message.match(/[\w-]+\.eth\b/);
  const amountMatch = message.match(/(\d+\.?\d*)\s*(ETH|eth)/);

  // Check for transaction intents first (highest priority)
  if (
    lower.includes('send') &&
    (lower.includes('eth') || amountMatch) &&
    (addressMatch || ensMatch)
  ) {
    return {
      intent: 'send_eth',
      params: {
        ...(addressMatch ? { receiver_address: addressMatch[0] } : {}),
        ...(ensMatch ? { receiver_address: ensMatch[0] } : {}),
        ...(amountMatch ? { amount: amountMatch[1] } : {}),
      },
      confidence: 0.7,
    };
  }

  if (lower.includes('transfer') && (addressMatch || ensMatch)) {
    return {
      intent: 'transfer_token',
      params: {
        ...(addressMatch ? { receiver_address: addressMatch[0] } : {}),
        ...(ensMatch ? { receiver_address: ensMatch[0] } : {}),
        ...(amountMatch ? { amount: amountMatch[1] } : {}),
      },
      confidence: 0.7,
    };
  }

  if (lower.includes('swap')) {
    return {
      intent: 'swap_tokens',
      params: {
        ...(amountMatch ? { amount: amountMatch[1] } : {}),
      },
      confidence: 0.7,
    };
  }

  // Check for analysis intents
  if (hashMatch) {
    return {
      intent: 'transaction_explanation',
      params: { transaction_hash: hashMatch[0] },
      confidence: 0.8,
    };
  }

  if (
    (lower.includes('analyze') || lower.includes('check') || lower.includes('portfolio')) &&
    (addressMatch || ensMatch)
  ) {
    return {
      intent: 'wallet_analysis',
      params: {
        wallet_address: addressMatch?.[0] || ensMatch?.[0] || '',
      },
      confidence: 0.7,
    };
  }

  if (
    lower.includes('safe') ||
    lower.includes('risk') ||
    lower.includes('rug') ||
    lower.includes('scam')
  ) {
    return {
      intent: 'token_analysis',
      params: {
        ...(addressMatch ? { token_address: addressMatch[0] } : {}),
      },
      confidence: 0.6,
    };
  }

  if (lower.includes('contract') && (addressMatch || lower.includes('explain'))) {
    return {
      intent: 'contract_explanation',
      params: {
        ...(addressMatch ? { contract_address: addressMatch[0] } : {}),
      },
      confidence: 0.6,
    };
  }

  if (lower.includes('whale')) {
    return {
      intent: 'whale_tracking',
      params: {},
      confidence: 0.8,
    };
  }

  if (lower.includes('yield') || lower.includes('farm') || lower.includes('stake') || lower.includes('apy')) {
    return {
      intent: 'defi_strategy',
      params: {},
      confidence: 0.7,
    };
  }

  if (lower.includes('ens') || ensMatch) {
    return {
      intent: 'wallet_analysis',
      params: {
        wallet_address: ensMatch?.[0] || '',
      },
      confidence: 0.6,
    };
  }

  // Default
  return {
    intent: 'general_question',
    params: {},
    confidence: 0.5,
  };
}
