import React, { useState } from 'react';
import { Language } from '../types';
import { X, ShieldCheck, FileText, Lock, AlertCircle, Building, Book } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type TabType = 'terminos' | 'cancelacion' | 'privacidad' | 'escnna';

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, language }) => {
  const [activeTab, setActiveTab] = useState<TabType>('terminos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-950 text-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-950 border border-white/10 rounded-full flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                {language === 'es' ? 'Políticas y Legal' : 'Legal & Policies'}
              </h2>
              <p className="text-[11px] text-stone-200/70 uppercase tracking-widest font-bold">
                {language === 'es' ? 'Costa Rica Tours (costaricatours.es)' : 'Costa Rica Tours (costaricatours.es)'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/[0.03] hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Tabs Sidebar */}
          <div className="sm:w-64 border-r border-white/10 p-4 space-y-2 shrink-0 overflow-x-auto sm:overflow-y-auto flex sm:flex-col">
            <button
              onClick={() => setActiveTab('terminos')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors whitespace-nowrap sm:whitespace-normal font-bold text-sm ${
                activeTab === 'terminos' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{language === 'es' ? 'Términos y Condiciones' : 'Terms & Conditions'}</span>
            </button>
            <button
              onClick={() => setActiveTab('cancelacion')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors whitespace-nowrap sm:whitespace-normal font-bold text-sm ${
                activeTab === 'cancelacion' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{language === 'es' ? 'Política de Cancelación' : 'Cancellation Policy'}</span>
            </button>
            <button
              onClick={() => setActiveTab('privacidad')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors whitespace-nowrap sm:whitespace-normal font-bold text-sm ${
                activeTab === 'privacidad' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>{language === 'es' ? 'Privacidad y Datos' : 'Privacy & Data'}</span>
            </button>
            <button
              onClick={() => setActiveTab('escnna')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors whitespace-nowrap sm:whitespace-normal font-bold text-sm ${
                activeTab === 'escnna' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span>{language === 'es' ? 'Normativa ESCNNA' : 'ESCNNA Rules'}</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-stone-950">
            <div className="prose prose-invert prose-emerald max-w-none text-sm space-y-6">
              
              {activeTab === 'terminos' && (
                <>
                  <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">Términos y Condiciones Generales</h3>
                  <p className="text-orange-400/80 font-bold mb-4">Última actualización: 04 de agosto de 2026</p>
                  
                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">1. Identificación del prestador</h4>
                  <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                    <li><strong>Razón social:</strong> Costa Rica Tours (costaricatours.es)</li>
                    
                    <li><strong>Registro Nacional de Turismo (RNT):</strong> 892-RNT-26</li>
                    <li><strong>Patente Municipal:</strong> 45-2026-PM</li>
                    <li><strong>Domicilio:</strong> San José, Costa Rica</li>
                    <li><strong>Contacto:</strong> +506 8795‑9148 | info@costaricatours.es</li>
                  </ul>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">2. Ámbito de aplicación</h4>
                  <p className="text-neutral-300">Los presentes Términos y Condiciones regulan el uso del sitio web tourscostarica.ai.studio y la contratación de servicios turísticos ofrecidos por nuestra agencia. Al realizar una reserva, el cliente declara haber leído, comprendido y aceptado íntegramente estas condiciones.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">3. Información de precios</h4>
                  <p className="text-neutral-300">Los precios mostrados son en dólares estadounidenses (USD) e incluyen impuestos turísticos vigentes en Costa Rica, salvo indicación expresa en contrario. Los precios son referenciales y quedan confirmados únicamente tras el pago del depósito de reserva. Cualquier cargo adicional por cambio de moneda o comisión bancaria será asumido por el cliente según las condiciones de su entidad financiera.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">4. Proceso de reserva y pago</h4>
                  <p className="text-neutral-300">Para confirmar una reserva se requiere un depósito del 30% del valor total del tour. El saldo restante deberá abonarse al menos 7 días antes de la fecha de realización del servicio. El pago podrá realizarse mediante tarjeta de crédito/débito, PayPal o transferencia bancaria. Una vez recibido el depósito, se enviará al cliente un comprobante de reserva y voucher digital con código único.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">5. Modificaciones del servicio</h4>
                  <p className="text-neutral-300">Nos reservamos el derecho de modificar el orden del itinerario, sustituir actividades o cambiar el punto de encuentro por razones de seguridad, condiciones climáticas o normativa del Sistema Nacional de Áreas de Conservación (SINAC), manteniendo siempre el valor y la calidad del servicio contratado.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">6. Responsabilidad y riesgos</h4>
                  <p className="text-neutral-300">Las actividades turísticas y de aventura implican riesgos inherentes. El cliente acepta participar bajo su propia responsabilidad. No recomendamos la participación en tours de aventura a personas con problemas cardíacos, embarazadas después del sexto mes de gestación, personas que sufren vértigo o dificultades respiratorias, ni a quienes padezcan condiciones médicas no compatibles con la actividad. La agencia cuenta con seguro de responsabilidad civil profesional vigente, conforme a los requisitos del las autoridades locales.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">7. Reglas en áreas protegidas</h4>
                  <p className="text-neutral-300">El cliente se compromete a respetar el reglamento del SINAC, horarios de ingreso, prohibición de drones, uso de flash fotográfico y cualquier otra indicación del guía o personal del parque nacional. El incumplimiento puede generar multas o prohibición de ingreso sin derecho a reembolso.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">8. Legislación y jurisdicción aplicable</h4>
                  <p className="text-neutral-300">Estos Términos y Condiciones se rigen por las leyes de la República de Costa Rica. Cualquier controversia será resuelta ante los tribunales ordinarios de San José, Costa Rica.</p>
                </>
              )}

              {activeTab === 'cancelacion' && (
                <>
                  <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">Política de Cancelación y Reembolsos</h3>
                  <p className="text-orange-400/80 font-bold mb-4">Última actualización: 04 de agosto de 2026</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">Cancelación por parte del cliente</h4>
                  <div className="overflow-x-auto mt-4 mb-6 rounded-xl border border-white/10 bg-white/5">
                    <table className="w-full text-left text-sm text-neutral-300">
                      <thead className="bg-white/5 font-bold">
                        <tr>
                          <th className="px-4 py-3 border-b border-white/10">Antelación de la cancelación</th>
                          <th className="px-4 py-3 border-b border-white/10">Condición de reembolso</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 border-b border-white/5">Más de 48 horas antes del tour</td>
                          <td className="px-4 py-3 border-b border-white/5 text-orange-400 font-bold">Devolución del 100% del depósito, menos gastos administrativos</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 border-b border-white/5">Entre 24 y 48 horas antes del tour</td>
                          <td className="px-4 py-3 border-b border-white/5 text-orange-400 font-bold">Se retiene el 50% del valor total del servicio</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">Menos de 24 horas / No presentación (no‑show)</td>
                          <td className="px-4 py-3 text-red-400 font-bold">No procede reembolso</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">Cancelación por parte de la agencia</h4>
                  <p className="text-neutral-300 mb-2">Si el tour debe cancelarse por causas de fuerza mayor, clima extremo, cierre temporal del parque por disposición SINAC o cualquier causa ajena a la voluntad del cliente, se ofrecerán tres alternativas:</p>
                  <ol className="list-decimal pl-5 space-y-2 text-neutral-300">
                    <li>Reprogramar el tour para otra fecha disponible sin costo adicional.</li>
                    <li>Crédito del 100% del valor pagado para utilizar en cualquier otro tour de nuestro catálogo, válido por 12 meses.</li>
                    <li>Reembolso del importe abonado, descontados los gastos de gestión y comisiones de pasarela de pago ya aplicadas.</li>
                  </ol>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">Cambios de fecha o número de personas</h4>
                  <p className="text-neutral-300">Las modificaciones solicitadas por el cliente estarán sujetas a disponibilidad de cupos y al ajuste de precio correspondiente. No se garantiza la misma tarifa si la solicitud se realiza con menos de 7 días de antelación.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">Disputas de pago (contracargos / chargebacks)</h4>
                  <p className="text-neutral-300">No se aceptarán solicitudes de reembolso mediante contracargo bancario cuando el servicio haya sido prestado conforme a lo contratado. Cualquier reclamo deberá presentarse por escrito durante o inmediatamente después de la realización del tour, según lo establecido en los Términos y Condiciones.</p>
                </>
              )}

              {activeTab === 'privacidad' && (
                <>
                  <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">Política de Privacidad</h3>
                  <p className="text-orange-400/80 font-bold mb-4">Última actualización: 04 de agosto de 2026</p>

                  <p className="text-neutral-300">En cumplimiento de la Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales (Ley N° 8968, PRODHAB), el Reglamento General de Protección de Datos (GDPR) de la Unión Europea y la Ley de Protección de la Privacidad del Consumidor de California (CCPA), informamos lo siguiente:</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">1. Responsable del tratamiento de datos</h4>
                  <p className="text-neutral-300">Costa Rica Tours (costaricatours.es)<br/>Correo electrónico: info@costaricatours.es<br/>Domicilio: San José, Costa Rica</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">2. Datos que recopilamos</h4>
                  <p className="text-neutral-300">Podemos recopilar: nombre completo, correo electrónico, número de teléfono, nacionalidad, fecha de nacimiento, datos de facturación y cualquier información voluntaria que el cliente proporcione al realizar una reserva o consulta. No almacenamos números completos de tarjetas de crédito ni códigos de seguridad (CVV); estos datos son procesados exclusivamente por pasarelas de pago certificadas PCI‑DSS.</p>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">3. Finalidad del tratamiento</h4>
                  <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                    <li>Gestionar, confirmar y comunicar los detalles de la reserva.</li>
                    <li>Emitir comprobantes, vouchers y facturas electrónicas.</li>
                    <li>Enviar recordatorios pre‑tour, encuestas de satisfacción y notificaciones relacionadas con el servicio contratado.</li>
                    <li>Cumplir con obligaciones fiscales, turísticas y legales en Costa Rica.</li>
                  </ul>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">4. Derechos del titular de los datos</h4>
                  <p className="text-neutral-300">El cliente tiene derecho a acceder, rectificar, eliminar o limitar el tratamiento de sus datos. Para ejercer estos derechos, envíe un correo a info@tourscostarica.cr. Responderemos en un plazo máximo de 10 días hábiles.</p>
                  
                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-2">5. Conservación y Compartición de datos</h4>
                  <p className="text-neutral-300">Los datos personales se conservarán durante el tiempo necesario para cumplir con los fines descritos y con los plazos de retención exigidos por la legislación costarricense (mínimo 7 años). Solo compartimos datos estrictamente necesarios con guías certificados, autoridades públicas u operadores de pago.</p>
                </>
              )}

              {activeTab === 'escnna' && (
                <>
                  <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">Declaración ESCNNA</h3>
                  
                  <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl mb-6">
                    <h4 className="text-lg font-black text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> 
                      Contra Explotación Sexual de Menores
                    </h4>
                    <p className="text-neutral-300 mb-4 leading-relaxed">
                      En cumplimiento de la legislación costarricense, los lineamientos dlos convenios internacionales de protección a la infancia, declaramos públicamente:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-neutral-300 mb-4 font-bold">
                      <li>Rechazamos de forma absoluta toda forma de explotación sexual comercial de personas menores de edad, así como cualquier modalidad de trata de personas.</li>
                      <li>Nuestra empresa adopta políticas internas de prevención, capacitación y denuncia obligatoria ante cualquier indicio de conductas relacionadas con estos delitos.</li>
                      <li>Cualquier cliente, colaborador, guía o proveedor que sea detectado participando será denunciado inmediatamente ante el Organismo de Investigación Judicial (OIJ) y el Ministerio Público.</li>
                    </ul>
                    <p className="text-neutral-300 text-sm italic">
                      La protección de los derechos de la infancia y la dignidad de las personas es una prioridad irrenunciable de nuestra actividad turística.
                    </p>
                  </div>

                  <h4 className="text-lg font-bold text-orange-300 mt-6 mb-3">Licencias y Declaratorias Turísticas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10">
                      
                      <p className="text-lg font-black text-white">#1042</p>
                    </div>
                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Seguro Responsabilidad Civil</p>
                      <p className="text-lg font-black text-white">Activo y Vigente</p>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
