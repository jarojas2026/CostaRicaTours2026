import React from 'react';

/**
 * Gráficos SVG propios del portal de proveedores (#321), sin dependencias.
 * Solo dibujan valores reales recibidos del servidor; un valor null se
 * muestra como "no disponible", nunca como 0.
 */

export type ChartDatum = { label: string; value: number | null; hint?: string };

const fmtUSD = (n: number) => '$' + n.toLocaleString('es-CR', { maximumFractionDigits: 2 });

export function MonthlyBarChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 12 };
  const known = data.map((d) => d.value).filter((v): v is number => typeof v === 'number');
  const max = Math.max(1, ...known);
  const slot = (width - pad.left - pad.right) / Math.max(1, data.length);
  const barW = Math.min(48, slot * 0.6);
  const plotH = height - pad.top - pad.bottom;
  return (
    <figure className="w-full">
      <figcaption className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{title}</figcaption>
      {data.length === 0 ? <p className="text-sm text-slate-400">Sin ventas con pago verificado en el período.</p> : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="w-full h-auto">
          <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#334155" />
          {data.map((d, i) => {
            const x = pad.left + slot * i + (slot - barW) / 2;
            const h = d.value === null ? 0 : (d.value / max) * plotH;
            const y = height - pad.bottom - h;
            return (
              <g key={d.label}>
                <title>{d.label + ': ' + (d.value === null ? 'no disponible' : fmtUSD(d.value)) + (d.hint ? ' · ' + d.hint : '')}</title>
                {d.value === null
                  ? <text x={x + barW / 2} y={height - pad.bottom - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">n/d</text>
                  : <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4" fill="#10b981" />}
                {d.value !== null && <text x={x + barW / 2} y={Math.max(y - 4, 10)} textAnchor="middle" fontSize="10" fill="#e2e8f0">{fmtUSD(d.value)}</text>}
                <text x={x + barW / 2} y={height - pad.bottom + 16} textAnchor="middle" fontSize="11" fill="#94a3b8">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

export function HorizontalBarChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const width = 640;
  const rowH = 28;
  const labelW = 220;
  const height = Math.max(rowH, data.length * rowH) + 8;
  const known = data.map((d) => d.value).filter((v): v is number => typeof v === 'number');
  const max = Math.max(1, ...known);
  const plotW = width - labelW - 90;
  return (
    <figure className="w-full">
      <figcaption className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{title}</figcaption>
      {data.length === 0 ? <p className="text-sm text-slate-400">Sin ventas con pago verificado en el período.</p> : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="w-full h-auto">
          {data.map((d, i) => {
            const y = 4 + i * rowH;
            const w = d.value === null ? 0 : (d.value / max) * plotW;
            const label = d.label.length > 30 ? d.label.slice(0, 29) + '…' : d.label;
            return (
              <g key={d.label + i}>
                <title>{d.label + ': ' + (d.value === null ? 'no disponible' : fmtUSD(d.value)) + (d.hint ? ' · ' + d.hint : '')}</title>
                <text x={0} y={y + 17} fontSize="12" fill="#cbd5e1">{label}</text>
                {d.value !== null && <rect x={labelW} y={y + 5} width={Math.max(w, 1)} height={rowH - 12} rx="4" fill="#f59e0b" />}
                <text x={labelW + w + 6} y={y + 17} fontSize="11" fill="#e2e8f0">{d.value === null ? 'n/d' : fmtUSD(d.value)}</text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}
