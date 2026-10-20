import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Language } from '../types';
import { Cookie, Check } from 'lucide-react';

interface CookiesBannerProps {
  language: Language;
}

/** CSS variable with the space the banner occupies at the bottom of the viewport (0 when hidden). */
export const COOKIE_BANNER_OFFSET_VAR = '--cookie-banner-h';

/**
 * Compact consent notice. It reserves its own height at the bottom of the page
 * (body padding + CSS variable) so it never covers a form's submit button or a
 * fixed call-to-action bar, which can offset itself with var(--cookie-banner-h).
 */
export const CookiesBanner: React.FC<CookiesBannerProps> = ({ language }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const es = language === 'es';

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const node = ref.current;
    if (!isVisible || !node) return;
    const previousPadding = body.style.paddingBottom;
    const update = () => {
      const offset = Math.max(0, Math.ceil(window.innerHeight - node.getBoundingClientRect().top));
      root.style.setProperty(COOKIE_BANNER_OFFSET_VAR, `${offset}px`);
      body.style.paddingBottom = `${offset}px`;
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty(COOKIE_BANNER_OFFSET_VAR);
      body.style.paddingBottom = previousPadding;
    };
  }, [isVisible]);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={es ? 'Aviso de cookies' : 'Cookie notice'}
      data-testid="cookies-banner"
      className="fixed bottom-2 left-2 right-2 z-[110] rounded-2xl border border-orange-500/30 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start gap-2.5">
        <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
        <p className="text-[11px] leading-snug text-stone-700">
          {es
            ? 'Usamos cookies esenciales y, si aceptas, de análisis.'
            : 'We use essential cookies and, if you accept, analytics cookies.'}{' '}
          <Link to="/privacy" className="font-semibold underline">{es ? 'Privacidad' : 'Privacy'}</Link>
        </p>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleReject}
          className="rounded-xl border border-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-700 transition-colors hover:bg-stone-100"
        >
          {es ? 'Rechazar' : 'Reject'}
        </button>
        <button
          type="button"
          onClick={handleAcceptAll}
          className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-orange-500"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {es ? 'Aceptar todas' : 'Accept all'}
        </button>
      </div>
    </div>
  );
};
