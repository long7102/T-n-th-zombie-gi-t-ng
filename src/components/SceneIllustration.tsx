import React, { useMemo } from 'react';
import { WeatherType } from '../types/game';

// Tranh minh họa vẽ bằng SVG theo từng cảnh: bầu trời đổi theo thời tiết, đường chân trời
// khác nhau theo mã cảnh (seed), và một "chủ đề" tiền cảnh riêng (cửa sổ, phố, sân thượng,
// bầy zombie, thùng tiếp tế, cầu vượt, bệnh viện, Bunker 13, tháp...). Tĩnh hoàn toàn, không chớp.

type Motif = 'room' | 'street' | 'rooftop' | 'horde' | 'supply' | 'bridge' | 'hospital' | 'bunker' | 'tower' | 'storm';

const MOTIF_BY_SCENE: Record<string, Motif> = {
  r_start: 'room', r_scavenge_neighbor: 'room', r_fortify_door: 'room', r_food_cook: 'room', r_wound_care: 'room',
  r_noise_next_room: 'room', r_companion_talk: 'room', r_rest_recover: 'room', r_set_traps: 'room',
  r_scout_street: 'street', r_vehicle_wreck: 'street', r_pharmacy_trip: 'street', r_stray_survivor: 'street', r_water_hunt: 'street',
  r_rooftop_view: 'rooftop', r_night_watch: 'rooftop',
  event_horde_night: 'horde', event_supply_drop: 'supply', event_raider_ambush_bridge: 'bridge', milestone_2_bloodwolf_raiders: 'bridge',
  milestone_1_hospital: 'hospital', milestone_3_bunker13_distress: 'bunker', milestone_5_final_evacuation: 'tower',
  milestone_4_mutation_crisis: 'room', event_acid_rain_superstorm: 'storm', event_sewer_crawler_ambush: 'street',
  event_rescue_pharmacist: 'street', event_rescue_mechanic_shop: 'street',
};

const SKY: Record<WeatherType, [string, string]> = {
  clear: ['#2f2a33', '#8a5a3a'],
  heatwave: ['#4a2210', '#d9702a'],
  heavy_rain: ['#0f1c24', '#3a6a62'],
  freezing_cold: ['#1c2c40', '#8db0c4'],
  dense_fog: ['#2a3027', '#9aab7a'],
  night_dark: ['#05070f', '#3a1a3e'],
};

// Màu ánh lửa ở chân trời theo thời tiết
const GLOW: Record<WeatherType, string> = {
  clear: '#ff7a2a', heatwave: '#ffb040', heavy_rain: '#6fd6b0', freezing_cold: '#aee0ff', dense_fog: '#c4e070', night_dark: '#ff6a30',
};

