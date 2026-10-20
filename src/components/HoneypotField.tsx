import React from 'react';
import { HONEYPOT_FIELD } from '../../shared/formAbuse';

/**
 * Campo trampa invisible para personas (fuera de pantalla, sin foco con Tab,
 * oculto a lectores de pantalla). Los bots que llenan todo lo completan y el
 * servidor descarta el envío.
 */
export const HoneypotField: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
    <label>
      Website
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  </div>
);
