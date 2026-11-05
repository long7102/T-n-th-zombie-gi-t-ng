import React, { useMemo, useState } from 'react';
import { Navigation, Clock, ShieldAlert, X, Footprints, Eye, Lock } from 'lucide-react';
import { WeatherType } from '../types/game';
import { HOME_NODE_ID, KIND_ICON, NODE_BY_ID, REGION_LABEL, RING_RX, RING_Y_RATIO, WORLD_NODES, WorldNode, baseInfoOf, knownNodes, revealedNodes, shortestPath } from '../data/worldMap';
import { sound } from '../utils/audio';
import { PlaceIllustration } from './PlaceIllustration';
import { Vehicle, VEHICLES, fuelNeededRoundTrip } from '../data/vehicles';

interface DynamicMapModalProps {
  visitedNodes: string[];
  visitCounts: Record<string, number>;
  weather: WeatherType;
  stamina: number;
  homeName: string;
  extraNodes: WorldNode[];           // cứ điểm ngẫu nhiên của ván này
  baseNodeId?: string;               // cứ điểm đang dùng làm căn cứ
  hasBase: boolean;
  onClaimBase?: (node: WorldNode) => void;
  vehicle: Vehicle | null;
  crewAvailable: number;
  onTravel: (node: WorldNode, lootStyle: 'quick' | 'thorough', hops: number, opts: { useVehicle: boolean; crew: number }) => void;
  onClose: () => void;
}

const dangerColor = (d: number) => (d <= 2 ? '#34d399' : d === 3 ? '#fbbf24' : d === 4 ? '#fb923c' : '#f87171');
const RING: { r: number; label: string }[] = [
  { r: RING_RX.near, label: 'VÙNG GẦN' },
  { r: RING_RX.mid, label: 'VÙNG TRUNG' },
  { r: RING_RX.far, label: 'VÙNG XA' },
];

