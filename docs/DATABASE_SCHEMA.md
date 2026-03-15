# ChainPilot AI — Database Schema (Supabase / PostgreSQL)

## Overview

The database stores conversation history, tool invocation logs, pending transactions awaiting confirmation, and whale watchlist entries. It uses Supabase (PostgreSQL) on the free tier.

---

## Tables

### 1. `users`

Stores connected wallet users.

| Column         | Type         | Constraints                     | Description                        |
|----------------|--------------|----------------------------------|------------------------------------|
| `id`           | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Internal user ID                   |
| `wallet_address` | `text`     | UNIQUE, NOT NULL                 | Ethereum wallet address (lowercase)|
| `ens_name`     | `text`       | NULLABLE                         | Resolved ENS name (cached)         |
| `created_at`   | `timestamptz`| DEFAULT `now()`                  | Account creation timestamp         |
| `updated_at`   | `timestamptz`| DEFAULT `now()`                  | Last activity timestamp            |

**Indexes**: `wallet_address` (unique)

---

### 2. `conversations`

Each chat session is a conversation.

| Column         | Type         | Constraints                     | Description                        |
|----------------|--------------|----------------------------------|------------------------------------|
| `id`           | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Conversation ID                    |
| `user_id`      | `uuid`       | FK → `users.id`, NULLABLE       | Owner (null = anonymous)           |
| `title`        | `text`       | NULLABLE                         | Auto-generated title from first message |
| `created_at`   | `timestamptz`| DEFAULT `now()`                  | When conversation started          |
| `updated_at`   | `timestamptz`| DEFAULT `now()`                  | Last message timestamp             |

**Indexes**: `user_id`, `updated_at DESC`

---

### 3. `messages`

All chat messages (user + AI).

| Column            | Type         | Constraints                     | Description                        |
|-------------------|--------------|----------------------------------|------------------------------------|
| `id`              | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Message ID                         |
| `conversation_id` | `uuid`       | FK → `conversations.id`, NOT NULL, ON DELETE CASCADE | Parent conversation |
| `role`            | `text`       | NOT NULL, CHECK (`role` IN ('user', 'assistant', 'system', 'tool')) | Message sender |
| `content`         | `text`       | NOT NULL                         | Message text / markdown            |
| `metadata`        | `jsonb`      | DEFAULT `'{}'`                   | Structured data (wallet report, tx summary, risk card, etc.) |
| `created_at`      | `timestamptz`| DEFAULT `now()`                  | Timestamp                          |

**Indexes**: `conversation_id` + `created_at ASC` (composite), `role`

---

### 4. `tool_calls`

Logs every tool invocation by the AI agent for auditability.

| Column            | Type         | Constraints                     | Description                        |
|-------------------|--------------|----------------------------------|------------------------------------|
| `id`              | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Tool call ID                       |
| `message_id`      | `uuid`       | FK → `messages.id`, NULLABLE    | Associated AI message              |
| `conversation_id` | `uuid`       | FK → `conversations.id`, NOT NULL | Parent conversation              |
| `tool_name`       | `text`       | NOT NULL                         | e.g. `get_wallet_info`, `send_eth` |
| `input_params`    | `jsonb`      | NOT NULL                         | Parameters passed to tool          |
| `output`          | `jsonb`      | NULLABLE                         | Tool response (null if failed)     |
| `status`          | `text`       | NOT NULL, DEFAULT `'pending'`, CHECK (`status` IN ('pending', 'success', 'error')) | Execution status |
| `error_message`   | `text`       | NULLABLE                         | Error details if failed            |
| `duration_ms`     | `integer`    | NULLABLE                         | Execution time in milliseconds     |
| `created_at`      | `timestamptz`| DEFAULT `now()`                  | Timestamp                          |

**Indexes**: `conversation_id`, `tool_name`, `status`

---

### 5. `pending_transactions`

Stores transactions awaiting user confirmation before broadcast.

