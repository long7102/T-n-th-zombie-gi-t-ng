import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  Crosshair,
  HeartPulse,
  Utensils,
  Droplet,
  Hammer,
  Package,
  Shield,
  Zap,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface LootToastProps {
  notifications: string[];
  onDismiss: () => void;
}

interface ParsedLootItem {
  raw: string;
  name: string;
  count: string;
  category: 'weapon' | 'medical' | 'food' | 'water' | 'ammo' | 'material' | 'general';
  rarity: 'legendary' | 'rare' | 'uncommon' | 'common';
}

function parseItem(itemStr: string): ParsedLootItem {
  const match = itemStr.match(/^(.*?)(?:\s*(?:x|X)\s*(\d+))?$/);
  const name = match ? match[1].trim() : itemStr;
  const count = match && match[2] ? `x${match[2]}` : (itemStr.includes('x') ? '' : 'x1');

  const lower = name.toLowerCase();

  let category: ParsedLootItem['category'] = 'general';
  let rarity: ParsedLootItem['rarity'] = 'common';

  if (lower.includes('súng') || lower.includes('colt') || lower.includes('shotgun') || lower.includes('ak') || lower.includes('dao') || lower.includes('rìu') || lower.includes('cung') || lower.includes('kiếm')) {
    category = 'weapon';
    rarity = lower.includes('colt') || lower.includes('quân dụng') || lower.includes('shotgun') ? 'rare' : 'uncommon';
  } else if (lower.includes('đạn') || lower.includes('hộp tiếp đạn') || lower.includes('viên')) {
    category = 'ammo';
    rarity = 'uncommon';
  } else if (lower.includes('thuốc') || lower.includes('băng gạc') || lower.includes('kháng sinh') || lower.includes('cồn') || lower.includes('y tế') || lower.includes('morphine')) {
    category = 'medical';
    rarity = lower.includes('kháng sinh') || lower.includes('morphine') ? 'rare' : 'uncommon';
  } else if (lower.includes('nước') || lower.includes('aquafina') || lower.includes('khoáng')) {
    category = 'water';
    rarity = 'common';
  } else if (lower.includes('thịt') || lower.includes('hộp') || lower.includes('lương khô') || lower.includes('gạo') || lower.includes('bánh')) {
    category = 'food';
    rarity = lower.includes('quân đội') || lower.includes('nguyên seal') ? 'uncommon' : 'common';
  } else if (lower.includes('sắt') || lower.includes('gỗ') || lower.includes('đinh') || lower.includes('dây') || lower.includes('linh kiện') || lower.includes('xà beng')) {
    category = 'material';
    rarity = 'common';
  }

  return { raw: itemStr, name, count, category, rarity };
}

export const LootToast: React.FC<LootToastProps> = ({ notifications, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (notifications.length > 0) {
      sound.playLoot();
      setIsVisible(true);
      setProgress(100);

      // Countdown timer progress bar
      const startTime = Date.now();
      const duration = 5000;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  const parsedItems = notifications.map(parseItem);

  const getItemVisuals = (item: ParsedLootItem) => {
    switch (item.category) {
      case 'weapon':
        return {
          icon: <Crosshair className="w-4 h-4 text-amber-400" />,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          cardGlow: 'border-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
          badgeText: 'VŨ KHÍ',
        };
      case 'ammo':
        return {
          icon: <Zap className="w-4 h-4 text-violet-400" />,
          badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
          cardGlow: 'border-violet-500/50 shadow-[0_0_16px_rgba(139,92,246,0.25)]',
          badgeText: 'ĐẠN DƯỢC',
        };
      case 'medical':
        return {
          icon: <HeartPulse className="w-4 h-4 text-emerald-400" />,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          cardGlow: 'border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.25)]',
          badgeText: 'Y TẾ CỨU SINH',
        };
      case 'water':
        return {
          icon: <Droplet className="w-4 h-4 text-cyan-400" />,
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          cardGlow: 'border-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.25)]',
          badgeText: 'NƯỚC UỐNG',
        };
      case 'food':
        return {
          icon: <Utensils className="w-4 h-4 text-orange-400" />,
          badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          cardGlow: 'border-orange-500/50 shadow-[0_0_16px_rgba(249,115,22,0.25)]',
          badgeText: 'LƯƠNG THỰC',
        };
      case 'material':
        return {
          icon: <Hammer className="w-4 h-4 text-slate-300" />,
          badgeColor: 'bg-slate-700/40 text-slate-200 border-slate-600/40',
          cardGlow: 'border-slate-600/50 shadow-[0_0_12px_rgba(148,163,184,0.2)]',
          badgeText: 'VẬT LIỆU',
        };
      default:
        return {
          icon: <Package className="w-4 h-4 text-amber-300" />,
          badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
          cardGlow: 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
          badgeText: 'NHU YẾU PHẨM',
        };
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-4 sm:right-6 z-50 w-full max-w-sm sm:max-w-md select-none transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="relative overflow-hidden rounded-xl bg-neutral-950/95 border border-amber-500/60 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-xl">
        {/* Shimmer sweep animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
        </div>

        {/* Top Header Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-neutral-900/90 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
              <Sparkles className="w-3.5 h-3.5 fill-amber-400/30" />
              <span>THU THẬP VẬT TƯ (LOOT RPG)</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Looted Items List */}
        <div className="p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
          {parsedItems.map((item, idx) => {
            const visual = getItemVisuals(item);
            return (
              <div
                key={idx}
                style={{ animationDelay: `${idx * 120}ms` }}
                className={`relative flex items-center justify-between gap-3 p-2.5 rounded-lg bg-neutral-900/90 border ${visual.cardGlow} transition-all transform animate-in slide-in-from-bottom-3 duration-300`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 shrink-0">
                    {visual.icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono uppercase font-semibold px-1.5 py-0.2 rounded border ${visual.badgeColor}`}>
                        {visual.badgeText}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white truncate drop-shadow-sm">
                      {item.name}
                    </div>
                  </div>
                </div>

                {item.count && (
                  <div className="shrink-0 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 font-mono text-sm font-extrabold text-amber-300 shadow-sm">
                    {item.count}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Time Progress Indicator */}
        <div className="w-full h-1 bg-neutral-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
