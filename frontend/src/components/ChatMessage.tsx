/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import ReactMarkdown from 'react-markdown';
import { WalletReport } from '@/components/WalletReport';
import { TokenRiskCard } from '@/components/TokenRiskCard';
import { TransactionSummary } from '@/components/TransactionSummary';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: {
      component?: string;
      data?: Record<string, any>;
    };
    timestamp: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasStructured = message.metadata?.component && message.metadata?.data;

  return (
    <div className={`message-animate flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-(--bg-secondary)/15 flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-(--accent-primary)" />
        </div>
      )}

      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${
            isUser
              ? 'bg-(--bg-secondary) text-white rounded-tr-sm'
              : 'glass-card rounded-tl-sm'
          }
        `}
      >
        {/* Markdown content */}
        {message.content && (
          <div className={`prose prose-sm max-w-none ${isUser ? 'text-white' : 'text-foreground'}`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-(--text-secondary) underline underline-offset-2">
                    {children}
                  </a>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <pre className="bg-background rounded-lg p-3 overflow-x-auto my-2 text-xs">
                        <code className="font-mono text-(--text-secondary)">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="bg-(--bg-secondary) text-(--text-secondary) px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
                hr: () => <hr className="border-(--border) my-3" />,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-(--border) pl-3 my-2 text-(--text-secondary)">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Structured data card */}
        {hasStructured && (
          <div className="mt-3">
            {message.metadata!.component === 'WalletReport' && (
              <WalletReport data={message.metadata!.data!} />
            )}
            {message.metadata!.component === 'TokenRiskCard' && (
              <TokenRiskCard data={message.metadata!.data!} />
            )}
            {message.metadata!.component === 'TransactionSummary' && (
              <TransactionSummary data={message.metadata!.data!} />
            )}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-[10px] mt-1.5 ${
            isUser ? 'text-white/50' : 'text-(--text-secondary)'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-(--bg-secondary)/30 flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-(--accent-primary)" />
        </div>
      )}
    </div>
  );
}
