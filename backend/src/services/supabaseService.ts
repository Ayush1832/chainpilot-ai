// ============================================================
// ChainPilot AI — Supabase Database Service
// ============================================================
// Wraps Supabase client for conversation, message, tool_call,
// and pending_transaction CRUD operations.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get the Supabase client (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// ── Users ──

export async function findOrCreateUser(walletAddress: string) {
  const supabase = getSupabaseClient();
  const normalized = walletAddress.toLowerCase();

  // Try to find existing user
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', normalized)
    .single();

  if (existing) return existing;

  // Create new user
  const { data, error } = await supabase
    .from('users')
    .insert({ wallet_address: normalized })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data;
}

// ── Conversations ──

export async function createConversation(userId?: string, title?: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId || null,
      title: title || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data;
}

export async function getConversation(conversationId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) return null;
  return data;
}

export async function listConversations(userId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to list conversations: ${error.message}`);
  return data || [];
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
}

// ── Messages ──

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  metadata: Record<string, any> = {}
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function getMessages(conversationId: string, limit: number = 20) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return data || [];
}

export async function getRecentMessages(conversationId: string, count: number = 20) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(count);

  if (error) throw new Error(`Failed to get recent messages: ${error.message}`);
  return (data || []).reverse(); // Reverse to chronological order
}

// ── Tool Calls ──

export async function logToolCall(
  conversationId: string,
  messageId: string | null,
  toolName: string,
  inputParams: Record<string, any>,
  output: any = null,
  status: 'pending' | 'success' | 'error' = 'pending',
  errorMessage?: string,
  durationMs?: number
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('tool_calls')
    .insert({
      conversation_id: conversationId,
      message_id: messageId,
      tool_name: toolName,
      input_params: inputParams,
      output,
      status,
      error_message: errorMessage || null,
      duration_ms: durationMs || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to log tool call: ${error.message}`);
  return data;
}

// ── Pending Transactions ──

export async function createPendingTransaction(
  conversationId: string,
  userId: string,
  txType: string,
  txParams: Record<string, any>,
  estimatedGas?: string
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('pending_transactions')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      tx_type: txType,
      tx_params: txParams,
      estimated_gas: estimatedGas || null,
      status: 'awaiting_confirmation',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create pending transaction: ${error.message}`);
  return data;
}

export async function getPendingTransaction(pendingTxId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('pending_transactions')
    .select('*')
    .eq('id', pendingTxId)
    .single();

  if (error) return null;
  return data;
}

export async function updatePendingTransaction(
  pendingTxId: string,
  updates: {
    status?: string;
    tx_hash?: string;
    error_message?: string;
    confirmed_at?: string;
    broadcast_at?: string;
  }
) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('pending_transactions')
    .update(updates)
    .eq('id', pendingTxId);

  if (error) throw new Error(`Failed to update pending transaction: ${error.message}`);
}

// ── Whale Watchlist ──

export async function getWhaleWatchlist() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('whale_watchlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get whale watchlist: ${error.message}`);
  return data || [];
}

export async function addWhaleToWatchlist(address: string, label?: string, addedBy?: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('whale_watchlist')
    .insert({
      address: address.toLowerCase(),
      label: label || null,
      added_by: addedBy || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add whale: ${error.message}`);
  return data;
}