| Column            | Type         | Constraints                     | Description                        |
|-------------------|--------------|----------------------------------|------------------------------------|
| `id`              | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Pending tx ID                      |
| `conversation_id` | `uuid`       | FK → `conversations.id`, NOT NULL | Conversation context             |
| `user_id`         | `uuid`       | FK → `users.id`, NOT NULL       | Who requested the transaction      |
| `tx_type`         | `text`       | NOT NULL                         | `send_eth`, `transfer_erc20`, `swap` |
| `tx_params`       | `jsonb`      | NOT NULL                         | `{ to, amount, token?, ... }`      |
| `estimated_gas`   | `text`       | NULLABLE                         | Gas estimate in ETH                |
| `status`          | `text`       | NOT NULL, DEFAULT `'awaiting_confirmation'`, CHECK (`status` IN ('awaiting_confirmation', 'confirmed', 'rejected', 'broadcast', 'mined', 'failed')) | Tx lifecycle |
| `tx_hash`         | `text`       | NULLABLE                         | On-chain tx hash (after broadcast) |
| `error_message`   | `text`       | NULLABLE                         | Error if failed                    |
| `created_at`      | `timestamptz`| DEFAULT `now()`                  | When user requested                |
| `confirmed_at`    | `timestamptz`| NULLABLE                         | When user confirmed                |
| `broadcast_at`    | `timestamptz`| NULLABLE                         | When tx was broadcast              |

**Indexes**: `conversation_id`, `user_id`, `status`

---

### 6. `whale_watchlist`

Tracked whale wallet addresses.

| Column         | Type         | Constraints                     | Description                        |
|----------------|--------------|----------------------------------|------------------------------------|
| `id`           | `uuid`       | PK, DEFAULT `gen_random_uuid()` | Entry ID                           |
| `address`      | `text`       | UNIQUE, NOT NULL                 | Whale wallet address (lowercase)   |
| `label`        | `text`       | NULLABLE                         | Human-readable label (e.g. "Jump Trading") |
| `added_by`     | `uuid`       | FK → `users.id`, NULLABLE       | Who added this whale               |
| `created_at`   | `timestamptz`| DEFAULT `now()`                  | When added                         |

**Indexes**: `address` (unique)

---

## Entity-Relationship Diagram

```
users (1) ──── (∞) conversations (1) ──── (∞) messages
  │                      │                        │
  │                      │                        │
  │                      ├──── (∞) tool_calls ────┘
  │                      │
  │                      └──── (∞) pending_transactions
  │
  └──── (∞) whale_watchlist
```

---

## SQL Migration (Initial)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- 3. messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- 4. tool_calls
CREATE TABLE tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_params JSONB NOT NULL,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tool_calls_conversation ON tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_tool ON tool_calls(tool_name);

-- 5. pending_transactions
CREATE TABLE pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  tx_type TEXT NOT NULL,
  tx_params JSONB NOT NULL,
  estimated_gas TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_confirmation'
    CHECK (status IN ('awaiting_confirmation', 'confirmed', 'rejected', 'broadcast', 'mined', 'failed')),
  tx_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  broadcast_at TIMESTAMPTZ
);
CREATE INDEX idx_pending_tx_conversation ON pending_transactions(conversation_id);
CREATE INDEX idx_pending_tx_user ON pending_transactions(user_id);
CREATE INDEX idx_pending_tx_status ON pending_transactions(status);

-- 6. whale_watchlist
CREATE TABLE whale_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  label TEXT,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row-Level Security (RLS) — enable on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whale_watchlist ENABLE ROW LEVEL SECURITY;
```

---

## Supabase Configuration Notes

1. **RLS Policies**: After enabling RLS, create policies so users can only read/write their own conversations and transactions. The backend service role key bypasses RLS for server-side operations.

2. **Realtime**: Enable Supabase Realtime on the `messages` table if you want to push new AI messages to the frontend via WebSocket instead of polling.

3. **Storage**: Not needed initially. If you add image/NFT preview caching later, use Supabase Storage.

4. **Free Tier Limits**: 500 MB database, 2 GB bandwidth, 50K monthly active users — more than sufficient for a portfolio project.
