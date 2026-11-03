import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { Language } from '../types';
import { whatsappInquiryUrl } from '../utils/directWhatsApp';

/**
 * Botón flotante de WhatsApp solo para celular (oculto desde `sm`).
 * Es un enlace simple: solo abre un borrador en wa.me (sin IA, sin solicitud al servidor, sin cobro).
 * Se ubica por encima de la BottomNav (bottom-3 + h-14) para no taparla; no modifica BottomNav ni Header.
 */
export const MobileWhatsAppButton: React.FC<{ language: Language }> = ({ language }) => {
  const isEs = language === 'es';
  const href = whatsappInquiryUrl(
    isEs ? 'Hola, quiero información sobre un tour en Costa Rica.' : 'Hello, I would like information about a tour in Costa Rica.',
    language,
  );
  const label = isEs ? 'Escribir por WhatsApp' : 'Chat on WhatsApp';
  return (
    <a
      data-testid="mobile-whatsapp-button"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="sm:hidden fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[55] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 bg-[#25D366] text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </a>
  );
};

export default MobileWhatsAppButton;