// Đỉnh nhà gãy lởm chởm, một bên sụp thấp hơn
function ruinPath(x: number, base: number, w: number, h: number, seed: number) {
  const r = (n: number) => { const v = Math.sin((seed + 1) * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
  const steps = Math.max(3, Math.round(w / 7));
  let d = 'M' + x + ' ' + base;
  for (let i = 0; i <= steps; i++) {
    const px = x + (w * i) / steps;
    let top = base - h + r(i) * h * 0.2;
    if (seed % 2 === 0) top += (i / steps) * h * 0.3 * r(i + 9);
    if (r(i + 20) < 0.16) top += h * 0.18;
    d += ' L' + px.toFixed(1) + ' ' + top.toFixed(1);
  }
  return d + ' L' + (x + w) + ' ' + base + ' Z';
}

function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Props {
  sceneId?: string;
  weather: WeatherType;
  dangerLevel: number;
  blackout?: boolean;
}

export const SceneIllustration: React.FC<Props> = ({ sceneId = 'r_start', weather, dangerLevel, blackout }) => {
  const motif = MOTIF_BY_SCENE[sceneId] || 'room';
  const [top, bottom] = SKY[weather] || SKY.clear;
  const dark = weather === 'night_dark' || !!blackout;

  const art = useMemo(() => {
    const r = rng(sceneId + weather);
    const far: { x: number; w: number; h: number }[] = [];
    for (let x = -10; x < 330; x += 16 + r() * 18) far.push({ x, w: 16 + r() * 20, h: 26 + r() * 46 });
    const near: { x: number; w: number; h: number; lit: boolean[] }[] = [];
    for (let x = -14; x < 330; x += 28 + r() * 26) {
      near.push({ x, w: 26 + r() * 22, h: 44 + r() * 52, lit: Array.from({ length: 6 }, () => r() > 0.8) });
    }
    const rain = Array.from({ length: 34 }, () => ({ x: r() * 320, y: r() * 120, l: 10 + r() * 12 }));
    const stars = Array.from({ length: 26 }, () => ({ x: r() * 320, y: r() * 60, s: 0.4 + r() * 0.9 }));
    const crowd = Array.from({ length: 34 }, () => ({ x: r() * 320, y: 92 + r() * 22, s: 0.7 + r() * 0.7, lean: (r() - 0.5) * 10 }));
    return { far, near, rain, stars, crowd };
  }, [sceneId, weather]);

  const fogOpacity = weather === 'dense_fog' ? 0.5 : weather === 'freezing_cold' ? 0.28 : 0.12;
  const farFill = dark ? '#05070c' : '#10161e';
  const nearFill = dark ? '#030409' : '#0a0e14';

  const celestial =
    weather === 'heatwave' ? (
      <g>
        <circle cx="262" cy="26" r="34" fill="#f59e0b" opacity="0.18" />
        <circle cx="262" cy="26" r="14" fill="#fbbf24" opacity="0.85" />
      </g>
    ) : weather === 'night_dark' ? (
      <g>
        <circle cx="64" cy="26" r="11" fill="#dbe7ff" opacity="0.85" />
        <circle cx="69" cy="23" r="10" fill={top} />
        {art.stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#cfe0ff" opacity="0.7" />
        ))}
      </g>
    ) : (
      <circle cx="240" cy="30" r="12" fill="#9aa7b4" opacity="0.18" />
    );

  const foreground = (() => {
    switch (motif) {
      case 'room':
        // Khung cửa sổ nhìn ra thành phố, rèm rách hai bên
        return (
          <g>
            <rect x="0" y="0" width="320" height="120" fill="none" stroke="#05070a" strokeWidth="26" />
            <path d="M0 0H44L30 120H0Z" fill="#12100f" opacity="0.9" />
            <path d="M320 0H276L292 120H320Z" fill="#12100f" opacity="0.9" />
            <rect x="158" y="0" width="4" height="120" fill="#05070a" />
            <rect x="0" y="58" width="320" height="4" fill="#05070a" />
            <path d="M0 120V104H320V120Z" fill="#05070a" />
            <rect x="238" y="92" width="30" height="12" rx="2" fill="#1a1512" />
            <circle cx="253" cy="88" r="3.5" fill={dark ? '#f59e0b' : '#7c4a14'} opacity={dark ? 0.9 : 0.5} />
          </g>
        );
      case 'street':
        return (
          <g>
            <path d="M0 120V100Q160 92 320 100V120Z" fill="#06080b" />
            <rect x="0" y="100" width="320" height="2" fill="#1a222c" />
            {/* xe cháy */}
            <g transform="translate(184 80)">
              <path d="M0 26L6 10H34L44 4H74L84 14L98 18V26Z" fill="#0b0d10" stroke="#222a33" strokeWidth="1" />
              <circle cx="22" cy="27" r="7" fill="#05060a" stroke="#222a33" />
              <circle cx="74" cy="27" r="7" fill="#05060a" stroke="#222a33" />
              <path d="M40 8L46 3H70L76 8Z" fill="#14181e" />
            </g>
            <g transform="translate(40 96)">
              <rect x="0" y="0" width="3" height="22" fill="#1d252e" />
              <path d="M3 0H30L26 8H3Z" fill="#1d252e" />
            </g>
          </g>
        );
      case 'rooftop':
        return (
          <g>
            <path d="M0 120V92H320V120Z" fill="#06080b" />
            <rect x="0" y="92" width="320" height="3" fill="#1b232d" />
            <g stroke="#1e2833" strokeWidth="1.4" fill="none">
              <path d="M40 92V50M30 58H50M34 66H46M36 74H44" />
              <path d="M250 92V60M242 66H258M246 74H254" />
            </g>
            <rect x="120" y="76" width="44" height="16" fill="#0a0d12" stroke="#1e2833" />
            <circle cx="142" cy="72" r="7" fill="#0a0d12" stroke="#1e2833" />
          </g>
        );
      case 'horde':
        return (
          <g>
            <path d="M0 120V104Q160 96 320 104V120Z" fill="#05060a" />
            {art.crowd.map((c, i) => (
              <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`} fill="#07090d" stroke="#1a222b" strokeWidth="0.6">
                <circle cx={c.lean} cy="-18" r="3.2" />
                <path d={`M${c.lean - 3} -15L${c.lean + 3} -15L4 4H-4Z`} />
                <path d={`M${c.lean - 3} -13L${c.lean - 12} -6M${c.lean + 3} -13L${c.lean + 12} -7`} fill="none" />
              </g>
            ))}
            <rect x="0" y="0" width="320" height="120" fill="#7f1d1d" opacity="0.1" />
          </g>
        );
      case 'supply':
        return (
          <g>
            <path d="M0 120V100Q160 94 320 100V120Z" fill="#06080b" />
            <g transform="translate(150 18)">
              <path d="M-34 24Q0 -16 34 24Z" fill="#d6dde6" opacity="0.92" />
              <path d="M-34 24L-6 58M34 24L6 58M0 24V58" stroke="#a8b3bf" strokeWidth="0.9" />
              <path d="M-34 24Q-17 14 0 24Q17 14 34 24" fill="none" stroke="#9aa6b2" strokeWidth="0.8" />
              <rect x="-9" y="58" width="18" height="14" fill="#3b4a3a" stroke="#1e281e" />
              <rect x="-9" y="62" width="18" height="2" fill="#8aa07a" />
            </g>
          </g>
        );
      case 'bridge':
        return (
          <g>
            <path d="M0 62H320V72H0Z" fill="#07090d" />
            <g fill="#07090d">
              {[20, 90, 160, 230, 300].map((x) => (
                <rect key={x} x={x} y="72" width="8" height="48" />
              ))}
            </g>
            <path d="M0 62Q160 44 320 62" fill="none" stroke="#1d2631" strokeWidth="1.5" />
            {[56, 118, 190, 250].map((x, i) => (
              <g key={x} transform={`translate(${x} 56)`} fill="#05060a" stroke="#27313c" strokeWidth="0.6">
                <circle cx="0" cy="-9" r="2.8" />
                <rect x="-3" y="-6" width="6" height="12" />
                <path d={i % 2 ? 'M3 -3L12 -9' : 'M-3 -3L-12 -9'} fill="none" strokeWidth="1.2" />
              </g>
            ))}
            <path d="M0 120V104H320V120Z" fill="#05060a" />
          </g>
        );
      case 'hospital':
        return (
          <g>
            <path d="M0 120V102H320V120Z" fill="#05060a" />
            <rect x="96" y="30" width="128" height="76" fill="#0c1117" stroke="#202a35" />
            <rect x="148" y="38" width="24" height="24" fill="#12202a" />
            <path d="M158 42h4v7h7v4h-7v7h-4v-7h-7v-4h7z" fill="#b91c1c" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={106 + i * 18} y="72" width="9" height="12" fill={i === 2 || i === 4 ? '#f59e0b' : '#0a0e13'} opacity={i === 2 || i === 4 ? 0.7 : 1} />
            ))}
            <rect x="140" y="88" width="40" height="18" fill="#04060a" />
          </g>
        );
      case 'bunker':
        return (
          <g>
            <path d="M0 120V104H320V120Z" fill="#05060a" />
            <path d="M70 104Q160 28 250 104Z" fill="#0b1016" stroke="#222c37" strokeWidth="1.2" />
            <path d="M96 104Q160 52 224 104" fill="none" stroke="#1a232d" />
            <rect x="140" y="86" width="40" height="18" fill="#04060a" stroke="#2a3642" />
            {[10, 18, 26].map((r) => (
              <circle key={r} cx="160" cy="50" r={r} fill="none" stroke="#34d399" strokeWidth="0.7" opacity={0.55 - r * 0.012} />
            ))}
            <circle cx="160" cy="50" r="2.2" fill="#34d399" />
          </g>
        );
      case 'tower':
        return (
          <g>
            <path d="M0 120V104H320V120Z" fill="#05060a" />
            <path d="M138 104V22L160 6L182 22V104Z" fill="#0a0f15" stroke="#243040" />
            {[34, 46, 58, 70, 82, 94].map((y) => (
              <rect key={y} x="146" y={y} width="28" height="2.2" fill="#16202b" />
            ))}
            <g transform="translate(232 40)" fill="#0b0f14" stroke="#2d3946" strokeWidth="0.8">
              <ellipse cx="0" cy="0" rx="14" ry="5" />
              <path d="M-14 0H-30L-32 -2H-14M-18 -7H18" fill="none" />
              <path d="M10 -2L28 4" fill="none" />
            </g>
          </g>
        );
      case 'storm':
        return (
          <g>
            <path d="M0 120V100H320V120Z" fill="#04050a" />
            <path d="M0 108Q40 102 80 108T160 108T240 108T320 108V120H0Z" fill="#0f1b2a" opacity="0.8" />
            <path d="M0 114Q40 108 80 114T160 114T240 114T320 114V120H0Z" fill="#14263a" opacity="0.7" />
            <path d="M210 0L196 34H210L200 62" fill="none" stroke="#c7d7ff" strokeWidth="1.4" opacity="0.5" />
          </g>
        );
    }
  })();

  const showRain = weather === 'heavy_rain' || motif === 'storm';

  return (
    <svg
      viewBox="0 0 320 120"
      className="block h-36 w-full rounded-lg border border-neutral-800 sm:h-48"
      role="img"
      aria-label="Minh họa cảnh hiện tại"
      style={{ filter: 'sepia(0.32) saturate(0.8) contrast(1.06)' }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${sceneId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <linearGradient id={`fog-${sceneId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8c4d0" stopOpacity="0" />
          <stop offset="1" stopColor="#b8c4d0" stopOpacity={fogOpacity} />
        </linearGradient>
        <radialGradient id={`vig-${sceneId}`} cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>

      <rect width="320" height="120" fill={`url(#sky-${sceneId})`} />
      {celestial}

      {motif !== 'bunker' && motif !== 'hospital' && motif !== 'tower' && (
        <g fill={farFill} opacity="0.95">
          {art.far.map((b, i) => (
            <path key={i} d={ruinPath(b.x, 124, b.w, b.h + 20, i)} />
          ))}
        </g>
      )}
      {(motif === 'room' || motif === 'street' || motif === 'rooftop' || motif === 'horde' || motif === 'supply' || motif === 'storm') && (
        <g fill={nearFill}>
          {art.near.map((b, i) => (
            <g key={i}>
              <path d={ruinPath(b.x, 120, b.w, b.h + 12, i + 100)} />
              {!dark &&
                b.lit.map((on, j) =>
                  on ? <rect key={j} x={b.x + 5 + (j % 2) * 12} y={108 - b.h + 8 + Math.floor(j / 2) * 14} width="4" height="6" fill="#f59e0b" opacity="0.45" /> : null,
                )}
            </g>
          ))}
        </g>
      )}

      {/* Ánh lửa và khói đen ở chân trời: cảm giác thành phố vẫn đang cháy */}
      <g style={{ pointerEvents: 'none' }}>
        <ellipse cx="70" cy="96" rx="60" ry="22" fill={GLOW[weather]} opacity="0.16" />
        <ellipse cx="250" cy="100" rx="50" ry="18" fill={GLOW[weather]} opacity="0.12" />
        <path d="M66 96 C62 76 76 66 68 46 C64 32 74 22 70 8" stroke="#0a0808" strokeWidth="9" fill="none" opacity="0.32" strokeLinecap="round" />
        <path d="M252 100 C256 84 246 74 254 56 C258 44 250 34 254 24" stroke="#0a0808" strokeWidth="7" fill="none" opacity="0.26" strokeLinecap="round" />
      </g>
      <rect width="320" height="120" fill={`url(#fog-${sceneId})`} />
      {foreground}

      {showRain && (
        <g stroke="#a9c4e6" strokeWidth="0.7" opacity="0.4">
          {art.rain.map((d, i) => (
            <line key={i} x1={d.x} y1={d.y} x2={d.x - 3} y2={d.y + d.l} />
          ))}
        </g>
      )}

      {dangerLevel >= 3 && <rect width="320" height="120" fill="#7f1d1d" opacity={0.05 * (dangerLevel - 2)} />}
      <rect width="320" height="120" fill={`url(#vig-${sceneId})`} />
    </svg>
  );
};
