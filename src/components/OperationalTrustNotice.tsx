import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, FileText } from 'lucide-react';
import { Language } from '../types';
import { directWhatsAppUrl } from '../utils/directWhatsApp';

interface OperationalTrustNoticeProps {
  language: Language;
}

/**
 * Honest pre-operational trust message, shown right below the hero.
 * It states what the platform does today (inquiries + confirmation before any
 * payment) instead of claiming live inventory, certifications or verification.
 */
export const OperationalTrustNotice: React.FC<OperationalTrustNoticeProps> = ({ language }) => {
  const isEs = language === 'es';
  const steps = isEs
    ? [
        'Nos cuentas qué experiencia, fecha y cuántas personas.',
        'Confirmamos por escrito operador, precio final y cupo.',
        'Solo entonces se acuerda el pago. Una cotización no es una reserva.',
      ]
    : [
        'Tell us the experience, date and party size.',
        'We confirm the operator, final price and availability in writing.',
        'Only then is payment arranged. A quote is not a booking.',
      ];

  return (
    <section
      aria-labelledby="operational-trust-title"
      className="mx-auto w-full max-w-7xl px-4 sm:px-6"
    >
      <div className="rounded-3xl border border-amber-400/30 bg-[#062017]/95 p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {isEs ? 'Verificación operativa' : 'Operational verification'}
            </div>
            <h2 id="operational-trust-title" className="text-xl sm:text-2xl font-black text-white">
              {isEs
                ? 'Experiencias seleccionadas en Costa Rica — confirmamos operador, precio y cupo antes de cualquier pago'
                : 'Selected Costa Rica experiences — we confirm operator, price and availability before any payment'}
            </h2>
            <ol className="grid gap-2 sm:grid-cols-3 text-sm text-emerald-100/85">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="font-black text-amber-400">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <a
              href={directWhatsAppUrl(isEs
                ? 'Hola, quiero cotizar una experiencia en Costa Rica.'
                : 'Hi, I would like a quote for a Costa Rica experience.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-stone-950 hover:bg-[#20bd5a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {isEs ? 'Cotizar por WhatsApp' : 'Get a quote on WhatsApp'}
            </a>
            <Link
              to="/terms"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-5 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              {isEs ? 'Cómo funciona' : 'How it works'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
