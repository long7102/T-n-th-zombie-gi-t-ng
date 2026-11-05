import React from 'react';
import { Utensils, Droplet, X } from 'lucide-react';
import { Item } from '../types/game';
import { FoodPick, WaterPick } from '../utils/needs';
import { fmtQty } from '../data/units';

export interface NeedAlert { kind: 'hunger' | 'thirst'; value: number }

interface Props {
  alerts: NeedAlert[];
  food: FoodPick;
  water: WaterPick;
  onUse: (item: Item) => void;
  onDismiss: (kind: 'hunger' | 'thirst') => void;
}

// Thông báo nhỏ ở góc: đói/khát đã tới 75, bổ sung bằng một cú bấm (ưu tiên đồ nấu chín, đồ bảo quản lâu, rồi đồ hộp).
export const NeedToast: React.FC<Props> = ({ alerts, food, water, onUse, onDismiss }) => {
  if (!alerts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[40] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      {alerts.map((a) => {
        const isHunger = a.kind === 'hunger';
        const pick = isHunger ? food : water;
        const Icon = isHunger ? Utensils : Droplet;
        const tone = isHunger ? 'border-amber-700/80 text-amber-200' : 'border-sky-700/80 text-sky-200';
        return (
          <div key={a.kind} className={`twm-paper twm-type pointer-events-auto rounded-md border ${tone} p-3 text-xs shadow-xl shadow-black/60`}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold"><Icon className="h-3.5 w-3.5" />{isHunger ? 'Bụng cồn cào' : 'Cổ họng khô rát'} · {a.value}%</span>
              <button onClick={() => onDismiss(a.kind)} className="cursor-pointer text-neutral-500 hover:text-white" aria-label="Để sau"><X className="h-3.5 w-3.5" /></button>
            </div>
            {pick.item ? (
              <>
                <div className="mb-2 text-neutral-300">Nên {isHunger ? 'ăn' : 'uống'}: <strong className="text-white">{pick.item.name}</strong> <span className="text-neutral-500">({fmtQty(pick.item)}{isHunger ? ` · ${(pick as FoodPick).label}` : ''})</span></div>
                <button onClick={() => onUse(pick.item as Item)} className="w-full cursor-pointer rounded border border-emerald-700 bg-emerald-900/60 py-1.5 font-semibold text-emerald-100 transition-colors hover:bg-emerald-800">
                  {isHunger ? 'Ăn ngay' : 'Uống ngay'}
                </button>
              </>
            ) : pick.tier === 'raw' ? (
              <div className="text-neutral-300">Chỉ còn <strong className="text-white">{pick.label}</strong> cần {isHunger ? 'nấu chín' : 'đun sôi'} trước. Hãy dùng bếp, hoặc chấp nhận hại bụng.</div>
            ) : (
              <div className="text-neutral-300">Hết {isHunger ? 'đồ ăn' : 'nước uống'} trong ba lô. Lục kho căn cứ hoặc đi tìm kiếm.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
