import { useState, useEffect, useRef } from "react";

const COLORS = {
  obsidian: "#1A1A1B",
  obsidianLight: "#242425",
  obsidianMid: "#2E2E2F",
  cyan: "#00F2FF",
  cyanDim: "#00B8C2",
  cyanGlow: "rgba(0,242,255,0.15)",
  cyanGlow2: "rgba(0,242,255,0.08)",
  slate: "#707070",
  slateDark: "#3A3A3B",
  slateLight: "#909090",
  white: "#F0F0F0",
  warning: "#FFB800",
  danger: "#FF4444",
  ok: "#00E676",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Roboto:wght@300;400;500&family=Roboto+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${COLORS.obsidian};
    font-family: 'Roboto', sans-serif;
    color: ${COLORS.white};
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${COLORS.obsidianLight}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.slateDark}; border-radius: 2px; }

  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(0,242,255,0.4); }
    70% { box-shadow: 0 0 0 8px rgba(0,242,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,242,255,0); }
  }

  @keyframes data-flow {
    0% { stroke-dashoffset: 200; }
    100% { stroke-dashoffset: 0; }
  }

  @keyframes scan-line {
    0% { top: 0%; opacity: 0.6; }
    100% { top: 100%; opacity: 0; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes count-up {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes bar-fill {
    from { width: 0%; }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes sparkle {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .fade-in { animation: fade-in 0.5s ease forwards; }
  .fade-in-1 { animation: fade-in 0.5s 0.1s ease both; }
  .fade-in-2 { animation: fade-in 0.5s 0.2s ease both; }
  .fade-in-3 { animation: fade-in 0.5s 0.3s ease both; }
  .fade-in-4 { animation: fade-in 0.5s 0.4s ease both; }
  .fade-in-5 { animation: fade-in 0.5s 0.5s ease both; }

  .metric-value {
    animation: count-up 0.4s ease;
    font-family: 'Roboto Mono', monospace;
  }

  .pulse-dot {
    animation: pulse-ring 2s infinite;
    border-radius: 50%;
  }

  .scan-effect {
    position: relative;
    overflow: hidden;
  }
  .scan-effect::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,242,255,0.4), transparent);
    animation: scan-line 3s linear infinite;
    pointer-events: none;
  }

  .bar-fill { animation: bar-fill 1s ease forwards; }

  .card-hover {
    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
  }
  .card-hover:hover {
    border-color: ${COLORS.cyanDim} !important;
    box-shadow: 0 0 20px ${COLORS.cyanGlow}, 0 4px 24px rgba(0,0,0,0.5) !important;
    transform: translateY(-2px);
  }

  .btn-cmd {
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    font-family: 'Montserrat', sans-serif;
  }
  .btn-cmd:hover {
    filter: brightness(1.2);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,242,255,0.3);
  }
  .btn-cmd:active { transform: translateY(0); }

  .topic-row {
    transition: background 0.15s;
    cursor: default;
  }
  .topic-row:hover { background: rgba(0,242,255,0.05) !important; }

  .slider-track {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(90deg, ${COLORS.cyan} var(--val, 50%), ${COLORS.slateDark} var(--val, 50%));
    outline: none;
    cursor: pointer;
    width: 100%;
  }
  .slider-track::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: ${COLORS.cyan};
    box-shadow: 0 0 8px ${COLORS.cyan};
    cursor: pointer;
  }

  .toggle-switch {
    position: relative;
    width: 44px; height: 24px;
    cursor: pointer;
  }
  .toggle-switch input { display: none; }
  .toggle-knob {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    transition: background 0.3s;
  }
  .toggle-knob::before {
    content: '';
    position: absolute;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: white;
    top: 3px; left: 3px;
    transition: transform 0.3s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
  input:checked + .toggle-knob::before { transform: translateX(20px); }

  .chart-bar {
    transition: height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`;

// --- Simulated Data ---
const generateTelemetry = (prev) => ({
  temperature: +(prev ? prev.temperature + (Math.random() - 0.5) * 0.6 : 22.4).toFixed(1),
  humidity: +(prev ? prev.humidity + (Math.random() - 0.5) * 0.8 : 58.2).toFixed(1),
  pressure: +(prev ? prev.pressure + (Math.random() - 0.5) * 0.3 : 101.3).toFixed(1),
  co2: Math.round(prev ? prev.co2 + (Math.random() - 0.5) * 5 : 412),
  fanSpeed: Math.round(prev ? prev.fanSpeed + (Math.random() - 0.5) * 2 : 72),
  powerDraw: +(prev ? prev.powerDraw + (Math.random() - 0.5) * 0.3 : 4.8).toFixed(1),
});

const TOPIC_STREAM = [
  { topic: "uns/site01/hvac/ahu01/telemetry/temperature", type: "telemetry" },
  { topic: "uns/site01/hvac/ahu01/telemetry/humidity", type: "telemetry" },
  { topic: "uns/site01/hvac/ahu01/status/health", type: "status" },
  { topic: "uns/site01/hvac/ahu01/command/setpoint", type: "command" },
  { topic: "uns/site01/hvac/ahu01/telemetry/co2", type: "telemetry" },
  { topic: "uns/site01/hvac/ahu01/telemetry/fanspeed", type: "telemetry" },
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// --- Sub-components ---

const StatusDot = ({ status }) => {
  const color = status === "online" ? COLORS.ok : status === "warning" ? COLORS.warning : COLORS.danger;
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: status === "online" ? "pulse-ring 2s infinite" : "blink 1.2s infinite",
    }} />
  );
};

const SectionTitle = ({ label, accent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
    <span style={{
      width: 3, height: 18, background: accent || COLORS.cyan,
      borderRadius: 2, display: "block",
      boxShadow: `0 0 8px ${accent || COLORS.cyan}`,
    }} />
    <span style={{
      fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
      fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
      color: COLORS.slateLight,
    }}>{label}</span>
  </div>
);

const MetricCard = ({ label, value, unit, icon, trend, status, className }) => {
  const trendColor = trend === "up" ? COLORS.warning : trend === "down" ? COLORS.cyan : COLORS.slate;
  return (
    <div className={`card-hover ${className || ""}`} style={{
      background: COLORS.obsidianLight,
      border: `1px solid ${COLORS.slateDark}`,
      borderRadius: 10,
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, color: COLORS.slate, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="metric-value" style={{ fontSize: 28, fontWeight: 700, color: status === "warn" ? COLORS.warning : COLORS.white, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 12, color: COLORS.slate }}>{unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 10, color: trendColor }}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
        </span>
        <span style={{ fontSize: 10, color: COLORS.slate }}>Live</span>
      </div>
    </div>
  );
};

const GaugeRing = ({ value, max, label, color }) => {
  const pct = clamp(value / max, 0, 1);
  const r = 34, cx = 44, cy = 44;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct * 0.75);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.slateDark} strokeWidth={6}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round" transform="rotate(135 44 44)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${circumference * 0.75 * pct} ${circumference * (1 - 0.75 * pct)}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round" transform="rotate(135 44 44)"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dasharray 0.8s ease" }} />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "'Roboto Mono'", fontSize: 13, fontWeight: 600, fill: COLORS.white }}>{value}</text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          style={{ fontFamily: "'Roboto'", fontSize: 8, fill: COLORS.slate }}>{label.split("/")[1] || label}</text>
      </svg>
      <span style={{ fontSize: 9, color: COLORS.slate, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label.split("/")[0]}</span>
    </div>
  );
};

const MiniChart = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 160, h = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <polyline points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#grad-${color.replace("#", "")})`} stroke="none" />
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const TopicFeed = ({ messages }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 200, overflowY: "auto" }}>
    {messages.map((m, i) => (
      <div key={i} className="topic-row" style={{
        display: "grid", gridTemplateColumns: "60px 1fr auto",
        gap: 8, padding: "6px 8px", borderRadius: 4,
        background: i === 0 ? COLORS.cyanGlow2 : "transparent",
        borderLeft: i === 0 ? `2px solid ${COLORS.cyan}` : "2px solid transparent",
        transition: "all 0.3s",
      }}>
        <span style={{ fontSize: 9, color: COLORS.slate, fontFamily: "'Roboto Mono'" }}>{m.time}</span>
        <span style={{ fontSize: 10, color: i === 0 ? COLORS.cyan : COLORS.slateLight, fontFamily: "'Roboto Mono'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.topic}</span>
        <span style={{
          fontSize: 9, padding: "1px 6px", borderRadius: 3,
          background: m.type === "telemetry" ? "rgba(0,242,255,0.12)" : m.type === "command" ? "rgba(255,184,0,0.15)" : "rgba(0,230,118,0.12)",
          color: m.type === "telemetry" ? COLORS.cyan : m.type === "command" ? COLORS.warning : COLORS.ok,
          fontFamily: "'Roboto Mono'", letterSpacing: "0.06em",
        }}>{m.type}</span>
      </div>
    ))}
  </div>
);

// --- Main Dashboard ---
export default function BmsDashboard() {
  const [telemetry, setTelemetry] = useState(generateTelemetry(null));
  const [history, setHistory] = useState({ temp: [], humidity: [], co2: [] });
  const [setpoint, setSetpoint] = useState(22);
  const [mode, setMode] = useState("auto");
  const [fanOverride, setFanOverride] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const t = generateTelemetry(telemetry);
      setTelemetry(t);
      setLastUpdate(new Date());
      setHistory(prev => ({
        temp: [...prev.temp.slice(-19), t.temperature],
        humidity: [...prev.humidity.slice(-19), t.humidity],
        co2: [...prev.co2.slice(-19), t.co2],
      }));
      if (tickRef.current % 2 === 0) {
        const src = TOPIC_STREAM[Math.floor(Math.random() * TOPIC_STREAM.length)];
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setMessages(prev => [{ ...src, time: timeStr }, ...prev.slice(0, 19)]);
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [telemetry]);

  const tempStatus = telemetry.temperature > 26 || telemetry.temperature < 18 ? "warn" : "ok";
  const humStatus = telemetry.humidity > 70 || telemetry.humidity < 30 ? "warn" : "ok";

  const sliderPct = ((setpoint - 16) / (32 - 16)) * 100;

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: COLORS.obsidian, display: "flex", flexDirection: "column" }}>

        {/* Top Bar */}
        <header style={{
          background: COLORS.obsidianLight,
          borderBottom: `1px solid ${COLORS.slateDark}`,
          padding: "0 24px",
          height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <rect x={1} y={1} width={8} height={8} rx={1.5} stroke={COLORS.cyan} strokeWidth={1.5} />
                <rect x={13} y={1} width={8} height={8} rx={1.5} stroke={COLORS.cyan} strokeWidth={1.5} opacity={0.5} />
                <rect x={1} y={13} width={8} height={8} rx={1.5} stroke={COLORS.cyan} strokeWidth={1.5} opacity={0.5} />
                <rect x={13} y={13} width={8} height={8} rx={1.5} stroke={COLORS.cyan} strokeWidth={1.5} opacity={0.8} />
              </svg>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.04em", color: COLORS.white }}>
                UNS<span style={{ color: COLORS.cyan }}>·</span>BMS
              </span>
            </div>
            <span style={{ color: COLORS.slateDark, fontSize: 12 }}>|</span>
            <span style={{ fontSize: 11, color: COLORS.slate, fontFamily: "'Roboto Mono'" }}>site01 / hvac / ahu01</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StatusDot status="online" />
              <span style={{ fontSize: 10, color: COLORS.slateLight, fontFamily: "'Roboto Mono'" }}>BROKER ONLINE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: COLORS.slate, fontFamily: "'Roboto Mono'" }}>
                {lastUpdate.toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <div style={{
              background: COLORS.cyanGlow, border: `1px solid ${COLORS.cyanDim}`,
              borderRadius: 4, padding: "3px 10px",
              fontSize: 10, color: COLORS.cyan, fontFamily: "'Roboto Mono'", fontWeight: 500,
              animation: "blink 2.5s infinite",
            }}>● LIVE</div>
          </div>
        </header>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Sidebar */}
          {sidebarOpen && (
            <aside style={{
              width: 220, minWidth: 220,
              background: COLORS.obsidianLight,
              borderRight: `1px solid ${COLORS.slateDark}`,
              padding: "20px 14px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              {[
                { label: "Dashboard", icon: "▦", active: true },
                { label: "Telemetry", icon: "〰", active: false },
                { label: "Commands", icon: "⌁", active: false },
                { label: "Historian", icon: "◫", active: false },
                { label: "Topology", icon: "◈", active: false },
                { label: "Alerts", icon: "⚑", active: false },
              ].map((item) => (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 7, cursor: "pointer",
                  background: item.active ? COLORS.cyanGlow : "transparent",
                  border: item.active ? `1px solid rgba(0,242,255,0.2)` : "1px solid transparent",
                  transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 14, color: item.active ? COLORS.cyan : COLORS.slate }}>{item.icon}</span>
                  <span style={{
                    fontSize: 12, fontFamily: "'Montserrat', sans-serif", fontWeight: item.active ? 600 : 400,
                    color: item.active ? COLORS.white : COLORS.slate,
                  }}>{item.label}</span>
                </div>
              ))}

              <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${COLORS.slateDark}` }}>
                <div style={{ fontSize: 9, color: COLORS.slate, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Devices</div>
                {["AHU-01 ●", "FCU-02 ●", "CHW-01 ◌"].map((d, i) => (
                  <div key={d} style={{
                    fontSize: 11, fontFamily: "'Roboto Mono'", padding: "5px 8px", borderRadius: 4,
                    color: i < 2 ? COLORS.ok : COLORS.slate,
                  }}>{d}</div>
                ))}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main style={{ flex: 1, padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* AHU Header */}
            <div className="fade-in" style={{
              background: COLORS.obsidianLight,
              border: `1px solid ${COLORS.slateDark}`,
              borderRadius: 10,
              padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: COLORS.cyanGlow,
                  border: `1px solid rgba(0,242,255,0.3)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>🌬️</div>
                <div>
                  <div style={{ fontFamily: "'Montserrat'", fontWeight: 700, fontSize: 15 }}>Air Handling Unit — AHU-01</div>
                  <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2, fontFamily: "'Roboto Mono'" }}>uns/site01/hvac/ahu01 · Arduino Opta Edge Node</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mode</div>
                  <div style={{ fontSize: 12, color: COLORS.cyan, fontFamily: "'Roboto Mono'", fontWeight: 500, textTransform: "uppercase" }}>{mode}</div>
                </div>
                <div style={{
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.3)",
                  fontSize: 10, color: COLORS.ok, fontFamily: "'Roboto Mono'",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <StatusDot status="online" /> RUNNING
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="fade-in-1" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}>
              <MetricCard label="Temperature" value={telemetry.temperature} unit="°C" icon="🌡" trend={telemetry.temperature > 23 ? "up" : "down"} status={tempStatus} />
              <MetricCard label="Humidity" value={telemetry.humidity} unit="%" icon="💧" trend={telemetry.humidity > 60 ? "up" : "down"} status={humStatus} />
              <MetricCard label="CO₂" value={telemetry.co2} unit="ppm" icon="🫧" trend="up" status={telemetry.co2 > 600 ? "warn" : "ok"} />
              <MetricCard label="Fan Speed" value={telemetry.fanSpeed} unit="%" icon="🔄" trend="—" />
              <MetricCard label="Pressure" value={telemetry.pressure} unit="kPa" icon="📊" trend="—" />
              <MetricCard label="Power Draw" value={telemetry.powerDraw} unit="kW" icon="⚡" trend="up" />
            </div>

            {/* Middle Row */}
            <div className="fade-in-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Gauges */}
              <div className="card-hover scan-effect" style={{
                background: COLORS.obsidianLight,
                border: `1px solid ${COLORS.slateDark}`,
                borderRadius: 10, padding: "18px 20px",
              }}>
                <SectionTitle label="Live Gauges" />
                <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 12 }}>
                  <GaugeRing value={telemetry.temperature} max={40} label="Temp/°C" color={tempStatus === "warn" ? COLORS.warning : COLORS.cyan} />
                  <GaugeRing value={telemetry.humidity} max={100} label="Humidity/%" color={humStatus === "warn" ? COLORS.warning : COLORS.cyanDim} />
                  <GaugeRing value={telemetry.fanSpeed} max={100} label="Fan/%" color={COLORS.ok} />
                </div>
              </div>

              {/* Trend Chart */}
              <div className="card-hover" style={{
                background: COLORS.obsidianLight,
                border: `1px solid ${COLORS.slateDark}`,
                borderRadius: 10, padding: "18px 20px",
              }}>
                <SectionTitle label="Trend — Last 20 readings" />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Temperature", data: history.temp, color: COLORS.cyan, unit: "°C" },
                    { label: "Humidity", data: history.humidity, color: COLORS.cyanDim, unit: "%" },
                    { label: "CO₂", data: history.co2, color: COLORS.warning, unit: "ppm" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: COLORS.slate, fontFamily: "'Roboto Mono'" }}>{item.label}</span>
                        <span style={{ fontSize: 10, color: item.color, fontFamily: "'Roboto Mono'" }}>
                          {item.data[item.data.length - 1]}{item.unit}
                        </span>
                      </div>
                      <MiniChart data={item.data} color={item.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="fade-in-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Command Panel */}
              <div className="card-hover" style={{
                background: COLORS.obsidianLight,
                border: `1px solid ${COLORS.slateDark}`,
                borderRadius: 10, padding: "18px 20px",
              }}>
                <SectionTitle label="Command Interface" accent={COLORS.warning} />

                {/* Setpoint */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: COLORS.slate }}>Temperature Setpoint</span>
                    <span style={{ fontSize: 13, color: COLORS.white, fontFamily: "'Roboto Mono'", fontWeight: 600 }}>{setpoint}°C</span>
                  </div>
                  <input type="range" className="slider-track" min={16} max={32} value={setpoint}
                    style={{ "--val": `${sliderPct}%` }}
                    onChange={(e) => setSetpoint(Number(e.target.value))} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: COLORS.slate }}>16°C</span>
                    <span style={{ fontSize: 9, color: COLORS.slate }}>32°C</span>
                  </div>
                </div>

                {/* Mode Buttons */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 8 }}>Operation Mode</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["auto", "cool", "heat", "fan"].map((m) => (
                      <button key={m} className="btn-cmd" onClick={() => setMode(m)} style={{
                        flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 10,
                        fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                        background: mode === m ? COLORS.cyanGlow : COLORS.obsidianMid,
                        border: `1px solid ${mode === m ? COLORS.cyan : COLORS.slateDark}`,
                        color: mode === m ? COLORS.cyan : COLORS.slate,
                        boxShadow: mode === m ? `0 0 10px ${COLORS.cyanGlow}` : "none",
                      }}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Fan Override", value: fanOverride, set: setFanOverride },
                    { label: "Economy Mode", value: false, set: () => {} },
                    { label: "Night Mode", value: false, set: () => {} },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: COLORS.slateLight }}>{item.label}</span>
                      <label className="toggle-switch" onClick={() => item.set(!item.value)}>
                        <input type="checkbox" readOnly checked={item.value} />
                        <span className="toggle-knob" style={{ background: item.value ? COLORS.cyan : COLORS.slateDark }} />
                      </label>
                    </div>
                  ))}
                </div>

                <button className="btn-cmd" style={{
                  marginTop: 16, width: "100%", padding: "10px",
                  background: `linear-gradient(135deg, ${COLORS.cyanGlow}, rgba(0,242,255,0.2))`,
                  border: `1px solid ${COLORS.cyan}`,
                  color: COLORS.cyan, borderRadius: 7, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  boxShadow: `0 0 16px ${COLORS.cyanGlow}`,
                }}>
                  ↑ Publish Command
                </button>
              </div>

              {/* MQTT Feed */}
              <div className="card-hover" style={{
                background: COLORS.obsidianLight,
                border: `1px solid ${COLORS.slateDark}`,
                borderRadius: 10, padding: "18px 20px",
              }}>
                <SectionTitle label="MQTT Live Feed" accent={COLORS.ok} />
                <TopicFeed messages={messages} />

                {/* Namespace breadcrumb */}
                <div style={{
                  marginTop: 14, padding: "10px 12px",
                  background: COLORS.obsidianMid, borderRadius: 7,
                  fontFamily: "'Roboto Mono'", fontSize: 10,
                  color: COLORS.slate, lineHeight: 1.8,
                }}>
                  <span style={{ color: COLORS.cyanDim }}>uns/</span>
                  <span style={{ color: COLORS.slateLight }}>site01/</span>
                  <span style={{ color: COLORS.slateLight }}>hvac/</span>
                  <span style={{ color: COLORS.white }}>ahu01/</span>
                  <span style={{ color: COLORS.slate }}>telemetry|command|status</span>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {[
                    { label: "Topics", value: "6" },
                    { label: "Msg/min", value: "~33" },
                    { label: "QoS", value: "1" },
                    { label: "Broker", value: "EMQX" },
                  ].map(item => (
                    <div key={item.label} style={{
                      flex: 1, textAlign: "center", padding: "8px 4px",
                      background: COLORS.obsidianMid, borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 12, fontFamily: "'Roboto Mono'", color: COLORS.cyan, fontWeight: 600 }}>{item.value}</div>
                      <div style={{ fontSize: 9, color: COLORS.slate, marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </main>
        </div>

        {/* Footer */}
        <footer style={{
          background: COLORS.obsidianLight,
          borderTop: `1px solid ${COLORS.slateDark}`,
          padding: "8px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: COLORS.slate, fontFamily: "'Roboto Mono'", letterSpacing: "0.06em" }}>
            UNS-BMS-LITE · EMQX · Node-RED · InfluxDB · Grafana
          </span>
          <span style={{ fontSize: 9, color: COLORS.slate, fontFamily: "'Roboto Mono'" }}>
            ©2026 LazaroAutomation
          </span>
        </footer>
      </div>
    </>
  );
}
