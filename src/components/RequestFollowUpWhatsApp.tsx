import React from 'react';
import { requestFollowUpWhatsAppUrl } from '../../shared/requestConfirmation';

/** Enlace opcional (no flotante, sin envío automático) para seguir una solicitud por WhatsApp. */
export const RequestFollowUpWhatsApp: React.FC<{ reference: string | null; language: 'es' | 'en'; className?: string }> = ({ reference, language, className }) => {
  const href = requestFollowUpWhatsAppUrl(reference, language);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="request-followup-whatsapp"
      className={className || 'mt-2 inline-flex min-h-[44px] items-center rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-bold underline-offset-2 hover:underline'}
    >
      {language === 'es' ? 'Opcional: dar seguimiento por WhatsApp' : 'Optional: follow up on WhatsApp'}
      <span className="sr-only">{language === 'es' ? ' (se abre en una pestaña nueva)' : ' (opens in a new tab)'}</span>
    </a>
  );
};
