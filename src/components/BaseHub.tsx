import React, { useState } from 'react';
import { X, Home, ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { BaseCamp, Item } from '../types/game';
import { MODULES, MODULE_BY_ID, SHELTER_SUITABILITY, costStatus, lvl } from '../utils/baseSystem';
import { itemIcon } from '../utils/itemIcon';
import { sound } from '../utils/audio';

interface Props {
  base: BaseCamp;
  backpack: Item[];
  settingId: string;
  shelterLabel: string;
  placeName: string;
  loopStatus: Record<string, 'ok' | 'starved' | 'off'>;
  onEstablish: () => void;
  onBuild: (moduleId: string) => void;
  onStoreItem: (item: Item, quantity?: number) => void;
  onRetrieveItem: (item: Item, quantity?: number) => void;
  onClose: () => void;
}

// Sơ đồ vòng tuần hoàn: mỗi mắt xích sáng khi công trình đang chạy, đỏ khi thiếu đầu vào.
const LOOP: { id: string; label: string; icon: string }[] = [
  { id: 'rain_collector', label: 'Nước mưa', icon: '🪣' },
  { id: 'purifier', label: 'Lọc & đun', icon: '🚰' },
  { id: 'garden', label: 'Vườn rau', icon: '🥬' },
  { id: 'coop', label: 'Chuồng gà', icon: '🐔' },
  { id: 'stove', label: 'Bếp', icon: '🔥' },
  { id: 'biogas', label: 'Biogas', icon: '♻️' },
  { id: 'generator', label: 'Điện', icon: '⚡' },
];

export const BaseHub: React.FC<Props> = ({ base, backpack, settingId, shelterLabel, placeName, loopStatus, onEstablish, onBuild, onStoreItem, onRetrieveItem, onClose }) => {
  const [tab, setTab] = useState<'overview' | 'build' | 'store'>('overview');
  const suit = SHELTER_SUITABILITY[settingId] || SHELTER_SUITABILITY.apartment_survivors;

  const loopColor = (id: string) => {
    const st = loopStatus[id];
    const built = lvl(base, id) > 0 || (id === 'stove' && base.facilities.hasStove);
    if (!built) return 'border-neutral-800 text-neutral-600';
    if (st === 'starved') return 'border-red-700 bg-red-950/40 text-red-300';
    return 'border-emerald-700 bg-emerald-950/30 text-emerald-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/60 p-2 text-emerald-400"><Home className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white sm:text-lg">{base.hasBase ? base.name.toUpperCase() : 'LẬP CĂN CỨ'}</h3>
              <p className="text-[11px] text-neutral-400 sm:text-xs">{base.hasBase ? `Kiên cố ${base.fortification}% · Nhiên liệu ${base.fuel || 0}` : 'Chưa có căn cứ cố định. Lập tại chỗ trú, hoặc tìm một cứ điểm tốt hơn trên bản đồ.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        {!base.hasBase ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Chỗ trú hiện tại: {shelterLabel}</h4>
                <span className="font-mono text-xs text-amber-300">Độ phù hợp {suit.score}/100</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded bg-neutral-900"><div className="h-full bg-amber-500" style={{ width: `${suit.score}%` }} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ul className="space-y-1 text-xs text-emerald-300">{suit.pros.map((p) => <li key={p}>＋ {p}</li>)}</ul>
                <ul className="space-y-1 text-xs text-red-300">{suit.cons.map((p) => <li key={p}>－ {p}</li>)}</ul>
              </div>
              <button
                onClick={() => { sound.playLoot(); onEstablish(); }}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <Home className="h-4 w-4" />Lập căn cứ tại {shelterLabel} ({placeName})
              </button>
            </div>
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200">
              Muốn chỗ tốt hơn? Mở <strong>Bản Đồ</strong>: các cứ điểm ngẫu nhiên (hầm bệnh viện, nhà thờ đá, nhà vườn có giếng, xưởng cơ khí...) sẽ hiện ra khi bạn đi xa dần. Đi lục soát một lần rồi chiếm làm căn cứ nếu chỗ đó đủ tốt.
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 border-b border-neutral-800 bg-neutral-950/30 p-3">
              {([['overview', 'Vòng khép kín'], ['build', 'Công trình'], ['store', 'Kho căn cứ']] as const).map(([k, label]) => (
                <button key={k} onClick={() => { sound.playClick(); setTab(k); }} className={`cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition-colors ${tab === k ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800/80 text-neutral-400 hover:text-white'}`}>{label}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-neutral-400">Mỗi mắt xích cần đầu vào từ mắt xích trước. Thiếu nước thì vườn héo, thiếu rau thì gà không đẻ, thiếu nhiên liệu thì bếp và máy phát ngừng. Biogas biến rác vườn và chuồng gà thành nhiên liệu để vòng quay không dừng.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {LOOP.map((l, i) => (
                      <div key={l.id} className={`relative rounded-lg border p-3 text-center ${loopColor(l.id)}`}>
                        <div className="text-2xl">{l.icon}</div>
                        <div className="mt-1 text-[11px] font-semibold">{l.label}</div>
                        <div className="font-mono text-[10px] opacity-80">{lvl(base, l.id) || (l.id === 'stove' && base.facilities.hasStove ? 1 : 0) ? `Cấp ${lvl(base, l.id) || 1}` : 'Chưa xây'}{loopStatus[l.id] === 'starved' ? ' · THIẾU' : ''}</div>
                        {i < LOOP.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-neutral-600 sm:block" />}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"><div className="font-mono text-[10px] uppercase text-neutral-400">Kiên cố</div><div className="text-lg font-bold text-white">{base.fortification}%</div></div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"><div className="font-mono text-[10px] uppercase text-neutral-400">Nhiên liệu</div><div className="text-lg font-bold text-amber-300">{base.fuel || 0}</div></div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"><div className="font-mono text-[10px] uppercase text-neutral-400">Điện</div><div className={`text-lg font-bold ${base.facilities.hasGeneratorAndFridge ? 'text-emerald-300' : 'text-neutral-500'}`}>{base.facilities.hasGeneratorAndFridge ? 'Đang chạy' : 'Tắt'}</div></div>
                  </div>
                </div>
              )}

              {tab === 'build' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {MODULES.map((m) => {
                    const cur = lvl(base, m.id);
                    const maxed = cur >= m.maxLevel;
                    const missingReq = (m.requires || []).filter((r) => lvl(base, r) === 0 && !(r === 'stove' && base.facilities.hasStove));
                    const cost = m.cost(cur + 1);
                    const st = costStatus(cost, backpack, base.warehouse);
                    const affordable = st.every((c) => c.ok);
                    return (
                      <div key={m.id} className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2"><span className="text-xl">{m.icon}</span><span className="text-sm font-bold text-white">{m.name}</span></div>
                          <span className="font-mono text-[11px] text-amber-300">{cur}/{m.maxLevel}</span>
                        </div>
                        <p className="mb-1.5 text-[11px] leading-relaxed text-neutral-400">{m.desc}</p>
                        {(m.needs || m.gives) && (
                          <div className="mb-2 text-[10px] font-mono text-neutral-500">
                            {m.needs && <div>Cần: <span className="text-neutral-300">{m.needs}</span></div>}
                            {m.gives && <div>Cho: <span className="text-emerald-300">{m.gives}</span></div>}
                          </div>
                        )}
                        {!maxed && (
                          <div className="mb-2 space-y-0.5 text-[11px]">
                            {st.map((c) => (
                              <div key={c.label} className={c.ok ? 'text-emerald-300' : 'text-red-300'}>{c.ok ? <Check className="mr-1 inline h-3 w-3" /> : <AlertTriangle className="mr-1 inline h-3 w-3" />}{c.label}: {Math.min(c.have, c.need)}/{c.need}</div>
                            ))}
                          </div>
                        )}
                        <button
                          disabled={maxed || !affordable || missingReq.length > 0}
                          onClick={() => { sound.playLoot(); onBuild(m.id); }}
                          className="mt-auto w-full cursor-pointer rounded border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-500"
                        >
                          {maxed ? 'Đã tối đa' : missingReq.length ? `Cần xây trước: ${missingReq.map((r) => MODULE_BY_ID[r]?.name || r).join(', ')}` : cur === 0 ? 'Xây dựng' : `Nâng cấp lên cấp ${cur + 1}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'store' && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    { title: `Ba lô (${backpack.reduce((a, i) => a + i.quantity, 0)})`, items: backpack, action: (i: Item) => onStoreItem(i, 1), label: 'Cất vào kho' },
                    { title: `Kho căn cứ (${base.warehouse.reduce((a, i) => a + i.quantity, 0)})`, items: base.warehouse, action: (i: Item) => onRetrieveItem(i, 1), label: 'Lấy ra' },
                  ].map((col) => (
                    <div key={col.title}>
                      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-neutral-400">{col.title}</div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {col.items.length === 0 && <div className="col-span-full py-6 text-center text-xs text-neutral-600">Trống</div>}
                        {col.items.map((it) => (
                          <button key={it.id} onClick={() => { sound.playClick(); col.action(it); }} title={`${it.name}: bấm để ${col.label.toLowerCase()}`} className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950/70 p-1 transition-colors hover:border-amber-500 hover:bg-neutral-800">
                            <span className="text-2xl">{itemIcon(it)}</span>
                            <span className="mt-0.5 line-clamp-2 text-center text-[9px] leading-tight text-neutral-300">{it.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}</span>
                            <span className="absolute right-1 top-1 rounded bg-black/70 px-1 font-mono text-[10px] font-bold text-amber-400">x{it.quantity}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
