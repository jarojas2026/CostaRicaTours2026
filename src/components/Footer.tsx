import React from 'react';
import { Link } from 'react-router-dom';
import { Language } from '../types';
import { Phone, MapPin, Mail, ShieldCheck, Heart, Globe, Sparkles, MessageCircle, Lock, CreditCard, ChevronRight } from 'lucide-react';

interface FooterProps {
  language: Language;
  onOpenLegal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onOpenLegal }) => {
  const isEs = language === 'es';
  return (
    <footer className="bg-[#041711] text-emerald-100/80 border-t-4 border-emerald-500/40 mt-12">
      {/* Trust & Payment Bar */}
      <div className="bg-[#05140B] text-xs py-3 px-6 border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4 text-emerald-100/90">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-[11px] sm:text-xs">
              {language === 'es' ? '🔒 Pago 100% Seguro con Encriptación SSL de 256-bits • Garantía de Reembolso hasta 48h antes' : '🔒 100% Secure Payment with 256-bit SSL • Refund Guarantee up to 48h before'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-teal-300">
            <span>{language === 'es' ? 'Métodos de Pago Aceptados:' : 'Accepted Payments:'}</span>
            <span className="bg-[#0a2c1e] px-2 py-0.5 rounded border border-emerald-500/40 text-stone-100">VISA</span>
            <span className="bg-[#0a2c1e] px-2 py-0.5 rounded border border-emerald-500/40 text-stone-100">Mastercard</span>
            <span className="bg-[#0a2c1e] px-2 py-0.5 rounded border border-emerald-500/40 text-stone-100">PayPal</span>
            <span className="bg-[#0a2c1e] px-2 py-0.5 rounded border border-emerald-500/40 text-stone-100">Apple Pay</span>
            <span className="bg-[#0a2c1e] px-2 py-0.5 rounded border border-emerald-500/40 text-amber-400">SINPE Móvil</span>
          </div>
        </div>
      </div>

      {/* Top Main Footer Row */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & Contacts */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-teal-400">
                🇨🇷
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-tighter block leading-none text-white">
                  Costa Rica <span className="text-orange-400">Tours</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                  {isEs ? 'Tours Oficiales & Aventura' : 'Official Tours & Adventure'}
                </span>
              </div>
            </div>
            
            <p className="text-xs leading-relaxed text-stone-400">
              {isEs 
                ? 'Plataforma líder en experiencias ecoturísticas sostenibles en Costa Rica. Conectamos viajeros con los mejores operadores locales certificados.' 
                : 'Leading platform for sustainable ecotourism experiences in Costa Rica. We connect travelers with the best certified local operators.'}
            </p>

            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/50687959148"
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-sm flex items-center gap-2 text-white hover:text-teal-300 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                +506 8795-9148
              </a>
              <a
                href="mailto:jarojas800@gmail.com"
                className="font-extrabold text-xs flex items-center gap-2 text-white hover:text-teal-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-teal-400" />
                jarojas800@gmail.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{isEs ? 'Explorar' : 'Explore'}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/tours" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Todos los Tours' : 'All Tours'}
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Destinos' : 'Destinations'}
                </Link>
              </li>
              <li>
                <Link to="/itinerary" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Itinerario IA' : 'AI Itinerary'}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Blog de Viajes' : 'Travel Blog'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{isEs ? 'Categorías' : 'Categories'}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/tours?category=adventure" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Aventura' : 'Adventure'}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=wildlife" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Vida Silvestre' : 'Wildlife'}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=beaches" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Playas' : 'Beaches'}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=volcanoes" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {isEs ? 'Volcanes' : 'Volcanoes'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{isEs ? 'Confianza' : 'Trust'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase">{isEs ? 'Seguro' : 'Secure'}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Heart className="w-5 h-5 text-rose-500" />
                <span className="text-[10px] font-bold uppercase">{isEs ? 'Pura Vida' : 'Pura Vida'}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Globe className="w-5 h-5 text-teal-400" />
                <span className="text-[10px] font-bold uppercase">{isEs ? 'Global' : 'Global'}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase">{isEs ? 'Premium' : 'Premium'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-bar */}
      <div className="bg-[#020e0a] text-emerald-200/70 text-xs py-4 px-6 border-t border-emerald-500/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>
              © {new Date().getFullYear()} Costa Rica Tours (costaricatours.es). Todos los derechos reservados.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <button onClick={onOpenLegal} className="hover:underline text-teal-400 hover:text-white transition-colors">{language === 'es' ? 'Términos y Condiciones' : 'Terms & Conditions'}</button>
            <span className="text-stone-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-teal-400 hover:text-white transition-colors">{language === 'es' ? 'Política de Cancelación' : 'Cancellation Policy'}</button>
            <span className="text-stone-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-teal-400 hover:text-white transition-colors">{language === 'es' ? 'Privacidad y Datos (MEIC)' : 'Privacy (MEIC)'}</button>
            <span className="text-stone-800">|</span>
            <button onClick={onOpenLegal} className="hover:underline text-teal-400 hover:text-white transition-colors">Normas SINAC & ESCNNA</button>
            <span className="text-stone-800">|</span>
            
          </div>
        </div>
      </div>
    </footer>
  );
};

