import React, { useMemo } from 'react';
import { NodeKind } from '../data/worldMap';

// Tranh phác từng địa điểm trên bản đồ (kiểu This War of Mine x Last Day on Earth): bóng công trình đặc trưng,
// ánh đèn vàng hiếm hoi, khói và sương chuyển động nhẹ, hạt giấy và nét than gạch chéo. Mỗi loại địa điểm một bố cục riêng.
interface Props { kind: NodeKind; danger: number; known: boolean; seed: string; variant?: string }

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

const INK = '#07080a';
const MID = '#12161b';
const EDGE = '#262e38';
const LAMP = '#e6a23c';

const Win: React.FC<{ x: number; y: number; w?: number; h?: number; lit?: boolean; i?: number }> = ({ x, y, w = 7, h = 9, lit, i = 0 }) => (
  <rect x={x} y={y} width={w} height={h} fill={lit ? LAMP : '#05070a'} opacity={lit ? 0.75 : 1} className={lit ? 'pi-lamp' : undefined} style={lit ? { animationDelay: `${(i % 5) * 0.7}s` } : undefined} />
);


// Mỗi cứ điểm ngẫu nhiên có một bản vẽ riêng, không dùng chung với địa điểm cùng loại.
function variantBuilding(rawVariant?: string): React.ReactNode | null {
  const variant = rawVariant ? rawVariant.replace(/^(dyn_[a-z]+)_\d+$/, '$1') : rawVariant;
  switch (variant) {
    case 'house':
      return (
        <g>
          <path d="M80 122V76L160 38L240 76V122Z" fill={MID} stroke={EDGE} />
          <rect x="146" y="92" width="28" height="30" fill="#05070a" /><path d="M146 92L174 122M174 92L146 122" stroke="#8a826c" strokeWidth="0.8" opacity="0.35" />
          <Win x={98} y={88} w={11} h={10} /><Win x={206} y={88} w={11} h={10} lit />
          <rect x="214" y="44" width="10" height="22" fill={INK} stroke={EDGE} />
          <g stroke="#2a3038">{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={i} x1={20 + i * 10} y1="122" x2={20 + i * 10} y2="106" />)}<line x1="20" y1="110" x2="100" y2="110" /></g>
        </g>
      );
    case 'dyn_crash':
      return (
        <g>
          <path d="M40 116L120 96L170 84L190 96L120 118Z" fill={MID} stroke={EDGE} />
          <path d="M170 84L230 70L270 92L196 100Z" fill={INK} stroke={EDGE} transform="rotate(6 200 90)" />
          <path d="M126 94L100 62L116 60L142 90Z" fill={INK} stroke={EDGE} />
          <path className="pi-smoke" d="M150 84C142 66 160 56 150 38C146 26 158 18 152 4" stroke="#0a0808" strokeWidth="11" fill="none" opacity="0.45" strokeLinecap="round" />
          <g fill="#c9c2b0" opacity="0.55"><path d="M232 108Q244 86 256 108Z" /><path d="M262 112Q272 94 282 112Z" /></g>
          <g fill={INK} stroke={EDGE}><rect x="58" y="104" width="14" height="12" /><rect x="86" y="108" width="12" height="10" /></g>
          <circle cx="150" cy="88" r="3" fill={LAMP} className="pi-lamp" />
        </g>
      );
    case 'dyn_truck':
      return (
        <g>
          <g transform="rotate(-8 160 100)"><rect x="60" y="72" width="130" height="40" fill={MID} stroke={EDGE} /><path d="M190 82H224L236 98V112H190Z" fill={INK} stroke={EDGE} /><rect x="198" y="86" width="18" height="12" fill="#05070a" /><circle cx="92" cy="114" r="9" fill="#05060a" stroke={EDGE} /><circle cx="210" cy="114" r="9" fill="#05060a" stroke={EDGE} /></g>
          <g fill={INK} stroke="#1a222b">{[40, 84, 252, 280].map((x, i) => <g key={x} transform={`translate(${x} ${112 + (i % 2) * 3})`}><circle cx="0" cy="-14" r="3" /><path d="M-3 -11L3 -11L5 2H-5Z" /><path d="M-3 -9L-11 -3M3 -9L11 -2" fill="none" /></g>)}</g>
          <g fill="#2c2820"><ellipse cx="150" cy="118" rx="20" ry="3" /></g>
          <circle cx="236" cy="96" r="2" fill={LAMP} className="pi-lamp" />
        </g>
      );
    case 'dyn_flood':
      return (
        <g>
          <path d="M0 92Q80 84 160 92T320 90V122H0Z" fill="#0c1218" />
          <path className="pi-wave" d="M-10 100Q60 94 120 100T250 100T340 98V122H-10Z" fill="#14202c" opacity="0.8" />
          {[[70, 86, 26], [150, 94, 30], [230, 88, 24]].map(([x, y, w], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${i * 8 - 6})`}><rect width={w} height="18" fill="#2a2218" stroke={EDGE} /><line x1="0" y1="9" x2={w} y2="9" stroke="#161008" /></g>)}
          <g stroke="#1c2a22" strokeWidth="1.4" fill="none">{[20, 34, 280, 296].map((x) => <path key={x} d={`M${x} 124Q${x - 4} 100 ${x + 2} 84`} />)}</g>
        </g>
      );
    case 'op_hospital_basement':
      return (
        <g>
          <rect x="40" y="52" width="240" height="14" fill={MID} stroke={EDGE} />
          <path d="M40 66H280V122H40Z" fill="#0a0c10" stroke={EDGE} />
          <rect x="108" y="66" width="104" height="56" fill="#030406" />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${108 + i * 8} ${66 + i * 8}H${212 - i * 8}`} stroke="#1b222a" strokeWidth="2" />)}
          <rect x="140" y="38" width="40" height="12" fill={INK} stroke={EDGE} /><text x="160" y="47" textAnchor="middle" fontSize="8" fill="#6b7a86">B1</text>
          <path d="M156 20h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#991b1b" opacity="0.7" transform="translate(0 -4) scale(0.9)" />
          <g stroke="#2a323c" strokeWidth="2" fill="none"><path d="M60 80H108M212 92H262M60 100V80M262 92V70" /></g>
          <line x1="160" y1="66" x2="160" y2="82" stroke="#3a4450" /><circle cx="160" cy="86" r="3" fill={LAMP} className="pi-lamp" />
          <g transform="translate(236 40)" fill={INK} stroke={EDGE}><rect width="22" height="12" /><circle cx="5" cy="13" r="2.4" /><circle cx="17" cy="13" r="2.4" /></g>
        </g>
      );
    case 'op_workshop':
      return (
        <g>
          <path d="M50 120V70L90 52V70L130 52V70L170 52V70L210 52V70L250 52V120Z" fill={MID} stroke={EDGE} />
          <rect x="108" y="82" width="72" height="38" fill="#05070a" stroke={EDGE} /><g stroke="#242b33">{[0, 1, 2, 3, 4].map((i) => <line key={i} x1="108" y1={86 + i * 7} x2="180" y2={86 + i * 7} />)}</g>
          <rect x="108" y="82" width="72" height="14" fill="#2a2f36" />
          <path d="M264 120V40H282L292 26" stroke="#2c3540" strokeWidth="3" fill="none" /><line x1="292" y1="26" x2="292" y2="46" stroke="#2c3540" /><path d="M288 46h8l-2 6h-4z" fill={INK} />
          <g transform="translate(66 96)" fill={INK} stroke={EDGE}><rect width="12" height="22" rx="2" /><rect x="16" y="4" width="12" height="18" rx="2" /></g>
          <g transform="translate(206 100)" fill="none" stroke="#3a4450"><circle r="9" /><circle cx="14" cy="6" r="6" /></g>
          <g transform="translate(40 108)" fill={INK} stroke={EDGE}><circle cx="8" cy="8" r="8" /><circle cx="24" cy="10" r="7" /></g>
        </g>
      );
    case 'op_farmhouse':
      return (
        <g>
          <path d="M70 122V74L130 40L190 74V122Z" fill={MID} stroke={EDGE} />
          <rect x="114" y="92" width="32" height="30" fill="#05070a" /><Win x={86} y={90} lit /><Win x={158} y={90} />
          <g transform="translate(224 84)"><rect x="-14" y="22" width="28" height="16" fill={INK} stroke={EDGE} /><path d="M-18 22L0 6L18 22Z" fill={INK} stroke={EDGE} /><line x1="-10" y1="22" x2="-10" y2="8" stroke="#2c3540" /><line x1="10" y1="22" x2="10" y2="8" stroke="#2c3540" /><line x1="0" y1="14" x2="0" y2="26" stroke="#3a4450" /></g>
          <g transform="translate(272 70)"><line x1="0" y1="52" x2="0" y2="4" stroke="#2c3540" strokeWidth="3" /><g className="pi-spin"><path d="M0 4L-4 -22M0 4L24 0M0 4L4 30M0 4L-26 8" stroke="#2c3540" strokeWidth="2.4" /></g></g>
          <g stroke="#1c2a22" strokeWidth="2.2">{[0, 1, 2, 3, 4].map((i) => <line key={i} x1="18" y1={96 + i * 5} x2="64" y2={96 + i * 5} />)}</g>
          <g stroke="#2a3038"><line x1="10" y1="122" x2="10" y2="100" /><line x1="30" y1="122" x2="30" y2="100" /></g>
        </g>
      );
    case 'op_hill_station':
      return (
        <g>
          <path d="M0 124Q80 70 160 78T320 66V124Z" fill="#0b0e12" stroke={EDGE} />
          <g transform="translate(180 8)" stroke="#2c3540" strokeWidth="1.6" fill="none"><path d="M0 74L10 0L20 74M3 56H17M5 40H15M7 24H13" /><path d="M10 0V-8" /><ellipse cx="22" cy="22" rx="9" ry="5" transform="rotate(-25 22 22)" /></g>
          <circle cx="190" cy="0" r="2.4" fill="#b91c1c" className="pi-lamp" />
          <g transform="translate(104 78)"><rect width="34" height="20" fill={MID} stroke={EDGE} /><Win x={22} y={6} w={8} h={8} lit /></g>
          <path d="M20 110Q60 98 100 106" stroke="#2c3540" fill="none" />
        </g>
      );
    case 'op_school':
      return (
        <g>
          <rect x="60" y="56" width="200" height="64" fill={MID} stroke={EDGE} />
          <rect x="126" y="40" width="68" height="18" fill={INK} stroke={EDGE} />
          <g transform="translate(206 20)"><rect x="0" y="12" width="34" height="22" rx="3" fill={INK} stroke={EDGE} /><path d="M4 34V44M30 34V44" stroke="#2c3540" strokeWidth="2" /><path d="M2 14H32" stroke="#3a4450" /></g>
          <line x1="76" y1="14" x2="76" y2="60" stroke="#3a4450" /><path d="M76 14h18l-5 6 5 6H76z" fill="#2a1a1a" />
          {[0, 1, 2, 3, 4, 5, 6].map((c) => [0, 1].map((r) => <Win key={`${c}${r}`} x={72 + c * 26} y={64 + r * 22} w={13} h={10} lit={(c + r * 3) % 9 === 4} i={c} />))}
          <g fill={INK} stroke={EDGE}><circle cx="28" cy="104" r="4" /><path d="M24 108H32V120H24Z" /><circle cx="292" cy="106" r="4" /><path d="M288 110H296V120H288Z" /></g>
        </g>
      );
    case 'op_old_church':
      return (
        <g>
          <rect x="70" y="70" width="180" height="50" fill={MID} stroke={EDGE} />
          <rect x="144" y="20" width="32" height="54" fill={MID} stroke={EDGE} />
          <path d="M140 20L160 2L180 20Z" fill={INK} stroke={EDGE} /><path d="M160 -10v14M155 -4h10" stroke="#3a4450" strokeWidth="1.4" />
          <g className="pi-sway"><path d="M154 40V30Q160 22 166 30V40Z" fill="#05070a" /><circle cx="160" cy="38" r="3" fill={LAMP} opacity="0.6" className="pi-lamp" /></g>
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${84 + i * 38} 106V92Q${93 + i * 38} 84 ${102 + i * 38} 92V106Z`} fill="#0a0d12" stroke={EDGE} />)}
          <path d="M148 120V104Q160 94 172 104V120Z" fill="#05070a" />
          <g fill={INK}><circle cx="40" cy="108" r="14" /><rect x="38" y="112" width="4" height="10" /></g>
        </g>
      );
    case 'op_cold_storage':
      return (
        <g>
          <rect x="44" y="56" width="232" height="64" fill={MID} stroke={EDGE} />
          <g stroke="#2c3540" fill="none"><path d="M70 56V36H98V56M120 56V28H150V56M176 56V40H200V56" /><circle cx="84" cy="46" r="5" /><circle cx="135" cy="40" r="7" /><circle cx="188" cy="48" r="4" /></g>
          <path className="pi-smoke" d="M135 28C130 18 140 14 135 4" stroke="#c4cdd6" strokeWidth="5" fill="none" opacity="0.22" strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={72 + i * 54} y="84" width="40" height="36" fill="#1c232b" stroke={EDGE} />)}
          <g transform="translate(250 96)" fill={INK} stroke={EDGE}><rect width="40" height="22" /><rect x="40" y="8" width="14" height="14" /><circle cx="10" cy="24" r="4" /><circle cx="44" cy="24" r="4" /></g>
        </g>
      );
    case 'op_fuel_station':
      return (
        <g>
          <rect x="52" y="40" width="216" height="9" fill={INK} stroke={EDGE} />
          <rect x="74" y="49" width="7" height="62" fill={MID} /><rect x="239" y="49" width="7" height="62" fill={MID} />
          {[0, 1, 2].map((i) => <g key={i} transform={`translate(${110 + i * 46} 74)`}><rect width="16" height="36" fill="#1c232b" stroke={EDGE} /><rect x="3" y="4" width="10" height="8" fill="#05070a" /></g>)}
          <g transform="translate(258 70)" stroke="#2c3540"><line x1="0" y1="50" x2="0" y2="0" strokeWidth="2.4" /><rect x="-14" y="-14" width="28" height="16" fill="#1a1f25" /><text x="0" y="-2" textAnchor="middle" fontSize="8" fill="#6b7a86">24h</text></g>
          <g transform="translate(40 90)" fill={INK} stroke={EDGE}><path d="M0 22L6 8H34L44 14V22Z" /><circle cx="10" cy="23" r="3.5" /><circle cx="32" cy="23" r="3.5" /></g>
          <path d="M0 122V114H320V122Z" fill={INK} />
        </g>
      );
    default:
      return null;
  }
}

function building(kind: NodeKind): React.ReactNode {
  switch (kind) {
    case 'pharmacy':
      return (
        <g>
          <rect x="90" y="62" width="140" height="58" fill={MID} stroke={EDGE} />
          <rect x="84" y="56" width="152" height="8" fill={INK} />
          <path d="M150 20h20v20h20v20h-20v20h-20v-20h-20v-20h20z" fill="#14532d" opacity="0.8" transform="translate(-10 -4) scale(0.8)" />
          <rect x="104" y="78" width="46" height="30" fill="#05070a" stroke={EDGE} />
          <path d="M104 78L150 108M150 78L104 108" stroke="#8a826c" strokeWidth="0.8" opacity="0.4" />
          <rect x="170" y="82" width="44" height="38" fill="#05070a" />
          <rect x="170" y="94" width="44" height="26" fill="#2a2f36" />
          <Win x={188} y={70} w={8} h={8} lit />
        </g>
      );
    case 'hospital':
      return (
        <g>
          <rect x="70" y="30" width="180" height="90" fill={MID} stroke={EDGE} />
          <rect x="132" y="14" width="56" height="20" fill={INK} stroke={EDGE} />
          <path d="M156 18h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#991b1b" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => [0, 1, 2].map((r) => <Win key={`${c}${r}`} x={80 + c * 21} y={42 + r * 22} lit={(c * 3 + r) % 7 === 2} i={c + r} />))}
          <rect x="144" y="96" width="32" height="24" fill="#05070a" />
          <g transform="translate(212 104)" fill={INK} stroke={EDGE}><path d="M0 14L4 4H30L38 8V14Z" /><circle cx="9" cy="15" r="3.5" /><circle cx="30" cy="15" r="3.5" /></g>
        </g>
      );
    case 'market':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${52 + i * 56} 70)`}>
              <path d="M0 0L22 -14L44 0Z" fill={i % 2 ? '#3a2d2d' : '#2c3036'} stroke={EDGE} />
              <rect x="3" y="0" width="2" height="38" fill={INK} /><rect x="39" y="0" width="2" height="38" fill={INK} />
              <rect x="6" y="26" width="32" height="12" fill={INK} stroke={EDGE} />
              <rect x="10" y="20" width="8" height="6" fill="#3d3326" /><rect x="22" y="22" width="9" height="4" fill="#33281d" />
            </g>
          ))}
          <path d="M40 120V112H280V120Z" fill={INK} />
        </g>
      );
    case 'supermarket':
      return (
        <g>
          <rect x="50" y="52" width="220" height="68" fill={MID} stroke={EDGE} />
          <rect x="50" y="46" width="220" height="8" fill={INK} />
          <rect x="82" y="62" width="70" height="10" fill="#1a1f25" stroke={EDGE} />
          <rect x="160" y="78" width="80" height="42" fill="#2a2f36" />
          {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1="160" y1={82 + i * 7} x2="240" y2={82 + i * 7} stroke={INK} strokeWidth="1" />)}
          <g transform="translate(96 100)" stroke="#2c3540" fill="none"><path d="M0 0h18l-3 12h-12z M3 14a2 2 0 1 0 .1 0 M14 14a2 2 0 1 0 .1 0" /></g>
          <Win x={64} y={76} w={10} h={8} lit />
        </g>
      );
    case 'hardware_store':
      return (
        <g>
          <rect x="80" y="64" width="160" height="56" fill={MID} stroke={EDGE} />
          <path d="M72 64H248L240 50H80Z" fill={INK} stroke={EDGE} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={86 + i * 19.5} y="52" width="9" height="11" fill={i % 2 ? '#3d2a2a' : '#262b31'} />)}
          <rect x="96" y="78" width="54" height="30" fill="#05070a" stroke={EDGE} />
          <rect x="166" y="74" width="56" height="46" fill="#2a2f36" />
          <g stroke="#3a4450" strokeWidth="2"><line x1="236" y1="80" x2="236" y2="120" /><line x1="244" y1="86" x2="244" y2="120" /><line x1="252" y1="92" x2="252" y2="120" /></g>
          <Win x={104} y={84} w={10} h={8} lit />
        </g>
      );
    case 'police_station':
      return (
        <g>
          <rect x="84" y="48" width="152" height="72" fill={MID} stroke={EDGE} />
          <rect x="100" y="36" width="120" height="14" fill={INK} stroke={EDGE} />
          <line x1="236" y1="20" x2="236" y2="62" stroke="#3a4450" /><path d="M236 20h20l-5 6 5 6h-20z" fill="#2a1a1a" />
          <circle cx="160" cy="43" r="6" fill="#1a2430" /><circle cx="160" cy="43" r="2" fill="#b91c1c" className="pi-lamp" />
          {[0, 1, 2, 3, 4].map((i) => <Win key={i} x={96 + i * 28} y={66} lit={i === 3} i={i} />)}
          <g fill="#2c2820">{[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={74 + i * 26} cy="116" rx="12" ry="6" />)}</g>
        </g>
      );
    case 'bridge':
      return (
        <g>
          <path d="M0 58H320V68H0Z" fill={INK} stroke={EDGE} />
          {[24, 96, 168, 240, 312].map((x) => <rect key={x} x={x} y="68" width="9" height="52" fill={MID} />)}
          <path d="M0 58Q160 30 320 58" fill="none" stroke="#2c3540" strokeWidth="1.4" />
          {[30, 80, 130, 190, 250].map((x, i) => <g key={x} transform={`translate(${x} ${i % 2 ? 50 : 48})`} fill={INK} stroke={EDGE}><path d="M0 8L4 0H20L26 4V8Z" /><circle cx="6" cy="8" r="2.4" /><circle cx="20" cy="8" r="2.4" /></g>)}
          <path d="M0 120V104Q80 100 160 106T320 104V120Z" fill="#0c1218" />
        </g>
      );
    case 'industrial':
      return (
        <g>
          <rect x="60" y="64" width="190" height="56" fill={MID} stroke={EDGE} />
          <path d="M60 64L90 48L120 64L150 48L180 64L210 48L240 64Z" fill={INK} stroke={EDGE} />
          <rect x="232" y="14" width="14" height="60" fill={INK} stroke={EDGE} /><rect x="254" y="26" width="12" height="48" fill={INK} stroke={EDGE} />
          <path className="pi-smoke" d="M239 14C233 4 245 -2 238 -14" stroke="#0a0808" strokeWidth="9" fill="none" opacity="0.4" strokeLinecap="round" />
          <path className="pi-smoke" style={{ animationDelay: '-4s' }} d="M260 26C256 16 266 10 260 0" stroke="#0a0808" strokeWidth="7" fill="none" opacity="0.35" strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => <Win key={i} x={76 + i * 40} y={86} w={18} h={10} lit={i === 1} i={i} />)}
        </g>
      );
    case 'stadium':
      return (
        <g>
          <path d="M20 96Q160 40 300 96V120H20Z" fill={MID} stroke={EDGE} />
          <path d="M44 98Q160 56 276 98" fill="none" stroke="#202830" strokeWidth="3" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={i} x1={44 + i * 29} y1="98" x2={44 + i * 29} y2={78 + Math.abs(4 - i) * 3.5} stroke="#1a2028" />)}
          <g stroke="#2c3540"><line x1="40" y1="94" x2="40" y2="38" /><line x1="280" y1="94" x2="280" y2="38" /></g>
          <rect x="30" y="32" width="20" height="8" fill={INK} /><rect x="270" y="32" width="20" height="8" fill={INK} />
          <circle cx="40" cy="36" r="2" fill={LAMP} className="pi-lamp" />
        </g>
      );
    case 'tower':
    case 'home':
      return (
        <g>
          <rect x="120" y="14" width="80" height="106" fill={MID} stroke={EDGE} />
          <path d="M140 14L160 0L180 14Z" fill={INK} /><line x1="160" y1="0" x2="160" y2="-16" stroke="#3a4450" />
          {[0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2].map((c) => <Win key={`${r}${c}`} x={128 + c * 24} y={22 + r * 14} w={12} h={7} lit={(r * 3 + c) % 8 === 3} i={r + c} />))}
          <rect x="60" y="64" width="50" height="56" fill={INK} stroke={EDGE} /><rect x="214" y="48" width="44" height="72" fill={INK} stroke={EDGE} />
        </g>
      );
    case 'depot':
      return (
        <g>
          <path d="M70 120V70Q160 22 250 70V120Z" fill={MID} stroke={EDGE} />
          <rect x="130" y="84" width="60" height="36" fill="#05070a" stroke={EDGE} />
          <g stroke="#262e38" strokeWidth="0.9" fill="none">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <path key={i} d={`M${30 + i * 26} 106l8 -10l8 10l8 -10`} />)}</g>
          <g stroke="#2c3540"><line x1="30" y1="120" x2="30" y2="96" /><line x1="290" y1="120" x2="290" y2="96" /></g>
        </g>
      );
    case 'farm':
      return (
        <g>
          <path d="M96 72L160 36L224 72V120H96Z" fill={MID} stroke={EDGE} />
          <rect x="146" y="90" width="28" height="30" fill="#05070a" />
          <Win x={110} y={84} lit /><Win x={196} y={84} />
          <g stroke="#2a3038">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={20 + i * 12} y1="120" x2={20 + i * 12} y2="104" />)}<line x1="20" y1="108" x2="116" y2="108" /></g>
          <g fill={INK}><circle cx="266" cy="70" r="22" /><rect x="263" y="82" width="6" height="38" /></g>
        </g>
      );
    case 'church':
      return (
        <g>
          <rect x="92" y="64" width="136" height="56" fill={MID} stroke={EDGE} />
          <rect x="140" y="26" width="40" height="42" fill={MID} stroke={EDGE} />
          <path d="M136 26L160 6L184 26Z" fill={INK} stroke={EDGE} /><path d="M160 -6v14M154 0h12" stroke="#3a4450" strokeWidth="1.4" />
          <path d="M150 62V46Q160 36 170 46V62Z" fill="#05070a" /><circle cx="160" cy="76" r="6" fill="#1a2430" /><circle cx="160" cy="76" r="2.6" fill={LAMP} className="pi-lamp" />
          <path d="M148 120V98Q160 88 172 98V120Z" fill="#05070a" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${104 + i * 14} 100V90Q${110 + i * 14} 84 ${116 + i * 14} 90V100Z`} fill="#0a0d12" />)}
        </g>
      );
    case 'coldstorage':
      return (
        <g>
          <rect x="56" y="58" width="208" height="62" fill={MID} stroke={EDGE} />
          <rect x="56" y="52" width="208" height="8" fill={INK} />
          <g stroke="#2c3540" fill="none"><path d="M80 52V36H104V52M140 52V30H170V52" /><circle cx="92" cy="44" r="6" /><circle cx="155" cy="40" r="8" /></g>
          {[0, 1, 2].map((i) => <rect key={i} x={196 + i * 20} y="84" width="16" height="36" fill="#1c232b" stroke={EDGE} />)}
          <path className="pi-smoke" d="M92 36C88 26 98 22 92 12" stroke="#c4cdd6" strokeWidth="5" fill="none" opacity="0.2" strokeLinecap="round" />
        </g>
      );
    case 'school':
      return (
        <g>
          <rect x="60" y="56" width="200" height="64" fill={MID} stroke={EDGE} />
          <rect x="130" y="40" width="60" height="18" fill={INK} stroke={EDGE} />
          <line x1="250" y1="16" x2="250" y2="68" stroke="#3a4450" /><path d="M250 16h16l-4 5 4 5h-16z" fill="#2a1a1a" />
          {[0, 1, 2, 3, 4, 5, 6].map((c) => [0, 1].map((r) => <Win key={`${c}${r}`} x={72 + c * 26} y={64 + r * 22} w={13} h={10} lit={(c + r * 3) % 9 === 4} i={c} />))}
          <path d="M0 120V112H320V120Z" fill={INK} />
        </g>
      );
    case 'fuel_station':
      return (
        <g>
          <rect x="58" y="44" width="204" height="9" fill={INK} stroke={EDGE} />
          <rect x="82" y="53" width="7" height="58" fill={MID} /><rect x="231" y="53" width="7" height="58" fill={MID} />
          {[0, 1].map((i) => <g key={i} transform={`translate(${126 + i * 64} 76)`}><rect width="16" height="34" fill="#1c232b" stroke={EDGE} /><rect x="3" y="4" width="10" height="8" fill="#05070a" /><path d="M16 12h6l3 8v10" stroke="#2c3540" fill="none" /></g>)}
          <rect x="190" y="26" width="52" height="16" fill="#1a1f25" stroke={EDGE} /><rect x="196" y="31" width="28" height="3" fill={LAMP} opacity="0.5" className="pi-lamp" />
          <path d="M0 120V112H320V120Z" fill={INK} />
        </g>
      );
    default:
      return <rect x="100" y="60" width="120" height="60" fill={MID} stroke={EDGE} />;
  }
}

export const PlaceIllustration: React.FC<Props> = ({ kind, danger, known, seed, variant }) => {
  const art = useMemo(() => {
    const r = rng(seed + kind);
    const far: { x: number; w: number; h: number }[] = [];
    for (let x = -10; x < 330; x += 18 + r() * 20) far.push({ x, w: 16 + r() * 22, h: 22 + r() * 40 });
    const wire = Array.from({ length: 3 }, () => ({ y: 30 + r() * 20, sag: 4 + r() * 8 }));
    return { far, wire };
  }, [seed, kind]);
  const id = `pi-${seed}`;
  const tint = danger >= 4 ? '#7f1d1d' : danger === 3 ? '#78350f' : '#14532d';

  return (
    <svg viewBox="0 0 320 130" className="block h-36 w-full rounded-lg border border-neutral-800 sm:h-40" role="img" aria-label="Phác họa địa điểm" preserveAspectRatio="xMidYMid slice" style={{ background: '#0b0a09' }}>
      <style>{`
        .pi-lamp{animation:pi-flick 3.2s linear infinite}
        @keyframes pi-flick{0%,100%{opacity:.8}15%{opacity:.35}30%{opacity:.9}55%{opacity:.5}75%{opacity:.85}}
        .pi-smoke{animation:pi-drift 12s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
        @keyframes pi-drift{0%,100%{transform:translateX(0) scaleX(1)}50%{transform:translateX(6px) scaleX(1.12)}}
        .pi-spin{animation:pi-rot 14s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
        @keyframes pi-rot{to{transform:rotate(360deg)}}
        .pi-sway{animation:pi-swing 5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 0}
        @keyframes pi-swing{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
        .pi-wave{animation:pi-wv 5s ease-in-out infinite alternate}
        @keyframes pi-wv{from{transform:translateX(-6px)}to{transform:translateX(6px)}}
        .pi-fog{animation:pi-fogmove 30s ease-in-out infinite alternate}
        @keyframes pi-fogmove{from{transform:translateX(-40px)}to{transform:translateX(40px)}}
        @media (prefers-reduced-motion: reduce){.pi-lamp,.pi-smoke,.pi-fog,.pi-spin,.pi-sway{animation:none}}
      `}</style>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1014" /><stop offset="1" stopColor="#3a2d22" /></linearGradient>
        <linearGradient id={`${id}-fog`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8c4d0" stopOpacity="0" /><stop offset="1" stopColor="#b8c4d0" stopOpacity="0.35" /></linearGradient>
        <filter id={`${id}-wob`} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="2" seed="5" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="d" type="saturate" values="0.16" />
        </filter>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0 0.03  0 0 0 0.9 -0.3" />
        </filter>
        <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><line x1="0" y1="0" x2="0" y2="5" stroke="#000" strokeWidth="0.7" opacity="0.5" /></pattern>
        <radialGradient id={`${id}-vig`} cx="50%" cy="55%" r="75%"><stop offset="50%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.7" /></radialGradient>
      </defs>

      <g filter={`url(#${id}-wob)`}>
        <rect width="320" height="130" fill={`url(#${id}-sky)`} />
        <circle cx="262" cy="26" r="9" fill="#c9c2b0" opacity="0.28" />
        <g fill="#0b0e12" opacity="0.95">
          {art.far.map((b, i) => (
            <path key={i} d={`M${b.x} 124 L${b.x} ${124 - b.h} L${b.x + b.w * 0.3} ${124 - b.h - 5} L${b.x + b.w * 0.6} ${124 - b.h + 3} L${b.x + b.w} ${124 - b.h} L${b.x + b.w} 124Z`} />
          ))}
        </g>
        <path d="M0 126V114H320V126Z" fill="#050608" />
        {known ? <g transform="translate(0 6)">{variantBuilding(variant) ?? building(kind)}</g> : <g opacity="0.45" transform="translate(0 6)"><rect x="110" y="50" width="100" height="70" fill="#0b0e12" /><text x="160" y="96" textAnchor="middle" fontSize="34" fill="#3a4450">?</text></g>}
        <g className="pi-fog"><rect x="-60" width="440" height="130" fill={`url(#${id}-fog)`} /></g>
      </g>

      <rect width="320" height="130" fill={`url(#${id}-hatch)`} opacity="0.16" style={{ mixBlendMode: 'multiply' }} />
      <rect width="320" height="130" filter={`url(#${id}-grain)`} opacity="0.6" style={{ mixBlendMode: 'multiply' }} />
      <rect width="320" height="130" fill={tint} opacity={0.05 + danger * 0.02} />
      <rect width="320" height="130" fill={`url(#${id}-vig)`} />
      <rect x="1" y="1" width="318" height="128" fill="none" stroke="#000" strokeWidth="2" opacity="0.55" />
    </svg>
  );
};
