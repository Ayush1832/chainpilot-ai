'use client';

import { ArrowUpRight, ArrowDownLeft, Clock, Fuel, Hash } from 'lucide-react';

interface TransactionSummaryProps {
  data: Record<string, unknown>;
}

export function TransactionSummary({ data }: TransactionSummaryProps) {
  const statusColor = data.status === 'success' ? '#00cec9' : '#e17055';

  return (
    <div className="bg-(--bg-secondary) border border-(--border) rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-(--text-secondary)" />
          <span className="text-sm font-semibold">Transaction Summary</span>
        </div>
        <span
          className="badge"
          style={{
            background: `${statusColor}20`,
            color: statusColor,
          }}
        >
          {String(data.status || 'unknown')}
        </span>
      </div>

      {/* Summary */}
      {Boolean(data.summary) && (
        <div className="px-4 py-3 border-b border-(--border)">
          <p className="text-sm leading-relaxed">{String(data.summary)}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="px-4 py-3 border-b border-(--border) grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-(--text-secondary) mb-0.5">From</p>
          <p className="font-mono text-xs text-foreground truncate">{String(data.from)}</p>
        </div>
        <div>
          <p className="text-xs text-(--text-secondary) mb-0.5">To</p>
          <p className="font-mono text-xs text-foreground truncate">{String(data.to || '—')}</p>
        </div>
        <div>
          <p className="text-xs text-(--text-secondary) mb-0.5">Value</p>
          <p className="text-sm font-medium">{String(data.value || '0')} ETH</p>
        </div>
        <div>
          <p className="text-xs text-(--text-secondary) mb-0.5">Block</p>
          <p className="text-sm">{String(data.blockNumber || '—')}</p>
        </div>
      </div>

      {/* Gas */}
      <div className="px-4 py-3 border-b border-(--border) flex items-center gap-3">
        <Fuel className="w-4 h-4 text-(--text-secondary)" />
        <div>
          <span className="text-sm">{String(data.gasCostEth || '—')} ETH</span>
          {data.gasCostUsd != null && (
            <span className="text-xs text-(--text-secondary) ml-2">
              (${Number(data.gasCostUsd).toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* Protocol */}
      {Boolean(data.protocol) && (
        <div className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
          <span className="text-xs text-(--text-secondary)">Protocol</span>
          <span className="text-sm text-(--text-secondary) font-medium">{String(data.protocol)}</span>
        </div>
      )}

      {/* Token Transfers */}
      {(data.tokenTransfers as unknown[])?.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs text-(--text-secondary) mb-2">Token Transfers</p>
          <div className="space-y-2">
            {(data.tokenTransfers as Array<{from: string, amount: string, token: string}> || []).map((transfer, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {transfer.from === data.from ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-(--text-secondary)" />
                ) : (
                  <ArrowDownLeft className="w-3.5 h-3.5 text-(--text-secondary)" />
                )}
                <span className="font-medium">{transfer.amount}</span>
                <span className="text-(--text-secondary)">{transfer.token}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      {Boolean(data.timestamp) && (
        <div className="px-4 py-2 bg-(--bg-secondary)/30 flex items-center gap-2">
          <Clock className="w-3 h-3 text-(--accent-primary)" />
          <span className="text-xs text-(--text-secondary)">
            {new Date(String(data.timestamp)).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
