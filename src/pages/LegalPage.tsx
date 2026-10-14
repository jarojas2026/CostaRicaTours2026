import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, ExternalLink, Mail, Phone } from 'lucide-react';
import type { Language } from '../types';
import {
  LEGAL_CONTACT,
  LEGAL_DRAFT_NOTICE,
  LEGAL_LAST_UPDATED,
  LEGAL_PAGES,
  LEGAL_PAGE_ORDER,
  type LegalPageId,
} from '../data/legalPages';

interface LegalPageProps {
  pageId: LegalPageId;
  language: Language;
}

export const LegalPage: React.FC<LegalPageProps> = ({ pageId, language }) => {
  const lang = language === 'es' ? 'es' : 'en';
  const page = LEGAL_PAGES[pageId];

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:py-14 text-stone-200" aria-labelledby="legal-page-title">
      <nav aria-label={lang === 'es' ? 'Páginas legales' : 'Legal pages'} className="mb-8 flex flex-wrap gap-2 text-xs font-bold">
        {LEGAL_PAGE_ORDER.map(id => (
          <Link
            key={id}
            to={LEGAL_PAGES[id].path}
            aria-current={id === pageId ? 'page' : undefined}
            className={`rounded-full border px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
              id === pageId
                ? 'border-amber-400 bg-amber-400 text-stone-950'
                : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/50'
            }`}
          >
            {LEGAL_PAGES[id].title[lang]}
          </Link>
        ))}
      </nav>

      <header className="space-y-3 border-b border-emerald-500/20 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {lang === 'es' ? 'Información legal' : 'Legal information'}
        </div>
        <h1 id="legal-page-title" className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {page.title[lang]}
        </h1>
        <p className="text-sm text-stone-400">{LEGAL_LAST_UPDATED[lang]}</p>
        <div role="note" className="flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{LEGAL_DRAFT_NOTICE[lang]}</span>
        </div>
        <p className="text-base leading-relaxed text-stone-300">{page.intro[lang]}</p>
      </header>

      <div className="mt-8 space-y-8">
        {page.sections.map(section => (
          <section key={section.heading.es} className="space-y-3">
            <h2 className="text-xl font-black text-white">{section.heading[lang]}</h2>
            {section.paragraphs[lang].map(paragraph => (
              <p key={paragraph} className="leading-relaxed text-stone-300">{paragraph}</p>
            ))}
            {section.links && (
              <ul className="flex flex-wrap gap-3 pt-1">
                {section.links.map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300 underline underline-offset-2 hover:text-amber-300"
                    >
                      {link.label[lang]}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-10 flex flex-wrap gap-4 border-t border-emerald-500/20 pt-6 text-sm">
        <a href={`mailto:${LEGAL_CONTACT.email}`} className="inline-flex items-center gap-2 font-bold text-emerald-300 hover:text-amber-300">
          <Mail className="h-4 w-4" aria-hidden="true" /> {LEGAL_CONTACT.email}
        </a>
        <a href={LEGAL_CONTACT.phoneHref} className="inline-flex items-center gap-2 font-bold text-emerald-300 hover:text-amber-300">
          <Phone className="h-4 w-4" aria-hidden="true" /> {LEGAL_CONTACT.phoneDisplay}
        </a>
      </footer>
    </article>
  );
};

export default LegalPage;
