import { useState, useEffect, useRef, useCallback } from "react";

// ─── Pastel/Muted Color Palette ───────────────────────────────────────────────
const C = {
  bg: "#18191A",
  surface: "#212223",
  surfaceHigh: "#2A2B2C",
  border: "#333435",
  borderHi: "#484A4B",
  cyan: "#7DD8DC",
  cyanDim: "#5ABEC3",
  cyanGlow: "rgba(125,216,220,0.12)",
  cyanGlow2: "rgba(125,216,220,0.06)",
  textPrimary: "#D8DADB",
  textMid: "#8C9092",
  textDim: "#555759",
  ok: "#6EC89A",
  warn: "#D4A85A",
  danger: "#C96A6A",
  amber: "#C9A86A",
  amberGlow: "rgba(201,168,106,0.12)",
};

// ─── Simulated Telemetry ──────────────────────────────────────────────────────
const genTelemetry = (prev) => {
  const p = prev || {};
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const drift = (base, prev, lo, hi, noise) =>
    clamp(+((prev ?? base) + (Math.random() - 0.5) * noise).toFixed(2), lo, hi);
  return {
    supply_air_temp_c: drift(16.5, p.supply_air_temp_c, 12, 22, 0.4),
    return_air_temp_c: drift(24.0, p.return_air_temp_c, 20, 28, 0.3),
    supply_air_setpoint_c: p.supply_air_setpoint_c ?? 16,
    chw_temp_in_c: drift(7.0, p.chw_temp_in_c, 5, 10, 0.15),
    chw_temp_out_c: drift(12.0, p.chw_temp_out_c, 9, 16, 0.15),
    chw_delta_t_c: drift(5.0, p.chw_delta_t_c, 3, 8, 0.1),
    vfd_speed_pct: drift(72, p.vfd_speed_pct, 20, 100, 1.5),
    vfd_setpoint_pct: p.vfd_setpoint_pct ?? 72,
    valve_position_pct: drift(45, p.valve_position_pct, 0, 100, 2),
    filter_dp_pa: drift(120, p.filter_dp_pa, 50, 350, 1),
    duct_pressure_pa: drift(350, p.duct_pressure_pa, 100, 500, 4),
    co2_ppm: Math.round(drift(650, p.co2_ppm, 380, 1100, 5)),
    uptime_ms: (p.uptime_ms ?? 0) + 1800,
    mode: p.mode ?? "auto",
    device: "opta-ahu01",
  };
};

const TOPIC_POOL = [
  { topic: "uns/site01/hvac/ahu01/telemetry", type: "telemetry" },
  { topic: "uns/site01/hvac/ahu01/status/health", type: "status" },
  { topic: "uns/site01/hvac/ahu01/command/setpoint", type: "command" },
  { topic: "uns/site01/hvac/ahu01/telemetry", type: "telemetry" },
  { topic: "uns/site01/hvac/ahu01/telemetry", type: "telemetry" },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${C.bg};
    font-family: 'IBM Plex Sans', sans-serif;
    color: ${C.textPrimary};
    min-height: 100vh;
    overflow: hidden;
  }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes numTick {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .page-enter { animation: fadeUp 0.35s ease both; }
  .num-tick   { animation: numTick 0.25s ease both; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 6px;
    cursor: pointer; border: 1px solid transparent;
    transition: background 0.18s, border-color 0.18s, color 0.18s;
    font-size: 12px; font-weight: 500;
    color: ${C.textDim}; user-select: none;
  }
  .nav-item:hover { background: ${C.surfaceHigh}; color: ${C.textMid}; }
  .nav-item.active {
    background: ${C.cyanGlow};
    border-color: rgba(125,216,220,0.2);
    color: ${C.cyan};
  }

  .card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    transition: border-color 0.2s;
  }
  .card:hover { border-color: ${C.borderHi}; }

  .btn {
    cursor: pointer; border: none; outline: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-weight: 600; letter-spacing: 0.06em;
    border-radius: 6px; transition: all 0.18s;
  }
  .btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
  .btn:active { transform: translateY(0); filter: brightness(0.95); }

  .mono { font-family: 'IBM Plex Mono', monospace; }

  input[type=range] {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px; height: 13px; border-radius: 50%;
    background: ${C.cyan}; cursor: pointer;
    box-shadow: 0 0 6px rgba(125,216,220,0.4);
  }

  .toggle { position: relative; width: 38px; height: 21px; cursor: pointer; display: inline-block; }
  .toggle input { display: none; }
  .toggle-track { position: absolute; inset: 0; border-radius: 11px; transition: background 0.25s; }
  .toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 15px; height: 15px; border-radius: 50%;
    background: white; transition: transform 0.25s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  input:checked ~ .toggle-thumb { transform: translateX(17px); }

  .feed-row {
    display: grid; grid-template-columns: 54px 1fr 70px;
    gap: 8px; padding: 5px 8px; border-radius: 4px;
    border-left: 2px solid transparent; transition: background 0.12s;
  }
  .feed-row:hover { background: ${C.cyanGlow2}; }
  .feed-row.fresh { border-left-color: ${C.cyan}; background: ${C.cyanGlow2}; }

  .tag {
    font-size: 9px; padding: 1px 5px; border-radius: 3px;
    font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.05em;
  }
  .tag-tel { background: rgba(125,216,220,0.12); color: ${C.cyan}; }
  .tag-cmd { background: rgba(201,168,106,0.15); color: ${C.amber}; }
  .tag-sta { background: rgba(110,200,154,0.12); color: ${C.ok}; }

  .dot-live { animation: pulse 1.8s ease-in-out infinite; }
  .gauge-arc { transition: stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1); }
  .main-scroll { overflow-y: auto; height: calc(100vh - 90px); }
