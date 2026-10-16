import React from 'react';
import { ShieldCheck, MessageCircle } from 'lucide-react';
import { Language } from '../types';
import { requestCustomerIntake } from '../utils/customerIntake';
import { OPERATOR_IDENTITY_NOTE, SUPPLIER_POLICY } from '../utils/operatorPrivacy';

interface OperatorsSectionProps {
  language: Language;
  /** Se conserva por compatibilidad; ya no se listan perfiles de operador al público. */
  onSelectOperator?: (operatorId: string) => void;
}

/**
 * Decisión del negocio: no se publican nombres ni contactos de operadores antes de
 * reservar. Esta sección explica cómo trabajamos y lleva a cotizar con nosotros.
 */
export const OperatorsSection: React.FC<OperatorsSectionProps> = ({ language }) => {
  const isEs = language === 'es';
  const lang = isEs ? 'es' : 'en';

  return (
    <section id="operators-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-emerald-500/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEs ? 'Operadores locales' : 'Local operators'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs ? 'Cotiza con nosotros, nosotros coordinamos al operador' : 'Request a quote from us, we coordinate the operator'}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mt-2">
            {SUPPLIER_POLICY[lang]} {OPERATOR_IDENTITY_NOTE[lang]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 bg-[#041910] border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
            {isEs ? 'Catálogo ≠ confirmación operativa' : 'Catalog ≠ operational confirmation'}
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-400/25 bg-[#041910] p-6 sm:p-8">
        <p className="max-w-3xl text-sm leading-relaxed text-stone-200">
          {isEs
            ? 'Cuéntanos la zona, la fecha y el tipo de experiencia: te enviamos una cotización con disponibilidad y precio confirmados antes de cualquier pago.'
            : 'Tell us the area, date and type of experience: we send you a quote with confirmed availability and price before any payment.'}
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-stone-400">
          {isEs
            ? 'Antes de pagar o emitir un voucher, Costa Rica Tours debe verificar disponibilidad real, proveedor asignado y condiciones aplicables al servicio solicitado.'
            : 'Before payment or voucher issuance, Costa Rica Tours must verify real availability, the assigned provider and the conditions that apply to the requested service.'}
        </p>
        <button
          type="button"
          onClick={() => requestCustomerIntake({
            message: isEs ? 'Quiero cotizar experiencias para mi viaje a Costa Rica.'
              : 'I would like a quote for experiences on my Costa Rica trip.',
            language, source: 'operators:quote-request'
          })}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-stone-950 hover:bg-[#20ba59]"
        >
          <MessageCircle className="h-4 w-4" />
          {isEs ? 'Solicitar cotización' : 'Request a quote'}
        </button>
      </div>
    </section>
  );
};
