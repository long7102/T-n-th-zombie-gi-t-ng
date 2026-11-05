import React, { useEffect, useMemo, useState } from 'react';
import { fmtQty } from '../data/units';
import { Package, Shield, Swords, X, Hammer, Flame, AlertCircle } from 'lucide-react';
import { Item, ItemCategory, WoundState } from '../types/game';
import { CATEGORY_LABEL, itemIcon, quickFacts } from '../utils/itemIcon';
import { sound } from '../utils/audio';
import { Equipment, Slot, SLOTS as EQUIP_SLOTS, SLOT_ICON, SLOT_LABEL, slotOf, totalDefense } from '../data/equipment';

interface InventoryDrawerProps {
  inventory: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
  equipment?: Equipment;
  onUnequip?: (slot: Slot) => void;
  wound: WoundState;
  onUseItem: (item: Item) => void;
  onCookFood: (item: Item) => void;
  onDryFood: (item: Item) => void;
  onFreezeFood?: (item: Item) => void;
  canFreeze?: boolean;
  onEquipItem: (item: Item) => void;
  onOpenCrafting: () => void;
  onOpenBaseWarehouse?: () => void;
  onClose: () => void;
}

const RARITY_RING: Record<string, string> = {
  epic: 'border-purple-500/80 shadow-[inset_0_0_12px_rgba(168,85,247,0.25)]',
  rare: 'border-sky-500/80 shadow-[inset_0_0_12px_rgba(56,189,248,0.2)]',
  uncommon: 'border-emerald-600/80',
  common: 'border-neutral-700',
};
const RARITY_TEXT: Record<string, string> = { epic: 'text-purple-400', rare: 'text-sky-400', uncommon: 'text-emerald-400', common: 'text-neutral-400' };
const RARITY_NAME: Record<string, string> = { epic: 'Sử thi', rare: 'Hiếm', uncommon: 'Khá', common: 'Thường' };

