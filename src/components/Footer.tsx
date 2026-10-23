import React from 'react';
import { Link } from 'react-router-dom';
import { Language } from '../types';
import { whatsappInquiryUrl } from '../utils/directWhatsApp';
import { createT } from '../i18n';
import { Phone, MapPin, Mail, ShieldCheck, Heart, Globe, Sparkles, MessageCircle, Lock, CreditCard, ChevronRight } from 'lucide-react';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = createT(language);
  return (
    <footer className="bg-[#041711] text-emerald-100/80 border-t-4 border-emerald-500/40 mt-12">
      {/* Trust & Payment Bar */}
      <div className="bg-[#05140B] text-xs py-3 px-6 border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4 text-emerald-100/90">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-[11px] sm:text-xs">
              {t('footer.availabilityFinalPriceTerms')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-teal-300">
            <span>{t('footer.paymentOptionsConfirmedDuring')}</span>
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
                  {t('footer.experiencesAdventure')}
                </span>
              </div>
            </div>
            
            <p className="text-xs leading-relaxed text-stone-400">
              {t('footer.discoverExperiencesRequestQuote')}
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={whatsappInquiryUrl(t('footer.iWouldLikeHelp'), language)}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby="footer-whatsapp-hint"
                className="font-extrabold text-sm flex items-center gap-2 text-white hover:text-teal-300 transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                {t('footer.contactWhatsapp')}
              </a>
              <p id="footer-whatsapp-hint" className="text-xs text-stone-300">
                {t('footer.whatsappDraftHint')}
              </p>
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
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{t('footer.explore')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/tours" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.allTours')}
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.destinations')}
                </Link>
              </li>
              <li>
                <Link to="/ciudad" className="hover:text-amber-400 transition-colors flex items-center gap-2 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.digitalCityMasterplan')}
                </Link>
              </li>
              <li>
                <Link to="/participar" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.joinDigitalCity')}
                </Link>
              </li>
              <li>
                <Link to="/itinerary" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.aiItinerary')}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.travelBlog')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{t('footer.categories')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/tours?category=canopy" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.adventureZiplining')}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=wildlife" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.wildlife')}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=beaches" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.beaches')}
                </Link>
              </li>
              <li>
                <Link to="/tours?category=volcanoes" className="hover:text-amber-400 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:text-amber-400" />
                  {t('footer.volcanoes')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">{t('footer.trust')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase">{t('footer.secure')}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Heart className="w-5 h-5 text-rose-500" />
                <span className="text-[10px] font-bold uppercase">{t('footer.puraVida')}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Globe className="w-5 h-5 text-teal-400" />
                <span className="text-[10px] font-bold uppercase">{t('footer.global')}</span>
              </div>
              <div className="p-3 bg-stone-900/50 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase">{t('footer.premium')}</span>
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
              © {new Date().getFullYear()} Costa Rica Tours. {t('footer.allRightsReserved')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <Link to="/terms" className="hover:underline text-teal-400 hover:text-white transition-colors">{t('footer.termsConditions')}</Link>
            <span className="text-stone-800" aria-hidden="true">|</span>
            <Link to="/cancellation" className="hover:underline text-teal-400 hover:text-white transition-colors">{t('footer.cancellationPolicy')}</Link>
            <span className="text-stone-800" aria-hidden="true">|</span>
            <Link to="/privacy" className="hover:underline text-teal-400 hover:text-white transition-colors">{t('footer.privacyData')}</Link>
            <span className="text-stone-800" aria-hidden="true">|</span>
            <Link to="/sinac-escnna" className="hover:underline text-teal-400 hover:text-white transition-colors">{t('footer.sinacRulesEscnna')}</Link>

          </div>
        </div>
      </div>
    </footer>
  );
};
