import React from 'react';
import { fmtQty } from '../data/units';
import { Home, Shield, Box, ArrowRightLeft, Flame, Snowflake, Zap, Bell, Plus, X, AlertTriangle } from 'lucide-react';
import { BaseCamp, Item } from '../types/game';
import { sound } from '../utils/audio';

interface BaseManagementModalProps {
  base: BaseCamp;
  backpack: Item[];
  onStoreItem: (item: Item, quantity?: number) => void;
  onRetrieveItem: (item: Item, quantity?: number) => void;
  onUpgradeFortification: () => void;
  onInstallFacility: (facilityKey: keyof BaseCamp['facilities']) => void;
  onClose: () => void;
}

export const BaseManagementModal: React.FC<BaseManagementModalProps> = ({
  base,
  backpack,
  onStoreItem,
  onRetrieveItem,
  onUpgradeFortification,
  onInstallFacility,
  onClose,
}) => {
  const hasScrap = backpack.some(i => i.name.toLowerCase().includes('phế liệu') || i.name.toLowerCase().includes('sắt'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/60">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {base.hasBase ? base.name : 'CHƯA THIẾT LẬP CĂN CỨ'}
                </h3>
                {base.hasBase && (
                  <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                    Độ kiên cố: {base.fortification}%
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {base.hasBase
                  ? `${base.location} · Kho an toàn giảm 50% tỉ lệ ôi thiu thực phẩm so với ba lô`
                  : 'Hãy khám phá các tòa nhà kiên cố, tiệm thuốc có cửa cuốn hoặc kho hàng để lập căn cứ'}
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

        {/* Base Content */}
        {!base.hasBase ? (
          <div className="p-8 text-center text-neutral-400 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-neutral-800 flex items-center justify-center text-2xl">
              🏚️
            </div>
            <h4 className="text-base font-bold text-white">Bạn đang sống cuộc đời lang bạt</h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Bạn chưa có nơi trú ẩn cố định. Toàn bộ tài nguyên đều phải vác trên lưng, chịu ảnh hưởng trực tiếp của nắng gắt làm thực phẩm nhanh ôi thiu và mưa lạnh làm mất sức. Hãy lục soát để tìm một căn cứ an toàn!
            </p>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto flex-1 space-y-6">
            {/* Fortification & Facilities Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fortification Card */}
              <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Hàng Rào & Độ Kiên Cố Cửa Căn Cứ</span>
                  </div>
                  <span className="font-mono text-xs text-emerald-400">{base.fortification}%</span>
                </div>

                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${base.fortification}%` }}
                  />
                </div>

                <p className="text-xs text-neutral-400 leading-normal">
                  Áp lực từ bầy zombie (Horde) hoặc băng cướp có thể phá sập cửa nếu độ kiên cố thấp.
                </p>

                <button
                  onClick={() => {
                    sound.playLoot();
                    onUpgradeFortification();
                  }}
                  disabled={!hasScrap || base.fortification >= 100}
                  className={`w-full py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    hasScrap && base.fortification < 100
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                      : 'bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dùng Phế Liệu Gia Cố (+15% Kiên Cố)</span>
                </button>
              </div>

              {/* Preservation Facilities */}
              <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2.5">
                <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-400" />
                  <span>Tiện Nghi Bảo Quản Nhu Yếu Phẩm</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Stove */}
                  <div className={`p-2.5 rounded border flex flex-col justify-between ${base.facilities.hasStove ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Bếp dã chiến</span>
                    </div>
                    <span className="text-[10px] mt-1 text-neutral-400">Nấu chín diệt khuẩn</span>
                  </div>

                  {/* Foam box */}
                  <div className={`p-2.5 rounded border flex flex-col justify-between ${base.facilities.hasFoamBox ? 'bg-sky-950/30 border-sky-800/60 text-sky-300' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>Thùng xốp ướp muối</span>
                    </div>
                    <span className="text-[10px] mt-1 text-neutral-400">Giảm 75% ôi thiu</span>
                  </div>

                  {/* Generator & Fridge */}
                  <div className={`p-2.5 rounded border flex flex-col justify-between ${base.facilities.hasGeneratorAndFridge ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Tủ lạnh & Máy phát</span>
                    </div>
                    <span className="text-[10px] mt-1 text-neutral-400">Ngừng phân hủy thịt</span>
                  </div>

                  {/* Tripwire */}
                  <div className={`p-2.5 rounded border flex flex-col justify-between ${base.facilities.hasTripwireAlarms ? 'bg-rose-950/30 border-rose-800/60 text-rose-300' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Bẫy chuông báo</span>
                    </div>
                    <span className="text-[10px] mt-1 text-neutral-400">Chống cướp đột nhập</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warehouse vs Backpack Transfer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
              {/* Ba Lô Của Bạn */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <span>Ba Lô Trên Người ({backpack.length} Loại Đồ)</span>
                  <span className="text-[10px] text-neutral-500 normal-case">Dễ hỏng khi Nắng gắt</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {backpack.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-amber-400 font-mono">{fmtQty(item)}</span>
                        </div>
                        {item.freshness !== undefined && (
                          <div className="text-[10px] font-mono text-neutral-400">
                            Độ tươi: <span className={item.freshness < 40 ? 'text-red-400' : 'text-emerald-400'}>{item.freshness}%</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          sound.playClick();
                          onStoreItem(item, 1);
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Cất Vào Kho →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kho Căn Cứ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <span>Kho Căn Cứ ({base.warehouse.length} Loại Đồ)</span>
                  <span className="text-[10px] text-neutral-500 normal-case">Bảo quản an toàn</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {base.warehouse.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded">
                      Kho căn cứ hiện đang trống. Cất bớt nhu yếu phẩm vào đây để tránh ôi thiu khi đi đường dài!
                    </div>
                  ) : (
                    base.warehouse.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="text-emerald-400 font-mono">{fmtQty(item)}</span>
                          </div>
                          {item.freshness !== undefined && (
                            <div className="text-[10px] font-mono text-neutral-400">
                              Độ tươi: <span className={item.freshness < 40 ? 'text-red-400' : 'text-emerald-400'}>{item.freshness}%</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            sound.playClick();
                            onRetrieveItem(item, 1);
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          ← Lấy Ra Ba Lô
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
