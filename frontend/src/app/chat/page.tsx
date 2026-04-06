/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Send, Loader2, Menu, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    component?: string;
    data?: Record<string, any>;
  };
  timestamp: string;
}

interface PendingTx {
  txId: string;
  details: Record<string, any>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function ChatPageInner() {
  const { address } = useAccount();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingTx, setPendingTx] = useState<PendingTx | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle query param (from landing page prompt links)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && messages.length === 0) {
      setInput(q);
    }
  }, [searchParams, messages.length]);

  // Load a conversation's full message history
  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingHistory(true);
    setMessages([]);
    setConversationId(id);

    try {
      const res = await fetch(`${API_BASE}/chat/${id}`);
      if (!res.ok) return;

      const data = await res.json();
      const loaded: Message[] = (data.messages || [])
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          metadata: m.metadata?.component ? m.metadata : undefined,
          timestamp: m.created_at,
        }));

      setMessages(loaded);
    } catch {
      // Silently fail — keep empty state
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ]);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'X-Wallet-Address': address } : {}),
        },
        body: JSON.stringify({ message: trimmed, conversationId, walletAddress: address }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'text':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: event.content || '' } : m
                  )
                );
                if (event.conversationId) setConversationId(event.conversationId);
                break;

              case 'structured':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: m.content || 'Here are the results:',
                          metadata: { component: event.component, data: event.data },
                        }
                      : m
                  )
                );
                break;

              case 'confirmation':
                setPendingTx({ txId: event.txId, details: event.data || {} });
                break;

              case 'tool_call':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId && !m.content
                      ? { ...m, content: `🔧 ${event.content}` }
                      : m
                  )
                );
                break;

              case 'error':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: `❌ ${event.content}` } : m
                  )
                );
                break;

              case 'done':
                if (event.conversationId) setConversationId(event.conversationId);
                break;
            }
          } catch {
            // Ignore malformed SSE
          }
        }
      }
    } catch (error: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConfirmTx = async (confirmed: boolean) => {
    if (!pendingTx) return;
    try {
      const res = await fetch(`${API_BASE}/transaction/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingTxId: pendingTx.txId, confirmed }),
      });
      const result = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `tx-${Date.now()}`,
          role: 'assistant',
          content: confirmed
            ? `✅ Transaction broadcast!\n\n**Hash:** \`${result.txHash}\`\n\n[View on Etherscan](${result.explorerUrl})`
            : '❌ Transaction cancelled.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `txerr-${Date.now()}`,
          role: 'assistant',
          content: `❌ Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setPendingTx(null);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-[280px] sidebar-transition
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          conversationId={conversationId}
          onNewChat={handleNewChat}
          onSelectConversation={loadConversation}
          onClose={() => setSidebarOpen(false)}
          walletAddress={address}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b border-(--border) flex items-center px-4 gap-3 bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-(--bg-tertiary) transition"
          >
            <Menu className="w-5 h-5 text-(--accent-primary)" />
          </button>
          <Zap className="w-5 h-5 text-(--text-secondary)" />
          <span className="text-sm font-medium text-(--text-secondary)">ChainPilot AI</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Loading history indicator */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center gap-2 py-8 text-(--text-secondary)">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading conversation...</span>
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && !isLoadingHistory && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-(--bg-secondary)/10 flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-(--text-secondary)" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to ChainPilot AI</h2>
                <p className="text-(--text-secondary) max-w-md mb-8">
                  Analyze wallets, explain transactions, detect risks — just ask in plain English.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    'Analyze wallet vitalik.eth',
                    'Is this token safe?',
                    'Show DeFi yields for ETH',
                    'Track whale activity',
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                      className="glass-card p-3 text-left text-sm text-(--text-secondary) hover:text-foreground transition"
                    >
                      <span className="text-(--text-secondary) mr-1">→</span> {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input Area ── */}
        <div className="border-t border-(--border) p-4 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 glass-card p-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about wallets, transactions, tokens, DeFi..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-(--text-secondary) outline-none max-h-32 leading-relaxed"
                style={{ minHeight: '24px', height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
                disabled={isStreaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className={`p-2 rounded-lg transition ${
                  input.trim() && !isStreaming
                    ? 'bg-(--bg-secondary) hover:bg-(--bg-tertiary)/80 text-white'
                    : 'bg-(--bg-secondary) text-(--text-secondary) cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-(--text-secondary) mt-2 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {pendingTx && (
        <ConfirmationModal
          txId={pendingTx.txId}
          details={pendingTx.details}
          onConfirm={() => handleConfirmTx(true)}
          onCancel={() => handleConfirmTx(false)}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Zap className="w-10 h-10 text-(--text-secondary) animate-pulse" />
            <p className="text-sm text-(--text-secondary)">Loading ChainPilot AI...</p>
          </div>
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
