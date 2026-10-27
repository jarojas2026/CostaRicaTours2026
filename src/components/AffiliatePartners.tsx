import React from 'react';
import type { Language } from '../types';
import { createT } from '../i18n';
import { AFFILIATE_LINK_REL, AFFILIATE_PARTNERS } from '../config/affiliatePartners';

/** Sección discreta de socios externos (enlaces de afiliado, sin scripts). */
export const AffiliatePartners: React.FC<{ language: Language }> = ({ language }) => {
  const t = createT(language);
  return (
    <section aria-labelledby="affiliate-partners-title" data-testid="affiliate-partners" className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
      <h2 id="affiliate-partners-title" className="text-lg font-semibold">{t('partners.title')}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AFFILIATE_PARTNERS.map((partner) => (
          <li key={partner.id}>
            <a href={partner.url} target="_blank" rel={AFFILIATE_LINK_REL} className="underline underline-offset-2 hover:opacity-80">
              {partner.name}
            </a>
            <span className="opacity-70"> · {t(partner.descriptionKey)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs opacity-70" data-testid="affiliate-disclosure">{t('partners.disclosure')}</p>
    </section>
  );
};
