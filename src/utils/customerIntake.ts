import { Language } from '../types';

export interface CustomerIntakeRequest {
  message: string;
  language?: Language;
  source?: string;
  sessionId?: string;
  customer?: { name?: string; email?: string; phone?: string };
  context?: Record<string, any>;
}

export function requestCustomerIntake(payload: CustomerIntakeRequest): void {
  window.dispatchEvent(new CustomEvent('customer-intake-request', { detail: payload }));
}
