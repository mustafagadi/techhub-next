'use client';

// Tiny dependency-free SVG/DOM charts for the dashboards. The project deliberately has no chart
// library; these cover the four shapes the dashboards need. Numbers render LTR inside RTL layouts.

const nf = new Intl.NumberFormat('en-US');

// Area chart for a daily {date, calls, errors} series. Fills the container width.
export function AreaChart({ points, height = 170 }) {
  if (!points?.length) return null;
  const W = 640, H = height, padX = 6, padTop = 14, padBottom = 22;
  const max = Math.max(1, ...points.map((p) => p.calls));
  const innerW = W - padX * 2, innerH = H - padTop - padBottom;
  const x = (i) => padX + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v) => padTop + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.calls).toFixed(1)}`).join(' ');
  const area = `${padX},${padTop + innerH} ${line} ${padX + innerW},${padTop + innerH}`;
  const fmtDay = (d) => {
    const dt = new Date(d);
    return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
  };
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }} role="img">
      {/* horizontal guides at 0 / 50% / 100% of the max */}
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={padX} x2={W - padX} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth="1" strokeDasharray={f === 0 ? '' : '3 4'} />
      ))}
      <text x={padX + 2} y={y(max) - 4} fontSize="10" fill="var(--muted)">{nf.format(max)}</text>
      <polygon points={area} fill="var(--green)" opacity="0.12" />
      <polyline points={line} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.calls)} r="7" fill="transparent">
          <title>{`${fmtDay(p.date)}: ${nf.format(p.calls)}${p.errors ? ` (${nf.format(p.errors)} err)` : ''}`}</title>
        </circle>
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
          {fmtDay(points[i].date)}
        </text>
      ))}
    </svg>
  );
}

// Horizontal bar list for "top N" rankings.
export function BarList({ items }) {
  if (!items?.length) return null;
  const max = Math.max(1, ...items.map((i) => i.calls));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => (
        <div key={item.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.85rem', marginBottom: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{nf.format(item.calls)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--cloud)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item.calls / max) * 100}%`, background: 'var(--steel)', borderRadius: 100 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Signup funnel: full-width bars shrinking with each stage.
export function FunnelBars({ stages }) {
  if (!stages?.length) return null;
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stages.map((s) => (
        <div key={s.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.85rem', marginBottom: 3 }}>
            <span>{s.label}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{nf.format(s.value)}</span>
          </div>
          <div style={{ height: 10, background: 'var(--cloud)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(2, (s.value / max) * 100)}%`, background: 'var(--copper)', borderRadius: 100 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact sparkline for the partner app cards.
export function Sparkline({ points, width = 120, height = 26 }) {
  if (!points?.length) return null;
  const max = Math.max(1, ...points.map((p) => p.calls));
  const x = (i) => (points.length === 1 ? width / 2 : (i * width) / (points.length - 1));
  const y = (v) => 2 + (height - 4) - (v / max) * (height - 4);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.calls).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height, display: 'block', direction: 'ltr' }} aria-hidden="true">
      <polyline points={line} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}
