import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Only one support panel may obscure the page at a time.
export function useSupportPanel(id: string, open: boolean, setOpen: (open: boolean) => void) {
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname, setOpen]);
  useEffect(() => {
    const onPanel = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('support-panel-open', onPanel);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('support-panel-open', onPanel);
      window.removeEventListener('keydown', onKey);
    };
  }, [id, setOpen]);
  useEffect(() => {
    if (open) window.dispatchEvent(new CustomEvent('support-panel-open', { detail: id }));
  }, [id, open]);
}
