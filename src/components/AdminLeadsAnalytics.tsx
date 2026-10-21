import React from 'react';

/** Visualización de la sección `leads` del snapshot del Centro de Control (SVG simple, sin librerías). */
type Count = { key: string; label?: string; count: number };
type Envelope = { value: any | null; state: 'measured' | 'partial' | 'unavailable'; source: string; observedAt: string; note?: string } | null | undefined;

const box = 'rounded-2xl border border-white/10 bg-[#071d15] p-5';
const fmt = (v: unknown, suffix = '') => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString() + suffix : '—');
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function LineChart({ points, label }: { points: { date: string; count: number }[]; label: string }) {
  const w = 600, h = 160, pad = 24;
  const max = Math.max(1, ...points.map(p => p.count));
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad - (v * (h - 2 * pad)) / max;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="w-full h-40">
    <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#ffffff22" />
    <path d={d} fill="none" stroke="#fbbf24" strokeWidth={2.5} />
    {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.count)} r={2.5} fill="#fbbf24"><title>{`${p.date}: ${p.count}`}</title></circle>)}
    <text x={pad} y={14} fill="#a8a29e" fontSize={12}>{`máx ${max}`}</text>
    {points.length > 0 && <><text x={pad} y={h - 6} fill="#a8a29e" fontSize={11}>{points[0].date}</text><text x={w - pad} y={h - 6} fill="#a8a29e" fontSize={11} textAnchor="end">{points[points.length - 1].date}</text></>}
  </svg>;
}

function Bars({ rows, label }: { rows: Count[]; label: string }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  if (!rows.length) return <p className="text-sm text-stone-400">—</p>;
  return <ul aria-label={label} className="space-y-2">
    {rows.map(r => <li key={r.key} className="text-sm text-stone-200">
      <div className="flex justify-between gap-2"><span className="truncate">{r.label || r.key.replace(/_/g, ' ')}</span><span className="font-bold">{r.count}</span></div>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="mt-1 h-2 w-full"><rect width="100" height="6" fill="#ffffff14" rx="3" /><rect width={(r.count / max) * 100} height="6" fill="#34d399" rx="3" /></svg>
    </li>)}
  </ul>;
}

function Heatmap({ values, es }: { values: number[][]; es: boolean }) {
  const max = Math.max(1, ...values.flat());
  const cell = 18, left = 34, top = 16;
  const days = es ? DAYS_ES : DAYS_EN;
  return <svg viewBox={`0 0 ${left + 24 * cell} ${top + 7 * cell}`} role="img" aria-label={es ? 'Mapa de calor día por hora' : 'Day by hour heatmap'} className="w-full">
    {[0, 6, 12, 18].map(hr => <text key={hr} x={left + hr * cell} y={11} fill="#a8a29e" fontSize={10}>{hr}h</text>)}
    {values.map((row, d) => <g key={d}>
      <text x={0} y={top + d * cell + 13} fill="#a8a29e" fontSize={10}>{days[d]}</text>
      {row.map((v, hr) => <rect key={hr} x={left + hr * cell} y={top + d * cell} width={cell - 2} height={cell - 2} rx={3} fill={v ? `rgba(251,191,36,${0.15 + 0.85 * (v / max)})` : '#ffffff0d'}><title>{`${days[d]} ${hr}:00 — ${v}`}</title></rect>)}
    </g>)}
  </svg>;
}

export function AdminLeadsAnalytics({ envelope, es }: { envelope: Envelope; es: boolean }) {
  const m = envelope?.value;
  if (!envelope || envelope.state === 'unavailable' || !m) {
    return <div className={box}><p className="text-base text-stone-300">{es ? 'Métricas de leads no disponibles.' : 'Lead metrics unavailable.'} {envelope?.note || ''}</p></div>;
  }
  const funnelMax = Math.max(1, ...m.funnel.map((f: any) => f.reached));
  return <div className="space-y-4">
    <p className="text-sm text-stone-400">{es ? 'Fuente' : 'Source'}: {envelope.source} · {envelope.state === 'partial' ? (es ? 'parcial' : 'partial') : (es ? 'medido' : 'measured')} · {new Date(envelope.observedAt).toLocaleString(es ? 'es-CR' : 'en-US')} · {es ? `ventana ${m.window.days} días` : `${m.window.days}-day window`}{envelope.note ? ' · ' + envelope.note : ''}</p>
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      {[
        [es ? 'Hoy' : 'Today', fmt(m.kpis.today)], ['7 d', fmt(m.kpis.last7d)], ['30 d', fmt(m.kpis.last30d)],
        [es ? '1.ª respuesta (mediana)' : '1st reply (median)', fmt(m.firstResponse.medianHours, ' h')],
        [es ? '1.ª respuesta (p90)' : '1st reply (p90)', fmt(m.firstResponse.p90Hours, ' h')],
        [es ? 'Sin respuesta >24 h' : 'Unanswered >24 h', fmt(m.unanswered24h)],
        [es ? 'Conversión cotizado→confirmado' : 'Quoted→confirmed', fmt(m.conversion.rate, '%')],
        [es ? 'Con consentimiento' : 'With consent', fmt(m.consent.rate, '%')],
      ].map(([k, v]) => <div key={k} className="rounded-xl bg-black/25 p-3"><div className="text-2xl font-black text-white">{v}</div><div className="text-sm text-stone-400">{k}</div></div>)}
    </div>
    <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Leads por día (30 d, hora CR)' : 'Leads per day (30 d, CR time)'}</h3><LineChart points={m.perDay} label={es ? 'Leads por día' : 'Leads per day'} /></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Embudo (alcanzado)' : 'Funnel (reached)'}</h3>
        <ul className="mt-3 space-y-2">{m.funnel.map((f: any) => <li key={f.status} className="text-sm text-stone-200">
          <div className="flex justify-between"><span>{f.status.replace(/_/g, ' ')}</span><span className="font-bold">{f.reached} <span className="font-normal text-stone-400">({es ? 'ahora' : 'now'} {f.current})</span></span></div>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="mt-1 h-3 w-full"><rect width="100" height="8" fill="#ffffff14" rx="3" /><rect width={(f.reached / funnelMax) * 100} height="8" fill="#fbbf24" rx="3" /></svg>
        </li>)}</ul></div>
      <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Por región' : 'By region'}</h3><div className="mt-3"><Bars rows={m.byRegion} label={es ? 'Por región' : 'By region'} /></div></div>
      <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Por tour' : 'By tour'}</h3><div className="mt-3"><Bars rows={m.byTour} label={es ? 'Por tour' : 'By tour'} /></div></div>
      <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Idioma y origen' : 'Language and source'}</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><Bars rows={m.byLanguage} label={es ? 'Idioma' : 'Language'} /><Bars rows={m.bySource} label={es ? 'Origen' : 'Source'} /></div>
        <p className="mt-3 text-sm text-stone-400">{es ? 'País: no se captura en el lead (N/D).' : 'Country: not captured on leads (N/A).'}</p></div>
    </div>
    <div className={box}><h3 className="text-lg font-black text-white">{es ? 'Mapa de calor (día × hora, CR)' : 'Heatmap (day × hour, CR)'}</h3>{m.heatmap ? <Heatmap values={m.heatmap.values} es={es} /> : <p className="mt-2 text-sm text-stone-400">—</p>}</div>
  </div>;
}
