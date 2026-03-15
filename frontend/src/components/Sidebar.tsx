'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MessageSquare, Plus, X, Zap } from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
  conversationId: string | null;
  onNewChat: () => void;
  onClose: () => void;
  walletAddress?: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function Sidebar({ conversationId, onNewChat, onClose, walletAddress }: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  // Fetch conversations
  useEffect(() => {
    if (!walletAddress) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/chat/conversations?walletAddress=${walletAddress}`
        );
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch {
        // Silently fail
      }
    };

    fetchConversations();
  }, [walletAddress, conversationId]);

  return (
    <div className="h-full flex flex-col bg-(--bg-secondary) border-r border-(--border)">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-(--border)">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-(--text-secondary)" />
          <span className="text-sm font-semibold gradient-text">ChainPilot AI</span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-(--bg-tertiary) transition"
        >
          <X className="w-4 h-4 text-(--accent-primary)" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-(--border) hover:bg-(--bg-tertiary) transition text-sm text-(--text-secondary) hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-(--text-secondary) text-center mt-8 px-4">
            No conversations yet. Start chatting!
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              className={`
                w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
                ${
                  conv.id === conversationId
                    ? 'bg-(--bg-secondary) text-foreground'
                    : 'text-(--text-secondary) hover:bg-(--bg-tertiary)/50 hover:text-foreground'
                }
              `}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{conv.title || 'Untitled Chat'}</span>
            </button>
          ))
        )}
      </div>

      {/* Wallet Connect */}
      <div className="p-3 border-t border-(--border)">
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </div>
  );
}
