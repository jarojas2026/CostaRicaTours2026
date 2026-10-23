import React from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

export type SubmitState = 'idle' | 'loading' | 'success' | 'error';

interface SubmitButtonProps {
  state?: SubmitState;
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  labels: { idle: string; loading?: string; success?: string; error?: string };
  icon?: React.ReactNode;
}

/**
 * Contrato de botón de submit: idle/loading/success/error.
 * Regla: todo CTA asíncrono debe respetar este contrato (issue #366).
 * Aditivo: no reemplaza botones existentes; se adopta progresivamente.
 */
export function SubmitButton({ state = 'idle', onClick, type = 'button', disabled = false, className = '', labels, icon }: SubmitButtonProps) {
  const isBusy = state === 'loading';
  const isDone = state === 'success';
  const label = state === 'loading' ? (labels.loading ?? labels.idle) : state === 'success' ? (labels.success ?? labels.idle) : state === 'error' ? (labels.error ?? labels.idle) : labels.idle;
  const stateIcon = state === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : state === 'success' ? <Check className="w-4 h-4" /> : state === 'error' ? <AlertCircle className="w-4 h-4" /> : icon;
  return (
    <button type={type} onClick={onClick} disabled={disabled || isBusy || isDone} aria-busy={isBusy}
      className={`min-h-[44px] px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}>
      {stateIcon}<span>{label}</span>
    </button>
  );
}