const FILTERS: (ItemCategory | 'all')[] = ['all', 'food', 'medical', 'weapon', 'special', 'tool', 'material', 'ammo'];
const SLOTS = 30; // số ô tối thiểu hiển thị, các ô trống làm nền cho cảm giác "balo"

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
  inventory, equippedWeapon, equippedArmor, equipment, onUnequip, wound,
  onUseItem, onCookFood, onDryFood, onFreezeFood, canFreeze, onEquipItem, onOpenCrafting, onOpenBaseWarehouse, onClose,
}) => {
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => inventory.filter((i) => filter === 'all' || i.category === filter), [inventory, filter]);
  const selected = inventory.find((i) => i.id === selectedId) || null;

  // Nếu món đang chọn đã dùng hết thì bỏ chọn
  useEffect(() => {
    if (selectedId && !inventory.some((i) => i.id === selectedId)) setSelectedId(null);
  }, [inventory, selectedId]);

  const emptySlots = Math.max(0, SLOTS - items.length);

  const isSpoiledItem = (i: Item) => i.category === 'food' && i.freshness !== undefined && i.freshness < 30;
  const canUse = (i: Item) => i.category === 'medical' || i.category === 'food';
  const canEquip = (i: Item) => i.category === 'weapon' || (i.category === 'special' && !!slotOf(i) || i.category === 'special');
  const isEquipped = (i: Item) => equippedWeapon?.id === i.id || EQUIP_SLOTS.some((k) => equipment?.[k]?.id === i.id) || equippedArmor?.id === i.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-neutral-800 p-2 text-amber-500"><Package className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white sm:text-lg">BA LÔ SINH TỒN · {inventory.length} món</h3>
              <p className="text-[11px] text-neutral-400 sm:text-xs">Bấm vào một ô để xem nhanh mô tả và thao tác. Đồ tươi sẽ hỏng dần, đồ sống phải nấu chín.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenBaseWarehouse && (
              <button onClick={() => { sound.playClick(); onOpenBaseWarehouse(); }} className="cursor-pointer rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                Kho Căn Cứ
              </button>
            )}
            <button onClick={() => { sound.playClick(); onOpenCrafting(); }} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-amber-500">
              <Hammer className="h-3.5 w-3.5" /><span>Chế Tạo</span>
            </button>
            <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" aria-label="Đóng">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {wound.hasOpenWound && (
          <div className="flex items-center justify-between gap-2 border-b border-red-800 bg-red-950/70 px-4 py-2 text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>
                VẾT THƯƠNG: <strong className="text-white">{wound.locationOnBody}</strong> (
                {wound.status === 'open' ? 'hở, chưa xử lý' : wound.status === 'inflamed' ? 'sưng tấy mưng mủ' : 'nhiễm trùng máu'})
              </span>
            </div>
            <span className="hidden font-mono text-[11px] text-red-300 sm:inline">Dùng băng gạc hoặc cồn sát trùng ngay!</span>
          </div>
        )}

        {/* Trang bị đang dùng: vũ khí và 5 ô phòng hộ */}
        <div className="border-b border-neutral-800 bg-neutral-950/40 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <div className="twm-cell flex items-center gap-2 border border-neutral-800 p-2 sm:col-span-1">
              <Swords className="h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase text-neutral-400">Vũ khí</div>
                <div className="twm-type truncate text-[11px] font-semibold text-white">{equippedWeapon ? `${equippedWeapon.name} (${equippedWeapon.damage || 20})` : 'Tay không'}</div>
              </div>
            </div>
            {EQUIP_SLOTS.map((k) => {
              const it = equipment?.[k] || (k === 'body' ? equippedArmor : undefined);
              return (
                <button
                  key={k}
                  onClick={() => { if (it && onUnequip) { sound.playClick(); onUnequip(k); } }}
                  title={it ? `${it.name} (+${it.defense ?? 0}). Bấm để cởi` : `Ô ${SLOT_LABEL[k]} đang trống`}
                  className={`twm-cell flex items-center gap-2 border p-2 text-left ${it ? 'cursor-pointer border-sky-900/80' : 'cursor-default border-neutral-800 opacity-70'}`}
                >
                  <span className="twm-ink text-lg leading-none">{SLOT_ICON[k]}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase text-neutral-400">{SLOT_LABEL[k]}</div>
                    <div className="twm-type truncate text-[11px] font-semibold text-white">{it ? `${it.name} +${it.defense ?? 0}` : 'Trống'}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-neutral-400">
            <Shield className="h-3.5 w-3.5 text-sky-400" />Tổng phòng thủ <span className="font-bold text-sky-300">+{totalDefense({ ...(equipment || {}), body: equipment?.body || equippedArmor })}</span>
            <span className="text-neutral-500">· giảm {Math.min(50, totalDefense({ ...(equipment || {}), body: equipment?.body || equippedArmor }) * 2)}% sát thương nhận vào</span>
          </div>
        </div>

        {/* Lọc */}
        <div className="flex flex-wrap gap-1.5 border-b border-neutral-800/80 bg-neutral-950/20 p-3">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => { setFilter(cat); sound.playClick(); }}
              className={`cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors ${filter === cat ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800/80 text-neutral-400 hover:text-white'}`}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* Lưới ô vuông */}
          <div className="flex-1 p-3 sm:p-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6">
              {items.map((item) => {
                const spoiled = isSpoiledItem(item);
                const active = item.id === selectedId;
                const fresh = item.category === 'food' && item.canSpoil && !item.isSealed && !item.isDried && item.freshness !== undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => { sound.playClick(); setSelectedId(item.id); }}
                    title={item.name}
                    className={`twm-cell relative flex aspect-square cursor-pointer flex-col items-center justify-center border p-1 transition-all hover:brightness-125 ${RARITY_RING[item.rarity] || RARITY_RING.common} ${active ? 'ring-2 ring-amber-400' : ''} ${spoiled ? 'bg-red-950/30' : ''}`}
                  >
                    <span className="twm-ink text-2xl leading-none sm:text-3xl">{itemIcon(item)}</span>
                    <span className="twm-type mt-1 line-clamp-2 w-full text-center text-[9px] leading-tight text-neutral-300 sm:text-[10px]">{item.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}</span>
                    <span className="absolute right-1 top-1 rounded bg-black/70 px-1 font-mono text-[10px] font-bold text-amber-400">{fmtQty(item)}</span>
                    {isEquipped(item) && <span className="absolute left-1 top-1 rounded bg-red-700 px-1 text-[8px] font-bold text-white">ĐANG DÙNG</span>}
                    {fresh && (
                      <span className="absolute bottom-0.5 left-1 right-1 h-1 overflow-hidden rounded bg-neutral-800">
                        <span className={`block h-full ${spoiled ? 'bg-red-500' : (item.freshness as number) < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${item.freshness}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-lg border border-dashed border-neutral-800/80 bg-neutral-950/30" />
              ))}
            </div>
          </div>

          {/* Mô tả nhanh */}
          <aside className="order-first w-full shrink-0 border-b border-neutral-800 bg-neutral-950/50 p-4 lg:sticky lg:top-0 lg:order-none lg:w-80 lg:self-start lg:border-b-0 lg:border-l">
            {!selected ? (
              <div className="py-10 text-center text-xs leading-relaxed text-neutral-500">
                Chạm vào một ô để xem mô tả nhanh, chỉ số và các thao tác (dùng, nấu, ướp muối, cất tủ đông, trang bị).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border twm-cell text-3xl ${RARITY_RING[selected.rarity] || RARITY_RING.common}`}><span className="twm-ink">{itemIcon(selected)}</span></div>
                  <div className="min-w-0">
                    <h4 className="twm-type text-sm font-bold leading-tight text-white">{selected.name}</h4>
                    <div className={`mt-0.5 font-mono text-[10px] uppercase ${RARITY_TEXT[selected.rarity] || RARITY_TEXT.common}`}>
                      {RARITY_NAME[selected.rarity] || 'Thường'} · {CATEGORY_LABEL[selected.category] || selected.category} · {fmtQty(selected)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pb-1">
                  {canUse(selected) && (
                    <button
                      onClick={() => onUseItem(selected)}
                      className={`flex-1 cursor-pointer rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${isSpoiledItem(selected) ? 'border-red-700 bg-red-950 text-red-200 hover:bg-red-900' : 'border-emerald-700 bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'}`}
                    >
                      {selected.category === 'food' ? (selected.thirstReduce && !selected.hungerReduce ? 'Uống' : 'Ăn') : 'Dùng'}
                    </button>
                  )}
                  {selected.category === 'food' && (selected.needsCooking || selected.canSpoil) && !selected.isCooked && !selected.isDried && (
                    <button onClick={() => { sound.playLoot(); onCookFood(selected); }} className="flex cursor-pointer items-center gap-1 rounded border border-amber-700 bg-amber-950/60 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-900">
                      <Flame className="h-3.5 w-3.5" />Nấu
                    </button>
                  )}
                  {selected.category === 'food' && selected.canSpoil && !selected.isDried && (
                    <button onClick={() => { sound.playLoot(); onDryFood(selected); }} className="cursor-pointer rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700">
                      Ướp muối
                    </button>
                  )}
                  {selected.category === 'food' && selected.canSpoil && !selected.isDried && !selected.frozen && !selected.curingTurns && onFreezeFood && (
                    <button onClick={() => onFreezeFood(selected)} disabled={!canFreeze} title={canFreeze ? 'Cất vào tủ đông của căn cứ, không hỏng khi còn điện' : 'Cần có căn cứ và điện'} className="cursor-pointer rounded border border-sky-800 bg-sky-950/50 px-3 py-1.5 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-40">Cất tủ đông</button>
                  )}
                  {canEquip(selected) && (
                    <button
                      onClick={() => { sound.playClick(); onEquipItem(selected); }}
                      className={`flex-1 cursor-pointer rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${isEquipped(selected) ? 'border-neutral-700 bg-neutral-800 text-neutral-400' : 'border-red-700 bg-red-950/60 text-red-200 hover:bg-red-900'}`}
                    >
                      {isEquipped(selected) ? 'Đang dùng' : 'Trang bị'}
                    </button>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-neutral-300">{selected.description || 'Chưa có mô tả.'}</p>

                <ul className="space-y-1 text-[11px] font-mono text-neutral-200">
                  {quickFacts(selected).map((f) => (
                    <li key={f} className="flex items-center gap-1.5"><span className="text-amber-500">▸</span>{f}</li>
                  ))}
                </ul>

                {isSpoiledItem(selected) && (
                  <div className="rounded border border-red-900 bg-red-950/40 p-2 text-[11px] italic text-red-300">Đã ôi thiu: ăn vào sẽ ngộ độc (+30% nhiễm độc, -20 máu).</div>
                )}
                {selected.needsCooking && !selected.isCooked && (
                  <div className="rounded border border-amber-900 bg-amber-950/30 p-2 text-[11px] text-amber-300">Dùng sống sẽ no ít hơn và hại bụng. Hãy nấu chín trước.</div>
                )}

              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