export const DynamicMapModal: React.FC<DynamicMapModalProps> = ({
  visitedNodes,
  visitCounts,
  weather,
  stamina,
  homeName,
  extraNodes,
  baseNodeId,
  hasBase,
  onClaimBase,
  vehicle,
  crewAvailable,
  onTravel,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [useVehicle, setUseVehicle] = useState(true);
  const [crew, setCrew] = useState(0);

  const allNodes = useMemo(() => [...WORLD_NODES, ...extraNodes], [extraNodes]);
  const reg = useMemo(() => Object.fromEntries(allNodes.map((n) => [n.id, n])) as Record<string, WorldNode>, [allNodes]);
  const visible = useMemo(() => revealedNodes(visitedNodes, extraNodes), [visitedNodes, extraNodes]);
  const known = useMemo(() => knownNodes(visitedNodes, extraNodes), [visitedNodes, extraNodes]);
  // Điểm xuất phát của mọi chuyến đi là căn cứ hiện tại (nếu đã chuyển căn cứ) hoặc chỗ ở ban đầu
  const originId = baseNodeId && reg[baseNodeId] ? baseNodeId : HOME_NODE_ID;
  const home = reg[originId] || NODE_BY_ID[HOME_NODE_ID];

  const selected = selectedId ? reg[selectedId] : null;
  const path = useMemo(() => (selected ? shortestPath(originId, selected.id, extraNodes) : []), [selected, extraNodes, originId]);
  const hops = Math.max(0, path.length - 1);
  const pathEdges = new Set(path.slice(1).map((id, i) => [path[i], id].sort().join('|')));

  const rainy = weather === 'heavy_rain' || weather === 'freezing_cold';
  // Xe cộ: nhẹ sức hơn nhiều nhưng tốn xăng; hết xăng/hỏng thì tự động phải đi bộ
  const vdef = vehicle ? VEHICLES[vehicle.kind] : null;
  const needFuel = vdef ? fuelNeededRoundTrip(vdef.kind, hops) : 0;
  const vehicleOk = !!vehicle && !!vdef && vehicle.condition > 0 && vehicle.fuel >= needFuel;
  const riding = useVehicle && vehicleOk;
  const maxCrew = riding && vdef ? Math.min(vdef.crew, crewAvailable) : 0;
  const blockedByDistance = !!selected?.needsVehicle && !riding;
  const staminaCost = (style: 'quick' | 'thorough') => {
    const base = (6 * hops + (style === 'thorough' ? 9 : 3)) * (riding && vdef ? vdef.speed : 1);
    return rainy ? Math.round(base * 1.2) : Math.round(base);
  };
  const visits = selected ? visitCounts[selected.id] || 0 : 0;

  const edges: [WorldNode, WorldNode][] = [];
  const edgeSeen = new Set<string>();
  allNodes.forEach((a) => {
    a.connections.forEach((cid) => {
      const b = reg[cid];
      const key = [a.id, cid].sort().join('|');
      if (b && !edgeSeen.has(key)) {
        edgeSeen.add(key);
        edges.push([a, b]);
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-sky-800/60 bg-sky-950/60 p-2 text-sky-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white sm:text-lg">BẢN ĐỒ KHU VỰC</h3>
              <p className="text-[11px] text-neutral-400 sm:text-xs">
                Chọn một điểm để xem lộ trình. Điểm xa hơn tốn nhiều chặng, nhiều thể lực nhưng vật tư giá trị hơn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Đóng bản đồ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* Map canvas */}
          <div className="relative flex-1 bg-neutral-950 p-2 sm:p-3">
            <svg viewBox="0 0 100 70" className="h-auto w-full rounded-lg border border-neutral-800 bg-[#17130d]" role="img" aria-label="Sơ đồ bản đồ khu vực">
              <defs>
                <filter id="map-wob" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
                  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.09" numOctaves="2" seed="9" result="w" />
                  <feDisplacementMap in="SourceGraphic" in2="w" scale="0.7" xChannelSelector="R" yChannelSelector="G" result="d" />
                  <feColorMatrix in="d" type="saturate" values="0.5" />
                </filter>
                <filter id="map-grain" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0.9 -0.3" />
                </filter>
                <filter id="map-stain" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="3" seed="12" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 1.2 -0.55" />
                </filter>
                <pattern id="map-hatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
                  <line x1="0" y1="0" x2="0" y2="2.2" stroke="#000" strokeWidth="0.18" opacity="0.5" />
                </pattern>
                <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#2d2518" strokeWidth="0.15" />
                </pattern>
                <radialGradient id="fog" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#17130d" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
                </radialGradient>
              </defs>
              <rect width="100" height="70" fill="#1d1810" />
              <g filter="url(#map-wob)">
              <rect width="100" height="70" fill="url(#grid)" />

              {/* Vùng khoảng cách quanh căn cứ */}
              {RING.map((rg) => {
                // Nhãn đặt ở góc 60° (dưới-phải) nơi không có điểm nào, để không đè lên nhãn địa điểm
                const lx = home.x + rg.r * Math.cos(Math.PI / 3);
                const ly = home.y + rg.r * RING_Y_RATIO * Math.sin(Math.PI / 3);
                return (
                  <g key={rg.r}>
                    <ellipse cx={home.x} cy={home.y} rx={rg.r} ry={rg.r * RING_Y_RATIO} fill="none" stroke="#54452d" strokeWidth="0.25" strokeDasharray="1.2 1.2" />
                    <text x={lx} y={ly} textAnchor="middle" fontSize="1.7" fill="#5b756b" letterSpacing="0.2">
                      {rg.label}
                    </text>
                  </g>
                );
              })}

              {/* Đường nối */}
              {edges.map(([a, b]) => {
                const bothSeen = visible.has(a.id) && visible.has(b.id);
                if (!bothSeen) return null;
                const bothKnown = known.has(a.id) && known.has(b.id);
                const onPath = pathEdges.has([a.id, b.id].sort().join('|'));
                return (
                  <line
                    key={`${a.id}-${b.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={onPath ? '#e0a04a' : bothKnown ? '#85704c' : '#3a3022'}
                    strokeWidth={onPath ? 0.9 : 0.45}
                    strokeDasharray={bothKnown ? undefined : '1 1'}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Các điểm */}
              {allNodes.map((n) => {
                if (!visible.has(n.id)) return null;
                const isKnown = known.has(n.id);
                const isHome = n.id === originId;
                const isSel = n.id === selectedId;
                const wasVisited = visitedNodes.includes(n.id);
                const color = isHome ? '#38bdf8' : isKnown ? dangerColor(n.danger) : '#52605b';
                return (
                  <g
                    key={n.id}
                    onClick={() => {
                      if (isHome) return;
                      sound.playClick();
                      setSelectedId(n.id);
                    }}
                    className={isHome ? '' : 'cursor-pointer'}
                    role={isHome ? undefined : 'button'}
                    aria-label={isKnown ? n.name : 'Địa điểm chưa rõ'}
                  >
                    {n.outpost && <circle cx={n.x} cy={n.y} r="4" fill="none" stroke="#fbbf24" strokeWidth="0.35" strokeDasharray="0.9 0.9" />}
                    {n.id === baseNodeId && <text x={n.x - 3.2} y={n.y - 2.6} fontSize="3" style={{ pointerEvents: 'none' }}>🏠</text>}
                    {isSel && <circle cx={n.x} cy={n.y} r="4.6" fill="none" stroke="#38bdf8" strokeWidth="0.4" />}
                    <circle cx={n.x} cy={n.y} r={isHome ? 3.6 : 3} fill="#1b150d" stroke={color} strokeWidth={isHome ? 0.7 : 0.5} />
                    <text x={n.x} y={n.y + 1.1} textAnchor="middle" fontSize="3" style={{ pointerEvents: 'none' }}>
                      {isKnown ? KIND_ICON[n.kind] : '❔'}
                    </text>
                    {wasVisited && (
                      <circle cx={n.x + 2.6} cy={n.y - 2.6} r="1" fill="#34d399" stroke="#0f1513" strokeWidth="0.25" />
                    )}
                    <text x={n.x} y={n.y + (!isHome && n.y < home.y ? -4.6 : 6)} textAnchor="middle" fontSize="2.2" fill={isKnown ? '#d9c8a0' : '#6d6048'} style={{ pointerEvents: 'none' }}>
                      {isKnown ? (isHome ? homeName.slice(0, 22) : n.name.split(' - ')[0].slice(0, 22)) : 'Chưa rõ'}
                    </text>
                  </g>
                );
              })}

              {/* Vị trí của bạn: vòng tròn xung nhịp chậm */}
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={home.x} cy={home.y} r="5.2" fill="none" stroke="#38bdf8" strokeWidth="0.35" opacity="0.7">
                  <animate attributeName="r" values="4.4;6.6;4.4" dur="3.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.1;0.7" dur="3.2s" repeatCount="indefinite" />
                </circle>
                <text x={home.x} y={home.y + 8.6} textAnchor="middle" fontSize="1.9" fontWeight="700" fill="#7dd3fc">
                  ▲ BẠN Ở ĐÂY
                </text>
              </g>
              </g>
              <rect width="100" height="70" fill="url(#map-hatch)" opacity="0.14" style={{ pointerEvents: 'none', mixBlendMode: 'multiply' }} />
              <rect width="100" height="70" filter="url(#map-stain)" opacity="0.55" style={{ pointerEvents: 'none' }} />
              <rect width="100" height="70" filter="url(#map-grain)" opacity="0.6" style={{ pointerEvents: 'none', mixBlendMode: 'multiply' }} />
              <rect width="100" height="70" fill="url(#fog)" style={{ pointerEvents: 'none' }} />
              <rect x="0.4" y="0.4" width="99.2" height="69.2" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.6" style={{ pointerEvents: 'none' }} />
            </svg>

            {/* Chú giải */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-mono text-neutral-400">
              <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-sky-400" /> Căn cứ</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: '#34d399' }} /> Nguy hiểm thấp</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: '#fbbf24' }} /> Trung bình</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: '#f87171' }} /> Rất nguy hiểm</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Ghé điểm nào sẽ mở thêm điểm kề nó</span>
            </div>
          </div>

          {/* Detail panel */}
          <aside className="w-full shrink-0 border-t border-neutral-800 bg-neutral-900 p-4 lg:w-80 lg:border-l lg:border-t-0">
            {!selected ? (
              <div className="py-8 text-center text-xs leading-relaxed text-neutral-500">
                Chạm vào một điểm trên bản đồ để xem lộ trình, độ nguy hiểm và vật tư tiềm năng.
                <div className="mt-3 text-[11px] text-neutral-600">
                  Thể lực hiện tại: <span className="text-emerald-400">{stamina}</span>
                  {rainy && <div className="text-amber-400">Thời tiết xấu: mỗi chặng tốn thêm 20% thể lực.</div>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <PlaceIllustration kind={selected.kind} danger={selected.danger} known={known.has(selected.id)} seed={selected.id} variant={selected.id} />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400">{REGION_LABEL[selected.region]}</div>
                  <h4 className="text-sm font-bold text-white">
                    {known.has(selected.id) ? `${KIND_ICON[selected.kind]} ${selected.name}` : '❔ Địa điểm chưa rõ'}
                  </h4>
                </div>

                {!known.has(selected.id) ? (
                  <div className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-400">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <span>
                      Bạn mới chỉ thấy tín hiệu mờ ở hướng này. Hãy ghé một điểm kề nó (
                      {selected.connections
                        .filter((c) => known.has(c) && c !== originId)
                        .map((c) => reg[c]?.name.split(' - ')[0])
                        .join(', ') || 'điểm gần hơn'}
                      ) để khám phá.
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-neutral-300">{selected.description}</p>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                      <div className="rounded border border-neutral-800 bg-neutral-950/70 p-2">
                        <Footprints className="mx-auto mb-0.5 h-3.5 w-3.5 text-sky-400" />
                        {hops} chặng
                      </div>
                      <div className="rounded border border-neutral-800 bg-neutral-950/70 p-2">
                        <ShieldAlert className="mx-auto mb-0.5 h-3.5 w-3.5" style={{ color: dangerColor(selected.danger) }} />
                        Cấp {selected.danger}
                      </div>
                      <div className="rounded border border-neutral-800 bg-neutral-950/70 p-2">
                        <Clock className="mx-auto mb-0.5 h-3.5 w-3.5 text-amber-400" />
                        {visits === 0 ? 'Chưa ghé' : `Đã ghé ${visits}`}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">Vật tư tiềm năng</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.resources.map((r) => (
                          <span key={r} className="rounded border border-neutral-800 bg-neutral-950 px-2 py-0.5 font-mono text-[11px] text-neutral-200">
                            ✦ {r}
                          </span>
                        ))}
                      </div>
                      {visits > 0 && <div className="mt-1 text-[10px] text-amber-400">Đã ghé {visits} lần nên vật tư còn ít hơn.</div>}
                    </div>

                    {selected.id !== originId && baseInfoOf(selected) && (() => { const info = baseInfoOf(selected)!; return (
                      <div className="space-y-2 rounded-lg border border-amber-800/60 bg-amber-950/20 p-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                          <span>{selected.outpost ? 'CỨ ĐIỂM TIỀM NĂNG' : 'CÓ THỂ LẬP CĂN CỨ'}</span>
                          <span>Độ phù hợp: {info.baseScore}/100</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded bg-neutral-900"><div className="h-full bg-amber-500" style={{ width: `${info.baseScore}%` }} /></div>
                        <ul className="space-y-0.5 text-[11px] text-emerald-300">{info.pros.map((p) => (<li key={p}>＋ {p}</li>))}</ul>
                        <ul className="space-y-0.5 text-[11px] text-red-300">{info.cons.map((p) => (<li key={p}>－ {p}</li>))}</ul>
                        {Object.keys(info.bonus).length > 0 && <div className="text-[10px] text-neutral-400">Có sẵn công trình khi chiếm: {Object.entries(info.bonus).map(([k, v]) => `${k} cấp ${v}`).join(', ')}</div>}
                        {onClaimBase && (
                          <button
                            disabled={(visits === 0 && selected.id !== HOME_NODE_ID) || baseNodeId === selected.id}
                            onClick={() => {
                              const moving = hasBase;
                              if (moving && !window.confirm(`Chuyển căn cứ tới ${selected.name.split(' - ')[0]}?\n\n- Đồ trong kho căn cứ được mang theo.\n- Công trình đã xây và các việc gia cố ở chỗ cũ sẽ mất.\n- Bạn mất sức vì dọn đồ và đi lại, đồng đội đi cùng.\n- Nơi ở đổi theo chỗ mới.`)) return;
                              sound.playLoot();
                              onClaimBase(selected);
                            }}
                            className="w-full cursor-pointer rounded border border-amber-600 bg-amber-700/70 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {baseNodeId === selected.id ? 'Đang là căn cứ của bạn' : visits === 0 && selected.id !== HOME_NODE_ID ? 'Hãy tới lục soát một lần trước khi chiếm' : hasBase ? 'Chuyển căn cứ tới đây' : 'Chiếm làm căn cứ'}
                          </button>
                        )}
                      </div>
                    ); })()}

                    <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-[10px] leading-relaxed text-neutral-400">Đi loot là mất cả buổi: trong lúc bạn vắng, căn cứ tạm ngừng hoạt động (bếp, vườn, việc của đồng đội) cho tới khi bạn trở về.</div>

                    {(vehicle || selected.needsVehicle) && (
                      <div className="space-y-1.5 rounded-lg border border-sky-900/60 bg-sky-950/20 p-3 text-[11px]">
                        {selected.needsVehicle && <div className={riding ? 'text-emerald-300' : 'text-amber-300'}>{riding ? 'Nơi này quá xa, bạn đi bằng xe.' : 'Nơi này quá xa để đi bộ. Cần một chiếc xe còn xăng.'}</div>}
                        {vehicle && vdef && (
                          <>
                            <label className="flex cursor-pointer items-center gap-2 text-neutral-200">
                              <input type="checkbox" checked={useVehicle} onChange={(e) => setUseVehicle(e.target.checked)} />
                              <span>{vdef.icon} Đi bằng {vdef.name.toLowerCase()} (xăng {Math.round(vehicle.fuel)}/{vdef.maxFuel}, độ bền {Math.round(vehicle.condition)}%)</span>
                            </label>
                            {useVehicle && !vehicleOk && <div className="text-red-300">{vehicle.condition <= 0 ? 'Xe hỏng nặng, cần sửa trước.' : `Cần ${needFuel} xăng cho cả đi lẫn về, xe chỉ còn ${Math.round(vehicle.fuel)}.`}</div>}
                            {riding && needFuel > 0 && <div className="text-neutral-400">Tốn khoảng {needFuel} xăng · tiếng ồn mức {vdef.noise}/4 · giáp {vdef.armor}</div>}
                            {riding && maxCrew > 0 && (
                              <div className="flex items-center gap-2 text-neutral-200">
                                <span>Chở đồng đội:</span>
                                {Array.from({ length: maxCrew + 1 }).map((_, i) => (
                                  <button key={i} onClick={() => setCrew(i)} className={`cursor-pointer rounded border px-2 py-0.5 ${Math.min(crew, maxCrew) === i ? 'border-sky-400 bg-sky-900/60 text-white' : 'border-neutral-700 text-neutral-400'}`}>{i}</button>
                                ))}
                                <span className="text-neutral-500">(mang thêm đồ, giảm thiệt hại, ăn thêm)</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 border-t border-neutral-800 pt-3">
                      <button
                        disabled={stamina < staminaCost('quick') || blockedByDistance}
                        onClick={() => {
                          sound.playClick();
                          onTravel(selected, 'quick', hops, { useVehicle: riding, crew: Math.min(crew, maxCrew) });
                        }}
                        className="flex cursor-pointer flex-col rounded bg-neutral-800 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="font-semibold text-white">⚡ Lục soát nhanh</span>
                        <span className="text-[10px] text-neutral-400">Ít tiếng động · tốn ~{staminaCost('quick')} thể lực</span>
                      </button>
                      <button
                        disabled={stamina < staminaCost('thorough') || blockedByDistance}
                        onClick={() => {
                          sound.playClick();
                          onTravel(selected, 'thorough', hops, { useVehicle: riding, crew: Math.min(crew, maxCrew) });
                        }}
                        className="flex cursor-pointer flex-col rounded border border-red-800/80 bg-red-950/60 px-3 py-2 text-left text-xs transition-colors hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="font-semibold text-red-300">🔍 Lục soát kỹ / phá khóa</span>
                        <span className="text-[10px] text-red-400">Cơ hội đồ hiếm, rủi ro cao · tốn ~{staminaCost('thorough')} thể lực</span>
                      </button>
                      {stamina < staminaCost('thorough') && (
                        <div className="text-[10px] text-amber-400">Thể lực không đủ cho chuyến này, hãy nghỉ ngơi trước.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
