import React from 'react';
import { MapPin, Navigation, Clock, ShieldAlert, Sparkles, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { MapLocation } from '../types/game';
import { sound } from '../utils/audio';

interface DynamicMapModalProps {
  locations: MapLocation[];
  currentLocation: string;
  onSelectTravel: (loc: MapLocation, lootStyle: 'quick' | 'thorough') => void;
  onClose: () => void;
}

export const DynamicMapModal: React.FC<DynamicMapModalProps> = ({
  locations,
  currentLocation,
  onSelectTravel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950/60 text-sky-400 rounded-lg border border-sky-800/60">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                BẢN ĐỒ THĂM DÒ TÀI NGUYÊN (DYNAMIC MAP)
              </h3>
              <p className="text-xs text-neutral-400">
                Các địa điểm phù hợp thực tế vừa mở khóa do ba lô của bạn đang thiếu hụt nguyên liệu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Location Bar */}
        <div className="px-5 py-2.5 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-400">Vị trí hiện tại:</span>
          <span className="text-amber-400 font-semibold">{currentLocation}</span>
        </div>

        {/* Location List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {locations.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              Hiện tại bạn chưa phát hiện thêm địa điểm khả nghi nào cần thiết. Khi thiếu băng gạc, thuốc men hoặc sắt phế liệu, bản đồ sẽ lập tức định vị!
            </div>
          ) : (
            locations.map((loc) => {
              return (
                <div
                  key={loc.id}
                  className="p-4 bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 rounded-lg space-y-3 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <h4 className="font-bold text-sm text-white">{loc.location_name}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>{loc.distance_time}</span>
                      </span>
                      <span className="text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Nguy hiểm Cấp {loc.danger_level}</span>
                      </span>
                    </div>
                  </div>

                  {/* Potential Resources */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                      Vật tư tiềm năng tại đây:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {loc.potential_resources.map((res, i) => (
                        <span
                          key={i}
                          className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-200 px-2 py-0.5 rounded font-mono"
                        >
                          ✦ {res}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Choices: Loot Nhanh vs Loot Kỹ */}
                  <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectTravel(loc, 'quick');
                      }}
                      className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition-colors cursor-pointer text-left flex flex-col"
                    >
                      <span className="font-semibold text-white">⚡ Di Chuyển & Loot Nhanh</span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">Ít tiếng động, nhặt nhanh đồ cơ bản</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectTravel(loc, 'thorough');
                      }}
                      className="py-2 px-3 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800/80 rounded text-xs font-medium transition-colors cursor-pointer text-left flex flex-col"
                    >
                      <span className="font-semibold text-red-300">🔍 Di Chuyển & Phá Khóa / Loot Kỹ</span>
                      <span className="text-[10px] text-red-400 mt-0.5">Tốn thời gian, rủi ro cao, cơ hội mở súng ống/đồ hiếm</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
