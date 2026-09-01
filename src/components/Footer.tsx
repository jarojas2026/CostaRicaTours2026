import React from 'react';
import { Language } from '../types';
import { Phone, MapPin, Mail, ShieldCheck, Heart, Globe, Sparkles, MessageCircle, Lock, CreditCard } from 'lucide-react';

interface FooterProps {
  language: Language;
  onOpenLegal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onOpenLegal }) => {
  return (
    <footer className="bg-[#0A2314] text-neutral-300 border-t-4 border-emerald-500/40 mt-12">
      {/* Trust & Payment Bar */}
      <div className="bg-[#05140B] text-xs py-3 px-6 border-b border-emerald-900/40">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4 text-emerald-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-[11px] sm:text-xs">
              {language === 'es' ? '🔒 Pago 100% Seguro con Encriptación SSL de 256-bits • Garantía de Reembolso hasta 48h antes' : '🔒 100% Secure Payment with 256-bit SSL • Refund Guarantee up to 48h before'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span>{language === 'es' ? 'Métodos de Pago Aceptados:' : 'Accepted Payments:'}</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-white">VISA</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-white">Mastercard</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-white">PayPal</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-white">Apple Pay</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 text-amber-300">SINPE Móvil</span>
          </div>
        </div>
      </div>

      {/* Top Main Footer Row */}
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Brand & Contacts */}
        <div className="flex flex-wrap items-center gap-8 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-emerald-400">
              🇨🇷
            </div>
            <div>
              <span className="text-xl font-black uppercase tracking-tighter block leading-none text-white">
                Costa Rica <span className="text-amber-400">Tours</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                {language === 'es' ? '🇨🇷 costaricatours.es • Tours Oficiales & Aventura Pura Vida' : '🇨🇷 costaricatours.es • Official Tours & Pura Vida Adventures'}
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-12 bg-emerald-800/60" />

          <div className="flex flex-col text-xs">
            <span className="text-[10px] uppercase font-black text-emerald-400">
              {language === 'es' ? 'Atención & WhatsApp 24/7' : 'WhatsApp Support 24/7'}
            </span>
            <a
              href="https://wa.me/50687959148?text=Hola,%20quisiera%20consultar%20sobre%20tours%20en%20Costa%20Rica"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-sm flex items-center gap-1.5 text-white hover:text-emerald-300 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              +506 8795-9148
            </a>
          </div>

          <div className="flex flex-col text-xs">
            <span className="text-[10px] uppercase font-black text-emerald-400">
              {language === 'es' ? 'Llamadas de Emergencia 24/7' : '24/7 Emergency Calls'}
            </span>
            <a
              href="tel:+50687959148"
              className="font-extrabold text-xs flex items-center gap-1 text-white hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              +506 8795-9148
            </a>
          </div>

          <div className="flex flex-col text-xs">
            <span className="text-[10px] uppercase font-black text-emerald-400">
              {language === 'es' ? 'Correo Electrónico' : 'Email Support'}
            </span>
            <a
              href="mailto:info@costaricatours.es"
              className="font-extrabold text-xs flex items-center gap-1 text-white hover:text-emerald-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              info@costaricatours.es
            </a>
          </div>

          <div className="flex flex-col text-xs">
            <span className="text-[10px] uppercase font-black text-emerald-400">
              {language === 'es' ? 'Oficina Principal' : 'Main Office'}
            </span>
            <span className="font-extrabold flex items-center gap-1 text-neutral-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              San José, Paseo Colón, Centro Corporativo Costa Rica Tours
            </span>
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-admin-dashboard'))}
              className="mt-2 text-[10px] text-emerald-900 hover:text-emerald-500 transition-colors text-left"
              title="Admin Access"
            >
              • Backend Ops
            </button>
          </div>
        </div>

        {/* Social Proof & Badges */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-sm font-black italic uppercase text-white">
              ¿Listo para la Aventura?
            </span>
            <span className="text-[10px] font-bold text-emerald-300">
              {language === 'es' ? '+12,000 viajeros felices desde 2018' : '+12,000 happy travelers since 2018'}
            </span>
          </div>

          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-950 text-white text-xs font-bold flex items-center justify-center">
              🦜
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-900 text-white text-xs font-bold flex items-center justify-center">
              🌺
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">
              🐒
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
              +12k
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Sub-bar */}
      <div className="bg-[#05140B] text-neutral-400 text-xs py-4 px-6 border-t border-emerald-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              © {new Date().getFullYear()} Costa Rica Tours (costaricatours.es). Todos los derechos reservados.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <button onClick={onOpenLegal} className="hover:underline text-emerald-400 hover:text-white transition-colors">{language === 'es' ? 'Términos y Condiciones' : 'Terms & Conditions'}</button>
            <span className="text-emerald-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-emerald-400 hover:text-white transition-colors">{language === 'es' ? 'Política de Cancelación' : 'Cancellation Policy'}</button>
            <span className="text-emerald-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-emerald-400 hover:text-white transition-colors">{language === 'es' ? 'Privacidad y Datos (MEIC)' : 'Privacy (MEIC)'}</button>
            <span className="text-emerald-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-emerald-400 hover:text-white transition-colors">Normas SINAC & ESCNNA</button>
            <span className="text-emerald-800">|</span>
            
          </div>
        </div>
      </div>
    </footer>
  );
};

