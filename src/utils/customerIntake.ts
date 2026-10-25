import { Language } from '../types';

export interface CustomerIntakeRequest {
  message: string;
  language?: Language;
  source?: string;
  sessionId?: string;
  customer?: { name?: string; email?: string; phone?: string };
  context?: Record<string, any>;
  /** Antiabuso (shared/formAbuse): honeypot y marca de tiempo del formulario. */
  website?: string;
  formStartedAt?: number;
  onResult?: (result: CustomerIntakeResult) => void;
}

export interface CustomerIntakeResult {
  ok: boolean;
  reply?: string;
  intakeId?: string;
  journeyId?: string;
  workflow?: unknown;
  handoffUrl?: string;
  /** true si la respuesta se descartó porque la identidad cambió mientras se procesaba. */
  discarded?: boolean;
}

export function requestCustomerIntake(payload: CustomerIntakeRequest): void {
  window.dispatchEvent(new CustomEvent('customer-intake-request', { detail: payload }));
}