`;

// ─── Reusable Components ──────────────────────────────────────────────────────

const Dot = ({ color, pulse }) => (
  <span style={{
    display: "inline-block", width: 7, height: 7, borderRadius: "50%",
    background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}55`,
    ...(pulse ? { animation: "pulse 1.8s ease-in-out infinite" } : {}),
  }} />
);

const SectionHead = ({ label, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
    <span style={{ width: 2, height: 14, background: color || C.cyan, borderRadius: 1, display: "block" }} />
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMid }}>
      {label}
    </span>
  </div>
);

const StatPill = ({ label, value, color }) => (
  <div style={{
    flex: 1, textAlign: "center", padding: "7px 4px",
    background: C.surfaceHigh, borderRadius: 5, border: `1px solid ${C.border}`,
  }}>
    <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: color || C.cyan }}>{value}</div>
    <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{label}</div>
  </div>
);

const GaugeRing = ({ value, max, label, unit, color }) => {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const r = 32, cx = 40, cy = 40, sw = 5;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" transform="rotate(135 40 40)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${arc * pct} ${circ - arc * pct}`} strokeLinecap="round"
          transform="rotate(135 40 40)" className="gauge-arc"
          style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 600, fill: C.textPrimary }}>
          {typeof value === "number" ? value.toFixed(value > 99 ? 0 : 1) : value}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontFamily: "'IBM Plex Sans'", fontSize: 8, fill: C.textDim }}>{unit}</text>
      </svg>
      <span style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
};

const Spark = ({ data, color, h = 36, w = 140 }) => {
  if (!data || data.length < 2) return <div style={{ height: h, width: w }} />;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(" ");
  const id = `sg${color.replace(/[^a-z0-9]/gi, "")}${Math.abs(w)}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 2px ${color}66)` }} />
    </svg>
  );
};

const TelRow = ({ label, value, unit, color, warn }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "1fr auto auto",
    alignItems: "center", padding: "8px 0",
    borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 11, color: C.textMid }}>{label}</span>
    <span className="mono num-tick" style={{ fontSize: 13, fontWeight: 600, color: warn ? C.warn : color || C.textPrimary, marginRight: 4 }}>
      {typeof value === "number" ? value.toFixed(value > 999 ? 0 : value < 10 ? 2 : 1) : value}
    </span>
    <span style={{ fontSize: 10, color: C.textDim, minWidth: 30 }}>{unit}</span>
  </div>
);

const MqttFeed = ({ messages }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
    {messages.length === 0 && (
      <div style={{ padding: "12px 8px", fontSize: 11, color: C.textDim, textAlign: "center" }}>Waiting for messages…</div>
    )}
    {messages.map((m, i) => (
      <div key={i} className={`feed-row mono${i === 0 ? " fresh" : ""}`}>
        <span style={{ fontSize: 9, color: C.textDim }}>{m.time}</span>
        <span style={{ fontSize: 9.5, color: i === 0 ? C.cyan : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.topic}</span>
        <span className={`tag tag-${m.type === "telemetry" ? "tel" : m.type === "command" ? "cmd" : "sta"}`}>{m.type}</span>
      </div>
    ))}
  </div>
);

const CmdLog = ({ log }) => (
  <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
    {log.length === 0 && <div style={{ fontSize: 11, color: C.textDim, padding: "8px 0" }}>No commands sent yet.</div>}
    {log.map((entry, i) => (
      <div key={i} className="mono" style={{
        fontSize: 9.5, padding: "4px 8px", borderRadius: 3,
        background: C.surfaceHigh, color: i === 0 ? C.amber : C.textDim,
        display: "flex", gap: 10,
      }}>
        <span style={{ color: C.textDim, flexShrink: 0 }}>{entry.time}</span>
        <span style={{ color: C.cyan, flexShrink: 0 }}>{entry.topic.split("/").slice(-1)[0]}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(entry.payload)}</span>
      </div>
    ))}
  </div>
);

// ─── AHU Diagram ─────────────────────────────────────────────────────────────
const AhuDiagram = ({ telemetry }) => {
  const fanSpeed = telemetry.vfd_speed_pct || 0;
  const valvePos = telemetry.valve_position_pct || 0;
  const filterDp = telemetry.filter_dp_pa || 0;
  const animDur = fanSpeed > 0 ? `${Math.max(0.4, 3.5 - (fanSpeed / 100) * 3.0)}s` : "99999s";
  const filterColor = filterDp > 250 ? C.warn : C.ok;
  const chwOpacity = 0.25 + (valvePos / 100) * 0.65;

  return (
    <svg viewBox="0 0 780 270" width="100%" style={{ display: "block" }}>
      {/* ── Section boxes ── */}
      <rect x={8} y={42} width={174} height={186} rx={6} fill={C.surfaceHigh} stroke={C.border} strokeWidth={1} />
      <rect x={192} y={42} width={148} height={186} rx={6} fill={C.surfaceHigh} stroke={C.border} strokeWidth={1} />
      <rect x={350} y={42} width={162} height={186} rx={6} fill={C.surfaceHigh} stroke={C.border} strokeWidth={1} />
      <rect x={522} y={42} width={154} height={186} rx={6} fill={C.surfaceHigh} stroke={C.border} strokeWidth={1} />
      <rect x={684} y={98} width={88} height={74} rx={4} fill={C.surface} stroke={C.border} strokeWidth={1} />

      {/* ── Section Labels ── */}
      {[
        { x: 95, y: 30, t: "AIR MIXING BOX" },
        { x: 266, y: 30, t: "FILTERS" },
        { x: 431, y: 30, t: "COOLING SECTION" },
        { x: 599, y: 30, t: "BLOWING FAN" },
      ].map(({ x, y, t }) => (
        <text key={t} x={x} y={y} textAnchor="middle"
          style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: C.textDim, letterSpacing: "0.1em" }}>{t}</text>
      ))}

      {/* ── Outdoor Air duct ── */}
      <ellipse cx={56} cy={98} rx={28} ry={28} fill={C.surface} stroke={C.borderHi} strokeWidth={1.5} />
      <ellipse cx={56} cy={98} rx={20} ry={20} fill={C.bg} stroke={C.border} strokeWidth={1} />
      {/* damper blades */}
      <line x1={34} y1={91} x2={78} y2={105} stroke={C.cyanDim} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={34} y1={104} x2={78} y2={91} stroke={C.cyanDim} strokeWidth={1.5} strokeLinecap="round" opacity={0.45} />
      <text x={56} y={140} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>OUTDOOR AIR</text>

      {/* ── Return Air duct ── */}
      <ellipse cx={56} cy={178} rx={28} ry={28} fill={C.surface} stroke={C.borderHi} strokeWidth={1.5} />
      <ellipse cx={56} cy={178} rx={20} ry={20} fill={C.bg} stroke={C.border} strokeWidth={1} />
      <line x1={34} y1={171} x2={78} y2={185} stroke={C.warn} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <line x1={34} y1={184} x2={78} y2={171} stroke={C.warn} strokeWidth={1.2} strokeLinecap="round" opacity={0.35} />
      <text x={56} y={220} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>RETURN AIR</text>
      <text x={56} y={62} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.warn }}>
        {telemetry.return_air_temp_c?.toFixed(1)}°C
      </text>

      {/* ── Mixing zone arrow ── */}
      <path d="M 86 98 Q 150 80 164 135 Q 150 175 86 176" fill="none" stroke={C.textDim} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />

      {/* ── Pre-filter (pink/magenta) ── */}
      <rect x={208} y={66} width={20} height={134} rx={3}
        fill="rgba(185,95,160,0.16)" stroke="rgba(185,95,160,0.45)" strokeWidth={1.5} />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={i} x1={210} y1={70 + i * 9} x2={226} y2={70 + i * 9}
          stroke="rgba(190,110,170,0.35)" strokeWidth={0.8} />
      ))}
      <text x={218} y={212} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: "rgba(185,95,160,0.75)" }}>PRE</text>

      {/* ── Main filter (color by ΔP) ── */}
      <rect x={246} y={66} width={24} height={134} rx={3}
        fill={`${filterColor}18`} stroke={`${filterColor}55`} strokeWidth={1.5} />
      {Array.from({ length: 17 }).map((_, i) => (
        <line key={i} x1={248} y1={70 + i * 8} x2={268} y2={70 + i * 8}
          stroke={`${filterColor}40`} strokeWidth={0.8} />
      ))}
      <text x={258} y={212} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: filterColor }}>
        {filterDp.toFixed(0)}Pa
      </text>

      {/* ── Airflow arrow ── */}
      <path d="M 174 135 L 348 135" fill="none" stroke={C.textDim} strokeWidth={1} strokeDasharray="5 3" opacity={0.35} />
      <polygon points="348,131 358,135 348,139" fill={C.textDim} opacity={0.35} />

      {/* ── CHW coil ── */}
      <rect x={368} y={72} width={118} height={122} rx={4}
        fill={`rgba(90,190,195,${chwOpacity * 0.06})`}
        stroke={`rgba(90,190,195,${chwOpacity * 0.4})`} strokeWidth={1} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={372} y1={80 + i * 10} x2={482} y2={80 + i * 10}
          stroke={`rgba(90,190,195,${chwOpacity * 0.55})`} strokeWidth={2.8} strokeLinecap="round" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={372 + i * 18} y1={80} x2={372 + i * 18} y2={192}
          stroke={`rgba(90,190,195,0.12)`} strokeWidth={1} />
      ))}
      {/* CHW supply pipe */}
      <path d="M 362 70 L 362 56 L 428 56" fill="none" stroke={C.cyanDim} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 488 194 L 488 208 L 428 208" fill="none" stroke={C.cyanDim} strokeWidth={2.5} strokeLinecap="round" />
      {/* CHW valve box */}
      <rect x={415} y={50} width={26} height={13} rx={2} fill={C.surfaceHigh} stroke={C.cyanDim} strokeWidth={1} />
      <text x={428} y={59} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: C.cyanDim }}>CHW</text>
      {/* CHW temps */}
      <text x={362} y={48} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.cyan }}>
        {telemetry.chw_temp_in_c?.toFixed(1)}°C
      </text>
      <text x={362} y={222} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.cyanDim }}>
        {telemetry.chw_temp_out_c?.toFixed(1)}°C
      </text>

      {/* ── Supply temp sensor after coil ── */}
      <circle cx={520} cy={135} r={4} fill={C.surface} stroke={C.cyan} strokeWidth={1.5} />
      <circle cx={520} cy={135} r={2} fill={C.cyan} className="dot-live" />

      {/* ── Fan housing ── */}
      <circle cx={599} cy={135} r={56} fill={C.bg} stroke={C.border} strokeWidth={1.5} />
      <circle cx={599} cy={135} r={48} fill="transparent" stroke={C.border} strokeWidth={0.8} />
      {/* Rotating blades */}
      <g style={{ transformOrigin: "599px 135px", animation: `spin ${animDur} linear infinite` }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i}
            d={`M 599 90 Q ${599 + 14} 112 599 135 Q ${599 - 14} 112 599 90`}
            fill={C.cyanDim} opacity={0.6}
            style={{ transformOrigin: "599px 135px", transform: `rotate(${i * 45}deg)` }}
          />
        ))}
      </g>
      <circle cx={599} cy={135} r={11} fill={C.surfaceHigh} stroke={C.borderHi} strokeWidth={1.5} />
      <circle cx={599} cy={135} r={4} fill={C.textDim} />

      {/* VFD box */}
      <rect x={571} y={172} width={56} height={28} rx={4}
        fill={C.surfaceHigh} stroke={C.amber} strokeWidth={1.5} />
      <text x={599} y={183} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fontWeight: 600, fill: C.amber }}>VFD</text>
      <text x={599} y={194} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textMid }}>
        {fanSpeed.toFixed(0)}%
      </text>

      {/* ── Supply duct outlet ── */}
      <path d="M 676 98 L 684 98 M 676 172 L 684 172" stroke={C.border} strokeWidth={1} fill="none" />
      <rect x={685} y={104} width={80} height={62} rx={3}
        fill={`rgba(125,216,220,0.05)`} stroke={`${C.cyan}44`} strokeWidth={1} />
      <polygon points="745,126 762,135 745,144" fill={C.cyan} opacity={0.65} />
      <line x1={685} y1={135} x2={745} y2={135} stroke={C.cyan} strokeWidth={2} opacity={0.4} />
      <text x={715} y={98} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.cyan }}>
        {telemetry.supply_air_temp_c?.toFixed(1)}°C
      </text>
      <text x={715} y={178} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: C.textDim }}>SUPPLY AIR</text>

      {/* CO₂ sensor in mixing zone */}
      <circle cx={158} cy={104} r={4} fill={C.surface} stroke={C.ok} strokeWidth={1.5} />
      <circle cx={158} cy={104} r={2} fill={C.ok} className="dot-live" />
      <text x={158} y={96} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: C.ok }}>CO₂</text>

      {/* Duct pressure sensor */}
      <circle cx={710} cy={118} r={4} fill={C.surface} stroke={C.warn} strokeWidth={1.5} />
      <circle cx={710} cy={118} r={2} fill={C.warn} className="dot-live" />
    </svg>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BmsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [telemetry, setTelemetry] = useState(() => genTelemetry(null));
  const [history, setHistory] = useState({ temp: [], rtemp: [], co2: [], fan: [], dp: [] });
  const [messages, setMessages] = useState([]);
  const [cmdLog, setCmdLog] = useState([]);
  const [lastTs, setLastTs] = useState(new Date());

  const [setpoint, setSetpoint] = useState(16);
  const [vfdSetpoint, setVfdSetpoint] = useState(72);
  const [mode, setMode] = useState("auto");
  const [fanOverride, setFanOverride] = useState(false);
  const [ecoMode, setEcoMode] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setTelemetry(prev => {
        const next = genTelemetry({ ...prev, supply_air_setpoint_c: setpoint, vfd_setpoint_pct: vfdSetpoint, mode });
        setHistory(h => ({
          temp: [...h.temp.slice(-29), next.supply_air_temp_c],
          rtemp: [...h.rtemp.slice(-29), next.return_air_temp_c],
          co2: [...h.co2.slice(-29), next.co2_ppm],
          fan: [...h.fan.slice(-29), next.vfd_speed_pct],
          dp: [...h.dp.slice(-29), next.duct_pressure_pa],
        }));
        return next;
      });
      setLastTs(new Date());
      if (tickRef.current % 2 === 0) {
        const src = TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
        const t = new Date();
        const ts = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
        setMessages(prev => [{ ...src, time: ts }, ...prev.slice(0, 29)]);
      }
    }, 1800);
    return () => clearInterval(id);
  }, [setpoint, vfdSetpoint, mode]);

  const publishCommand = useCallback((subtopic, payload) => {
    const t = new Date();
    const ts = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
    const entry = { time: ts, topic: `uns/site01/hvac/ahu01/command/${subtopic}`, payload };
    setCmdLog(prev => [entry, ...prev.slice(0, 19)]);
    setMessages(prev => [{ topic: entry.topic, type: "command", time: ts }, ...prev.slice(0, 29)]);
    console.log("[CMD PUBLISH]", entry.topic, payload);
  }, []);

  const handlePublishAll = () => {
    publishCommand("supply_air_setpoint", { value: setpoint });
    publishCommand("vfd_speed_override", { value: vfdSetpoint });
    publishCommand("mode", { value: mode });
    if (fanOverride) publishCommand("fan_override", { value: true });
    if (ecoMode) publishCommand("economy_mode", { value: true });
    if (nightMode) publishCommand("night_mode", { value: true });
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "telemetry", label: "Telemetry", icon: "〰" },
    { id: "commands", label: "Commands", icon: "⌁" },
    { id: "historian", label: "Historian", icon: "◫" },
    { id: "topology", label: "Topology", icon: "◈" },
    { id: "alerts", label: "Alerts", icon: "⚑" },
  ];

  const tempWarn = telemetry.supply_air_temp_c > 20 || telemetry.supply_air_temp_c < 14;
  const co2Warn = telemetry.co2_ppm > 900;
  const dpWarn = telemetry.filter_dp_pa > 280;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>

        {/* Top Bar */}
        <header style={{
          height: 56, flexShrink: 0,
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={20} height={20} viewBox="0 0 20 20">
                <rect x={1} y={1} width={7} height={7} rx={1.5} stroke={C.cyan} strokeWidth={1.5} fill="none" />
                <rect x={12} y={1} width={7} height={7} rx={1.5} stroke={C.cyan} strokeWidth={1.5} fill="none" opacity={0.5} />
                <rect x={1} y={12} width={7} height={7} rx={1.5} stroke={C.cyan} strokeWidth={1.5} fill="none" opacity={0.5} />
                <rect x={12} y={12} width={7} height={7} rx={1.5} stroke={C.cyan} strokeWidth={1.5} fill="none" opacity={0.75} />
              </svg>
              <span style={{ fontFamily: "'IBM Plex Sans'", fontWeight: 700, fontSize: 14, color: C.textPrimary, letterSpacing: "0.02em" }}>
                UNS<span style={{ color: C.cyan }}>·</span>BMS
              </span>
            </div>
            <span style={{ color: C.border }}>|</span>
            <span className="mono" style={{ fontSize: 10, color: C.textDim }}>site01 / hvac / ahu01</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Dot color={C.ok} pulse />
              <span className="mono" style={{ fontSize: 10, color: C.textMid }}>EMQX ONLINE</span>
            </div>
            <span className="mono" style={{ fontSize: 10, color: C.textDim }}>
              {lastTs.toLocaleTimeString([], { hour12: false })}
            </span>
            <div className="mono" style={{
              padding: "3px 9px", borderRadius: 4, fontSize: 10,
              background: C.cyanGlow, border: `1px solid ${C.cyanDim}44`,
              color: C.cyan, animation: "pulse 2.5s ease-in-out infinite",
            }}>● LIVE</div>
          </div>
        </header>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          <nav style={{
            width: 200, flexShrink: 0,
            background: C.surface, borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column",
            padding: "16px 10px", gap: 2,
          }}>
            {TABS.map(tab => (
              <div key={tab.id}
                className={`nav-item${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>{tab.icon}</span>
                {tab.label}
              </div>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>Devices</div>
              {[{ name: "AHU-01", ok: true }, { name: "FCU-02", ok: true }, { name: "CHW-01", ok: false }].map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 4 }}>
                  <Dot color={d.ok ? C.ok : C.textDim} />
                  <span className="mono" style={{ fontSize: 10, color: d.ok ? C.textMid : C.textDim }}>{d.name}</span>
                </div>
              ))}
            </div>
          </nav>

          {/* Main */}
          <main className="main-scroll" style={{ flex: 1, padding: "20px 22px" }}>

            {/* ══ DASHBOARD ══ */}
            {activeTab === "dashboard" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* AHU header */}
                <div className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 7, background: C.cyanGlow, border: `1px solid ${C.cyanDim}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌬️</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Air Handling Unit — AHU-01</div>
                      <div className="mono" style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Arduino Opta · uns/site01/hvac/ahu01</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mode</div>
                      <div className="mono" style={{ fontSize: 11, color: C.cyan, fontWeight: 600, textTransform: "uppercase" }}>{telemetry.mode}</div>
                    </div>
                    <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, background: "rgba(110,200,154,0.1)", border: "1px solid rgba(110,200,154,0.25)", color: C.ok, display: "flex", alignItems: "center", gap: 5 }}>
                      <Dot color={C.ok} pulse /> RUNNING
                    </div>
                  </div>
                </div>

                {/* AHU Diagram */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="AHU Overview" />
                  <AhuDiagram telemetry={telemetry} />
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {[
                      { label: "Supply Air", value: `${telemetry.supply_air_temp_c?.toFixed(1)}°C`, color: C.cyan },
                      { label: "Return Air", value: `${telemetry.return_air_temp_c?.toFixed(1)}°C`, color: C.warn },
                      { label: "CHW ΔT", value: `${telemetry.chw_delta_t_c?.toFixed(1)}°C`, color: C.cyanDim },
                      { label: "VFD Speed", value: `${telemetry.vfd_speed_pct?.toFixed(0)}%`, color: C.ok },
                      { label: "Filter ΔP", value: `${telemetry.filter_dp_pa?.toFixed(0)} Pa`, color: telemetry.filter_dp_pa > 250 ? C.warn : C.textMid },
                      { label: "CO₂", value: `${telemetry.co2_ppm} ppm`, color: co2Warn ? C.warn : C.textMid },
                    ].map(s => (
                      <div key={s.label} style={{ flex: "1 1 110px", padding: "8px 12px", background: C.surfaceHigh, borderRadius: 6, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                        <div className="mono num-tick" style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gauges + Feed */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="card" style={{ padding: "18px 20px" }}>
                    <SectionHead label="Live Gauges" />
                    <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
                      <GaugeRing value={telemetry.supply_air_temp_c} max={30} label="Supply" unit="°C" color={tempWarn ? C.warn : C.cyan} />
                      <GaugeRing value={telemetry.vfd_speed_pct} max={100} label="Fan" unit="%" color={C.ok} />
                      <GaugeRing value={telemetry.valve_position_pct} max={100} label="Valve" unit="%" color={C.cyanDim} />
                      <GaugeRing value={telemetry.co2_ppm} max={1200} label="CO₂" unit="ppm" color={co2Warn ? C.warn : C.textMid} />
                    </div>
                  </div>
                  <div className="card" style={{ padding: "18px 20px" }}>
                    <SectionHead label="MQTT Live Feed" color={C.ok} />
                    <MqttFeed messages={messages} />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <StatPill label="Topics" value="6" />
                      <StatPill label="Msg/min" value="~33" />
                      <StatPill label="QoS" value="1" />
                      <StatPill label="Broker" value="EMQX" color={C.textMid} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ TELEMETRY ══ */}
            {activeTab === "telemetry" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Real-time Telemetry — AHU-01" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Air Side</div>
                      <TelRow label="Supply Air Temp" value={telemetry.supply_air_temp_c} unit="°C" color={C.cyan} warn={tempWarn} />
                      <TelRow label="Supply Setpoint" value={telemetry.supply_air_setpoint_c} unit="°C" color={C.cyanDim} />
                      <TelRow label="Return Air Temp" value={telemetry.return_air_temp_c} unit="°C" color={C.warn} />
                      <TelRow label="CO₂" value={telemetry.co2_ppm} unit="ppm" warn={co2Warn} />
                      <div style={{ marginTop: 16, fontSize: 10, color: C.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mechanical</div>
                      <TelRow label="VFD Speed" value={telemetry.vfd_speed_pct} unit="%" color={C.ok} />
                      <TelRow label="VFD Setpoint" value={telemetry.vfd_setpoint_pct} unit="%" color={C.textMid} />
                      <TelRow label="Valve Position" value={telemetry.valve_position_pct} unit="%" color={C.cyanDim} />
                      <TelRow label="Filter ΔP" value={telemetry.filter_dp_pa} unit="Pa" warn={dpWarn} />
                      <TelRow label="Duct Pressure" value={telemetry.duct_pressure_pa} unit="Pa" color={C.textMid} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Chilled Water</div>
                      <TelRow label="CHW Temp In" value={telemetry.chw_temp_in_c} unit="°C" color={C.cyan} />
                      <TelRow label="CHW Temp Out" value={telemetry.chw_temp_out_c} unit="°C" color={C.cyanDim} />
                      <TelRow label="CHW Delta-T" value={telemetry.chw_delta_t_c} unit="°C" color={C.textMid} />
                      <div style={{ marginTop: 16, fontSize: 10, color: C.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>System</div>
                      <TelRow label="Device" value={telemetry.device} unit="" color={C.textMid} />
                      <TelRow label="Mode" value={telemetry.mode} unit="" color={C.cyan} />
                      <TelRow label="Uptime" value={(telemetry.uptime_ms / 1000).toFixed(0)} unit="s" color={C.textMid} />
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Trends — Last 30 readings" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Supply Air Temp", data: history.temp, color: C.cyan, unit: "°C" },
                      { label: "Return Air Temp", data: history.rtemp, color: C.warn, unit: "°C" },
                      { label: "CO₂", data: history.co2, color: C.amber, unit: "ppm" },
                      { label: "VFD Speed", data: history.fan, color: C.ok, unit: "%" },
                      { label: "Duct Pressure", data: history.dp, color: C.cyanDim, unit: "Pa" },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 130, fontSize: 10, color: C.textMid, flexShrink: 0 }}>{row.label}</div>
                        <div style={{ flex: 1 }}><Spark data={row.data} color={row.color} h={34} w={220} /></div>
                        <span className="mono" style={{ fontSize: 11, color: row.color, minWidth: 64, textAlign: "right" }}>
                          {row.data[row.data.length - 1]?.toFixed(row.unit === "ppm" ? 0 : 1)} {row.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ COMMANDS ══ */}
            {activeTab === "commands" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="card" style={{ padding: "18px 20px" }}>
                    <SectionHead label="Setpoints" color={C.amber} />
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: C.textMid }}>Supply Air Setpoint</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{setpoint}°C</span>
                      </div>
                      <input type="range" min={14} max={26} value={setpoint}
                        onChange={e => setSetpoint(Number(e.target.value))}
                        style={{ background: `linear-gradient(90deg, ${C.cyan} ${((setpoint - 14) / 12) * 100}%, ${C.border} ${((setpoint - 14) / 12) * 100}%)` }} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: C.textDim }}>14°C</span>
                        <span style={{ fontSize: 9, color: C.textDim }}>26°C</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: C.textMid }}>VFD Speed Setpoint</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{vfdSetpoint}%</span>
                      </div>
                      <input type="range" min={20} max={100} value={vfdSetpoint}
                        onChange={e => setVfdSetpoint(Number(e.target.value))}
                        style={{ background: `linear-gradient(90deg, ${C.ok} ${((vfdSetpoint - 20) / 80) * 100}%, ${C.border} ${((vfdSetpoint - 20) / 80) * 100}%)` }} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: C.textDim }}>20%</span>
                        <span style={{ fontSize: 9, color: C.textDim }}>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: "18px 20px" }}>
                    <SectionHead label="Operation Mode" color={C.amber} />
                    <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
                      {["auto", "cool", "heat", "fan"].map(m => (
                        <button key={m} className="btn" onClick={() => setMode(m)} style={{
                          flex: 1, padding: "8px 0", fontSize: 10, textTransform: "uppercase",
                          background: mode === m ? C.cyanGlow : C.surfaceHigh,
                          border: `1px solid ${mode === m ? C.cyan : C.border}`,
                          color: mode === m ? C.cyan : C.textDim,
                        }}>{m}</button>
                      ))}
                    </div>
                    <SectionHead label="Feature Overrides" color={C.amber} />
                    {[
                      { label: "Fan Override", val: fanOverride, set: setFanOverride },
                      { label: "Economy Mode", val: ecoMode, set: setEcoMode },
                      { label: "Night Mode", val: nightMode, set: setNightMode },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 11, color: C.textMid }}>{item.label}</span>
                        <label className="toggle" onClick={() => item.set(!item.val)}>
                          <input type="checkbox" readOnly checked={item.val} />
                          <div className="toggle-track" style={{ background: item.val ? C.cyan : C.border }} />
                          <div className="toggle-thumb" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn" onClick={handlePublishAll} style={{
                  padding: "12px 0", fontSize: 12, letterSpacing: "0.1em",
                  background: C.cyanGlow, border: `1px solid ${C.cyanDim}66`,
                  color: C.cyan, textTransform: "uppercase",
                }}>↑ Publish All Commands to MQTT</button>

                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Quick Commands" color={C.amber} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "Setpoint Only", fn: () => publishCommand("supply_air_setpoint", { value: setpoint }) },
                      { label: "VFD Only", fn: () => publishCommand("vfd_speed_override", { value: vfdSetpoint }) },
                      { label: "Mode Only", fn: () => publishCommand("mode", { value: mode }) },
                      { label: "Valve Override 50%", fn: () => publishCommand("valve_override", { value: 50 }) },
                    ].map(q => (
                      <button key={q.label} className="btn" onClick={q.fn} style={{
                        padding: "7px 14px", fontSize: 10, letterSpacing: "0.06em",
                        background: C.amberGlow, border: `1px solid ${C.amber}44`,
                        color: C.amber, textTransform: "uppercase",
                      }}>{q.label}</button>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Command Log" color={C.amber} />
                  <CmdLog log={cmdLog} />
                </div>
              </div>
            )}

            {/* ══ HISTORIAN ══ */}
            {activeTab === "historian" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Historian — InfluxDB / Grafana" />
                  <div style={{ padding: "24px", background: C.surfaceHigh, borderRadius: 6, border: `1px solid ${C.border}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>◫</span>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Grafana Dashboard</div>
                    <div style={{ fontSize: 11, color: C.textDim, maxWidth: 400 }}>
                      Embedded Grafana iframe connects to InfluxDB at{" "}
                      <span className="mono" style={{ color: C.cyan }}>http://localhost:3000</span>.
                      <br />Configure <span className="mono" style={{ color: C.cyanDim }}>VITE_GRAFANA_URL</span> in your .env.
                    </div>
                    <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", borderRadius: 6, fontSize: 11, background: C.cyanGlow, border: `1px solid ${C.cyanDim}55`, color: C.cyan, textDecoration: "none" }}>Open Grafana ↗</a>
                  </div>
                </div>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="In-Memory Trends" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { label: "Supply Air Temp", data: history.temp, color: C.cyan, unit: "°C", h: 54 },
                      { label: "CO₂", data: history.co2, color: C.amber, unit: "ppm", h: 54 },
                    ].map(row => (
                      <div key={row.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: C.textMid }}>{row.label}</span>
                          <span className="mono" style={{ fontSize: 11, color: row.color }}>{row.data[row.data.length - 1]?.toFixed(1)} {row.unit}</span>
                        </div>
                        <Spark data={row.data} color={row.color} h={row.h} w={560} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ TOPOLOGY ══ */}
            {activeTab === "topology" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="UNS Architecture — uns/site01/hvac" />
                  <svg viewBox="0 0 620 330" width="100%" style={{ display: "block" }}>
                    {/* EMQX center */}
                    <rect x={245} y={135} width={130} height={52} rx={6} fill={C.surface} stroke={C.cyan} strokeWidth={1.5} />
                    <text x={310} y={157} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.cyan, fontWeight: 600 }}>EMQX BROKER</text>
                    <text x={310} y={171} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: C.textDim }}>mqtt-broker:1883</text>
                    {/* AHU-01 */}
                    <rect x={30} y={60} width={115} height={46} rx={5} fill={C.surface} stroke={C.borderHi} strokeWidth={1} />
                    <text x={87} y={80} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.textPrimary, fontWeight: 600 }}>AHU-01</text>
                    <text x={87} y={96} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>Arduino Opta</text>
                    <line x1={145} y1={83} x2={245} y2={152} stroke={C.ok} strokeWidth={1} strokeDasharray="4 3" />
                    <line x1={245} y1={155} x2={145} y2={97} stroke={C.amber} strokeWidth={1} strokeDasharray="4 3" />
                    <text x={190} y={112} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: C.ok }}>pub: telemetry</text>
                    <text x={170} y={130} style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7, fill: C.amber }}>sub: command</text>
                    {/* Node-RED */}
                    <rect x={30} y={210} width={115} height={46} rx={5} fill={C.surface} stroke={C.borderHi} strokeWidth={1} />
                    <text x={87} y={230} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.textPrimary, fontWeight: 600 }}>Node-RED</text>
                    <text x={87} y={246} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>port 1880</text>
                    <line x1={145} y1={233} x2={245} y2={168} stroke={C.cyanDim} strokeWidth={1} strokeDasharray="4 3" />
                    {/* InfluxDB */}
                    <rect x={475} y={60} width={115} height={46} rx={5} fill={C.surface} stroke={C.borderHi} strokeWidth={1} />
                    <text x={532} y={80} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.textPrimary, fontWeight: 600 }}>InfluxDB</text>
                    <text x={532} y={96} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>port 8086</text>
                    <line x1={475} y1={83} x2={375} y2={152} stroke={C.cyanDim} strokeWidth={1} strokeDasharray="4 3" />
                    {/* Grafana */}
                    <rect x={475} y={210} width={115} height={46} rx={5} fill={C.surface} stroke={C.borderHi} strokeWidth={1} />
                    <text x={532} y={230} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.textPrimary, fontWeight: 600 }}>Grafana</text>
                    <text x={532} y={246} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>port 3000</text>
                    <line x1={475} y1={233} x2={375} y2={168} stroke={C.warn} strokeWidth={1} strokeDasharray="4 3" />
                    {/* React UI */}
                    <rect x={245} y={278} width={130} height={46} rx={5} fill={C.surface} stroke={C.cyan} strokeWidth={1} />
                    <text x={310} y={298} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, fill: C.textPrimary, fontWeight: 600 }}>React UI</text>
                    <text x={310} y={314} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono'", fontSize: 7.5, fill: C.textDim }}>port 5173</text>
                    <line x1={310} y1={278} x2={310} y2={187} stroke={C.cyan} strokeWidth={1} strokeDasharray="4 3" />
                  </svg>
                </div>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Topic Namespace" />
                  <div className="mono" style={{ fontSize: 11, lineHeight: 2.2, color: C.textMid, background: C.surfaceHigh, padding: "14px 16px", borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <span style={{ color: C.cyanDim }}>uns/</span><br />
                    &nbsp;&nbsp;<span>site01/</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span>hvac/</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.textPrimary }}>ahu01/</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.cyan }}>telemetry</span>{"  "}↑ published by edge<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.amber }}>command/#</span>{"  "}↓ subscribed by edge<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.ok }}>status/health</span>{"  "}↑ retained LWT
                  </div>
                </div>
              </div>
            )}

            {/* ══ ALERTS ══ */}
            {activeTab === "alerts" && (
              <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="Active Conditions" color={C.danger} />
                  {[
                    { label: "Supply Air Temp", active: tempWarn, value: `${telemetry.supply_air_temp_c?.toFixed(1)}°C`, limit: "14–20°C" },
                    { label: "CO₂ Level", active: co2Warn, value: `${telemetry.co2_ppm} ppm`, limit: "< 900 ppm" },
                    { label: "Filter ΔP", active: dpWarn, value: `${telemetry.filter_dp_pa?.toFixed(0)} Pa`, limit: "< 280 Pa" },
                  ].map(a => (
                    <div key={a.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 6, marginBottom: 6, background: a.active ? "rgba(201,106,106,0.07)" : "rgba(110,200,154,0.05)", border: `1px solid ${a.active ? C.danger + "44" : C.ok + "33"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Dot color={a.active ? C.danger : C.ok} pulse={a.active} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{a.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 12, color: a.active ? C.danger : C.ok }}>{a.value}</span>
                        <span style={{ fontSize: 10, color: C.textDim }}>Limit: {a.limit}</span>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: a.active ? "rgba(201,106,106,0.14)" : "rgba(110,200,154,0.1)", color: a.active ? C.danger : C.ok, fontFamily: "'IBM Plex Mono'" }}>
                          {a.active ? "WARN" : "OK"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <SectionHead label="All Points — Live Status" color={C.danger} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { label: "Supply Temp", value: telemetry.supply_air_temp_c?.toFixed(1), unit: "°C", ok: !tempWarn },
                      { label: "Return Temp", value: telemetry.return_air_temp_c?.toFixed(1), unit: "°C", ok: true },
                      { label: "CHW In", value: telemetry.chw_temp_in_c?.toFixed(1), unit: "°C", ok: true },
                      { label: "CHW Out", value: telemetry.chw_temp_out_c?.toFixed(1), unit: "°C", ok: true },
                      { label: "VFD Speed", value: telemetry.vfd_speed_pct?.toFixed(0), unit: "%", ok: true },
                      { label: "Valve Pos", value: telemetry.valve_position_pct?.toFixed(0), unit: "%", ok: true },
                      { label: "Filter ΔP", value: telemetry.filter_dp_pa?.toFixed(0), unit: "Pa", ok: !dpWarn },
                      { label: "Duct Pressure", value: telemetry.duct_pressure_pa?.toFixed(0), unit: "Pa", ok: true },
                      { label: "CO₂", value: String(telemetry.co2_ppm), unit: "ppm", ok: !co2Warn },
                    ].map(p => (
                      <div key={p.label} style={{ padding: "10px 12px", background: C.surfaceHigh, borderRadius: 5, border: `1px solid ${p.ok ? C.border : C.danger + "44"}` }}>
                        <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4 }}>{p.label}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: p.ok ? C.textPrimary : C.danger }}>{p.value}</span>
                          <span style={{ fontSize: 9, color: C.textDim }}>{p.unit}</span>
                        </div>
                        <div style={{ marginTop: 4 }}><Dot color={p.ok ? C.ok : C.danger} pulse={!p.ok} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* Footer */}
        <footer style={{ height: 34, flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <span className="mono" style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.06em" }}>UNS-BMS-LITE · EMQX · NODE-RED · INFLUXDB · GRAFANA</span>
          <span className="mono" style={{ fontSize: 9, color: C.textDim }}>©2026 LazaroAutomation</span>
        </footer>
      </div>
    </>
  );
}