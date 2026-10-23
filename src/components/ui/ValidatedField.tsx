import React from 'react';

interface ValidatedFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** Campo unificado: label + required + hint + error inline (elimina inconsistencia F3). Aditivo. */
export function ValidatedField({ label, htmlFor, error, required, hint, children, className = '' }: ValidatedFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-bold text-stone-700 flex items-center gap-1">{label}{required && <span className="text-red-500" aria-hidden>*</span>}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-stone-500">{hint}</p>}
      {error && <p role="alert" className="text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  );
}
