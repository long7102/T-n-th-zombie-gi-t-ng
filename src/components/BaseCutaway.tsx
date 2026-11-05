import React from 'react';
import { BaseCamp, Companion } from '../types/game';
import { Vehicle, VEHICLES } from '../data/vehicles';

// ====================================================================
// MẶT CẮT CĂN CỨ (lấy cảm hứng từ This War of Mine): nhìn ngang xuyên qua căn nhà đổ nát,
// từng phòng là một công trình, người sống sót đứng đúng chỗ việc được giao,
// ánh nến vàng ấm giữa tông xám nâu cháy xém. Tường vỡ, cửa đóng ván theo độ kiên cố.
// ====================================================================

interface Props {
  base: BaseCamp;
  companions: Companion[];
  loopStatus: Record<string, 'ok' | 'starved' | 'off'>;
  vehicle: Vehicle | null;
}

const lv = (b: BaseCamp, id: string) => b.modules?.[id] || (id === 'stove' && b.facilities.hasStove ? 1 : 0);

interface RoomSpec { id: string; x: number; y: number; w: number; h: number; label: string; icon: string; module?: string; always?: boolean }

export const BaseCutaway: React.FC<Props> = ({ base, companions, loopStatus, vehicle }) => {
  const powered = base.facilities.hasGeneratorAndFridge;
  const planks = Math.min(10, Math.round(base.fortification / 10));

  const rooms: RoomSpec[] = [
    { id: 'roof_a', x: 60, y: 26, w: 90, h: 34, label: 'Hứng nước', icon: '🪣', module: 'rain_collector' },
    { id: 'roof_b', x: 150, y: 26, w: 90, h: 34, label: 'Vườn rau', icon: '🥬', module: 'garden' },
    { id: 'f2_a', x: 60, y: 66, w: 100, h: 44, label: 'Phòng ngủ', icon: '🛏️', always: true },
    { id: 'f2_b', x: 160, y: 66, w: 100, h: 44, label: 'Bếp & lọc nước', icon: '🔥', module: 'stove' },
    { id: 'f1_a', x: 60, y: 114, w: 100, h: 44, label: 'Xưởng & điện', icon: '⚡', module: 'generator' },
    { id: 'f1_b', x: 160, y: 114, w: 100, h: 44, label: 'Chuồng gà & kho', icon: '🐔', module: 'coop' },
    { id: 'b_a', x: 60, y: 162, w: 100, h: 28, label: 'Biogas', icon: '♻️', module: 'biogas' },
    { id: 'b_b', x: 160, y: 162, w: 100, h: 28, label: 'Góc y tế', icon: '🩺', module: 'medbay' },
  ];

  // Vị trí đứng cho từng vai trò
  const spot: Record<string, string> = { guard: 'roof_b', cook: 'f2_b', scout: 'f1_a', repair: 'f1_a', medic: 'b_b', forage: 'roof_a', rest: 'f2_a' };
  const placed: Record<string, number> = {};
  const figures = [
    { key: 'me', room: 'f2_a', label: 'Bạn', tone: '#e7d9b8' },
    ...companions.filter((c) => c.status !== 'deceased').map((c) => ({ key: c.id, room: spot[(c.assignments && c.assignments[0]) || c.assignment || ''] || 'f2_a', label: c.name.replace(/\(.*\)/, '').trim().slice(0, 10), tone: '#c9b78f' })),
  ].map((f) => {
    const r = rooms.find((x) => x.id === f.room)!;
    const n = (placed[f.room] = (placed[f.room] || 0) + 1);
    return { ...f, x: r.x + 14 + n * 18, y: r.y + r.h - 4 };
  });

  const statusOf = (r: RoomSpec): 'ok' | 'starved' | 'off' | 'unbuilt' => {
    if (r.always) return 'ok';
    const built = r.module ? lv(base, r.module) > 0 || (r.module === 'coop' && lv(base, 'coop') > 0) : false;
    if (!built) return 'unbuilt';
    const mods = r.module === 'stove' ? ['stove', 'purifier'] : r.module === 'generator' ? ['generator'] : [r.module!];
    if (mods.some((m) => loopStatus[m] === 'starved')) return 'starved';
    return 'ok';
  };

  return (
    <svg viewBox="0 0 320 210" className="block h-auto w-full rounded-lg border border-neutral-800" role="img" aria-label="Mặt cắt căn cứ">
      <defs>
        <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2620" />
          <stop offset="1" stopColor="#5a4632" />
        </linearGradient>
        <radialGradient id="bc-candle" cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#ffb44a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb44a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bc-bulb" cx="50%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fff0b0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff0b0" stopOpacity="0" />
        </radialGradient>
        <pattern id="bc-brick" width="12" height="6" patternUnits="userSpaceOnUse">
          <rect width="12" height="6" fill="#2a231c" />
          <path d="M0 0H12M0 3H12M6 0V3M0 3V6" stroke="#18130f" strokeWidth="0.5" fill="none" />
        </pattern>
        <filter id="bc-rough"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" /></filter>
      </defs>

      <rect width="320" height="210" fill="url(#bc-sky)" />
      {/* khói xa */}
      <path d="M268 170 C262 140 280 120 270 90 C266 70 280 50 276 20" stroke="#14100c" strokeWidth="10" fill="none" opacity="0.35" strokeLinecap="round" />
      {/* nhà bên cạnh đổ nát */}
      <path d="M262 170 L262 70 L282 60 L292 90 L320 84 L320 170 Z" fill="#17120e" />
      <path d="M0 170 L0 96 L22 88 L30 110 L50 104 L50 170 Z" fill="#17120e" />

      {/* thân nhà cắt ngang */}
      <g filter="url(#bc-rough)">
        <rect x="52" y="20" width="216" height="172" fill="url(#bc-brick)" stroke="#0e0a07" strokeWidth="2" />
        {/* mảng tường vỡ phía trái */}
        <path d="M52 20 L52 70 L64 62 L60 100 L52 108 Z" fill="#5a4632" opacity="0.8" />
      </g>

      {rooms.map((r) => {
        const st = statusOf(r);
        const lit = st === 'ok';
        return (
          <g key={r.id}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={st === 'unbuilt' ? '#14100c' : '#241c14'} stroke="#0e0a07" strokeWidth="1.2" strokeDasharray={st === 'unbuilt' ? '3 3' : undefined} />
            {lit && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={powered && r.module !== 'rain_collector' && r.module !== 'garden' ? 'url(#bc-bulb)' : 'url(#bc-candle)'} />}
            {st === 'starved' && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#7f1d1d" opacity="0.28" />}
            <text x={r.x + 6} y={r.y + 12} fontSize="7" fill={st === 'unbuilt' ? '#5d5140' : '#d9c8a0'} opacity={st === 'unbuilt' ? 0.8 : 1} style={{ fontFamily: 'serif' }}>
              {st === 'unbuilt' ? r.label + ' (chưa xây)' : r.label}
            </text>
            <text x={r.x + r.w - 20} y={r.y + 16} fontSize="12" opacity={st === 'unbuilt' ? 0.25 : 0.95}>{r.icon}</text>
            {st === 'starved' && <text x={r.x + 6} y={r.y + r.h - 4} fontSize="6" fill="#fca5a5">THIẾU ĐẦU VÀO</text>}
          </g>
        );
      })}

      {/* người sống sót: bóng đứng ở chỗ làm việc */}
      {figures.map((f) => (
        <g key={f.key} transform={`translate(${f.x} ${f.y})`}>
          <ellipse cx="0" cy="1" rx="4" ry="1.2" fill="#000" opacity="0.5" />
          <rect x="-2.6" y="-11" width="5.2" height="9" rx="1.5" fill={f.tone} />
          <circle cx="0" cy="-14" r="2.8" fill={f.tone} />
          <text x="0" y="-19" fontSize="4.4" textAnchor="middle" fill="#e7d9b8" style={{ fontFamily: 'serif' }}>{f.label}</text>
        </g>
      ))}

      {/* ván đóng chắn theo độ kiên cố */}
      {Array.from({ length: planks }).map((_, i) => (
        <g key={i} stroke="#6b5438" strokeWidth="2.2" opacity="0.95">
          <line x1={252} y1={26 + i * 16} x2={270} y2={34 + i * 16} />
          <line x1={252} y1={34 + i * 16} x2={270} y2={26 + i * 16} />
        </g>
      ))}
      <text x="258" y="14" fontSize="6" fill="#bfae86" style={{ fontFamily: 'serif' }}>Kiên cố {base.fortification}%</text>

      {/* tháp canh trên mái */}
      {lv(base, 'watchtower') > 0 && (
        <g stroke="#1a130d" strokeWidth="2" fill="none">
          <path d="M236 26 L236 8 M228 26 L244 26 M232 8 H240" />
          <text x="226" y="6" fontSize="9" fill="#e7d9b8">🔔</text>
        </g>
      )}

      {/* mặt đất + xe */}
      <rect x="0" y="190" width="320" height="20" fill="#0d0a07" />
      <path d="M0 190 H320" stroke="#3a2f22" strokeWidth="1.5" />
      {vehicle && <text x="276" y="204" fontSize="14">{VEHICLES[vehicle.kind].icon}</text>}
      <text x="8" y="204" fontSize="6.5" fill="#8a7a5c" style={{ fontFamily: 'serif' }}>{base.name}</text>
      {/* nhiễu giấy ố */}
      <rect width="320" height="210" fill="#000" opacity="0.18" />
    </svg>
  );
};
