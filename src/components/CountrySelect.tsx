import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { buildCountryOptions, filterCountryOptions, flagEmoji, countryName } from '../utils/countries';

type Props = {
  /** ISO 3166-1 alpha-2 code, e.g. "CR". */
  value: string;
  onChange: (code: string) => void;
  language: string;
  label: string;
  disabled?: boolean;
  required?: boolean;
  /** Hidden input name so native form posts still carry the ISO code. */
  name?: string;
  className?: string;
};

/**
 * Accessible, searchable country combobox (WAI-ARIA combobox + listbox pattern).
 * Shows flag + localized name, stores only the ISO alpha-2 code.
 */
export function CountrySelect({ value, onChange, language, label, disabled, required, name, className = '' }: Props) {
  const es = language === 'es';
  const baseId = useId();
  const listId = `${baseId}-list`;
  const options = useMemo(() => buildCountryOptions(language), [language]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => filterCountryOptions(options, query), [options, query]);
  const selectedName = value ? countryName(value, language) : '';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    const idx = options.findIndex(o => o.code === value);
    setActive(idx >= 0 ? idx : 0);
  };
  const close = () => { setOpen(false); setQuery(''); };
  const choose = (code: string) => { onChange(code); close(); inputRef.current?.focus(); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); openList(); return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(filtered.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) choose(o.code); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { close(); }
  };

  const firstOtherIndex = query ? -1 : filtered.findIndex(o => !o.common);
  const activeOption = open ? filtered[active] : undefined;

  return <div ref={rootRef} className={`relative ${className}`}>
    <label htmlFor={`${baseId}-input`} className="block text-stone-200">{label}</label>
    <div className={`mt-1 flex items-center gap-2 rounded-xl border bg-[#092b20] px-3 text-white transition-colors ${open ? 'border-amber-300 ring-2 ring-amber-300/40' : 'border-white/20'} ${disabled ? 'opacity-60' : ''}`}>
      <span aria-hidden="true" className="text-lg leading-none">{open ? <Search size={16} className="text-amber-300"/> : flagEmoji(value)}</span>
      <input
        ref={inputRef}
        id={`${baseId}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption ? `${baseId}-opt-${activeOption.code}` : undefined}
        aria-required={required || undefined}
        data-country-code={value}
        autoComplete="off"
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent py-3 text-base md:text-sm text-white placeholder:text-stone-400 outline-none"
        placeholder={open ? (es ? 'Escribe para buscar…' : 'Type to search…') : (es ? 'Selecciona un país' : 'Select a country')}
        value={open ? query : selectedName}
        onChange={e => { setQuery(e.target.value); setActive(0); if (!open) setOpen(true); }}
        onFocus={() => { if (!open) openList(); }}
        onClick={() => { if (!open) openList(); }}
        onKeyDown={onKeyDown}
      />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={es ? 'Mostrar países' : 'Show countries'}
        onClick={() => (open ? close() : (openList(), inputRef.current?.focus()))} className="p-1 text-amber-300">
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>
    </div>
    {name && <input type="hidden" name={name} value={value}/>}
    {open && <ul ref={listRef} id={listId} role="listbox" aria-label={label}
      className="absolute z-50 mt-1 max-h-64 w-full overflow-auto overscroll-contain rounded-xl border border-emerald-500/30 bg-[#061d14] py-1 shadow-xl shadow-black/40">
      {filtered.length === 0 && <li className="px-3 py-3 text-stone-400" role="presentation">{es ? 'Sin resultados' : 'No results'}</li>}
      {filtered.map((o, i) => <React.Fragment key={o.code}>
        {i === 0 && !query && o.common && <li role="presentation" className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-amber-300/80">{es ? 'Frecuentes' : 'Common'}</li>}
        {i === firstOtherIndex && <li role="presentation" className="mt-1 border-t border-white/10 px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-stone-400">{es ? 'Todos los países' : 'All countries'}</li>}
        <li id={`${baseId}-opt-${o.code}`} role="option" aria-selected={o.code === value} data-index={i} data-code={o.code}
          onMouseDown={e => e.preventDefault()} onClick={() => choose(o.code)} onMouseMove={() => setActive(i)}
          className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm ${i === active ? 'bg-emerald-700/40 text-white' : 'text-stone-200'} ${o.code === value ? 'font-bold text-amber-200' : ''}`}>
          <span aria-hidden="true" className="text-lg leading-none">{o.flag}</span>
          <span className="flex-1 truncate">{o.name}</span>
          <span className="text-[10px] font-mono text-stone-400">{o.code}</span>
        </li>
      </React.Fragment>)}
    </ul>}
  </div>;
}
