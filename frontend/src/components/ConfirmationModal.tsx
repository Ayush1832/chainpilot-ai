'use client';

import { AlertTriangle, X, Send, Ban } from 'lucide-react';

interface ConfirmationModalProps {
  txId: string;
  details: Record<string, unknown>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  details,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div
        className="relative w-full max-w-md mx-4 bg-(--bg-secondary) border border-(--border) rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: 'message-in 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-(--accent-primary)" />
            <h3 className="text-base font-semibold">Confirm Transaction</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-(--bg-tertiary) transition"
          >
            <X className="w-4 h-4 text-(--accent-primary)" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          {Boolean(details.type) && (
            <DetailRow label="Type" value={String(details.type).replace(/_/g, ' ').toUpperCase()} />
          )}
          {Boolean(details.to) && (
            <DetailRow
              label="To"
              value={String(details.to)}
              mono
            />
          )}
          {Boolean(details.toEns) && (
            <DetailRow
              label="ENS"
              value={String(details.toEns)}
              accent
            />
          )}
          {Boolean(details.amount) && (
            <DetailRow
              label="Amount"
              value={`${String(details.amount)} ${String(details.token || 'ETH')}`}
              highlight
            />
          )}
          {Boolean(details.estimatedGas) && (
            <DetailRow
              label="Est. Gas"
              value={`~${String(details.estimatedGas)} ETH${
                details.estimatedGasUsd
                  ? ` ($${Number(details.estimatedGasUsd).toFixed(2)})`
                  : ''
              }`}
            />
          )}
          {Boolean(details.network) && (
            <DetailRow label="Network" value={String(details.network)} />
          )}
        </div>

        {/* Warning */}
        <div className="mx-6 mb-4 px-4 py-2.5 rounded-lg bg-(--bg-secondary)/10 border border-(--border)/20">
          <p className="text-xs text-(--text-secondary) flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            This action is irreversible. Funds will be sent immediately.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-(--border) flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-outline flex items-center justify-center gap-2 py-3"
          >
            <Ban className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-(--bg-secondary) hover:bg-(--bg-tertiary)/80 text-(--text-secondary) font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition"
          >
            <Send className="w-4 h-4" />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-(--text-secondary)">{label}</span>
      <span
        className={`
          text-sm text-right max-w-[65%] truncate
          ${mono ? 'font-mono text-xs' : ''}
          ${accent ? 'text-(--text-secondary)' : ''}
          ${highlight ? 'font-semibold text-foreground' : ''}
          ${!accent && !highlight ? 'text-foreground' : ''}
        `}
      >
        {value}
      </span>
    </div>
  );
}
