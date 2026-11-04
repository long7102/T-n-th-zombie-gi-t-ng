import React, { useState } from 'react';
import { Package, Shield, Swords, Plus, Heart, Utensils, Droplet, Sparkles, X, Hammer, Flame, AlertCircle } from 'lucide-react';
import { Item, ItemCategory, WoundState } from '../types/game';
import { sound } from '../utils/audio';

interface InventoryDrawerProps {
  inventory: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
  wound: WoundState;
  onUseItem: (item: Item) => void;
  onCookFood: (item: Item) => void;
  onDryFood: (item: Item) => void;
  onEquipItem: (item: Item) => void;
  onOpenCrafting: () => void;
  onOpenBaseWarehouse?: () => void;
  onClose: () => void;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
  inventory,
  equippedWeapon,
  equippedArmor,
  wound,
  onUseItem,
  onCookFood,
  onDryFood,
  onEquipItem,
  onOpenCrafting,
  onOpenBaseWarehouse,
  onClose,
}) => {
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');

  const filteredItems = inventory.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'epic':
        return 'border-purple-600 text-purple-400 bg-purple-950/40';
      case 'rare':
        return 'border-sky-600 text-sky-400 bg-sky-950/40';
      case 'uncommon':
        return 'border-emerald-600 text-emerald-400 bg-emerald-950/40';
      default:
        return 'border-neutral-700 text-neutral-400 bg-neutral-900/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 text-neutral-200 rounded-lg">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                BA LÔ SINH TỒN ({inventory.reduce((acc, i) => acc + i.quantity, 0)} Vật Phẩm)
              </h3>
              <p className="text-xs text-neutral-400">
                Thực phẩm tươi sẽ bị ôi thiu dần theo thời gian nếu không được bảo quản hoặc nấu chín
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onOpenBaseWarehouse && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenBaseWarehouse();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Kho Căn Cứ</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                onOpenCrafting();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Chế Tạo</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wound Alert Bar if player has open/inflamed/septic wound */}
        {wound.hasOpenWound && (
          <div className="px-5 py-2.5 bg-red-950/70 border-b border-red-800 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>
                CẢNH BÁO VẾT THƯƠNG: <strong className="text-white">{wound.locationOnBody}</strong> (
                {wound.status === 'open' ? 'Vết thương hở chưa xử lý' :
                 wound.status === 'inflamed' ? 'Đang sưng tấy mưng mủ (Trừ tinh thần)' :
                 'Đã nhiễm trùng máu (Khóa máu tối đa & Tăng nhiễm độc)'}
                )
              </span>
            </div>
            <span className="text-[11px] font-mono text-red-300">
              Hãy dùng Băng Gạc Sạch hoặc Thuốc Sát Trùng ngay!
            </span>
          </div>
        )}

        {/* Currently Equipped Equipment Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-950/40 border-b border-neutral-800">
          <div className="flex items-center gap-3 p-2.5 bg-neutral-900/70 border border-neutral-800 rounded-lg">
            <div className="p-2 bg-red-950/50 text-red-400 border border-red-800/50 rounded">
              <Swords className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Vũ Khí Cầm Tay</div>
              <div className="text-xs font-semibold text-white truncate">
                {equippedWeapon ? `${equippedWeapon.name} (Sát thương: ${equippedWeapon.damage || 20})` : 'Tay không'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-neutral-900/70 border border-neutral-800 rounded-lg">
            <div className="p-2 bg-sky-950/50 text-sky-400 border border-sky-800/50 rounded">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Giáp Bảo Hộ</div>
              <div className="text-xs font-semibold text-white truncate">
                {equippedArmor ? `${equippedArmor.name} (Phòng thủ: +${equippedArmor.defense})` : 'Áo thường'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap gap-1.5 p-4 border-b border-neutral-800/80 bg-neutral-950/20">
          {(['all', 'food', 'medical', 'weapon', 'material', 'tool', 'ammo'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFilterCategory(cat);
                sound.playClick();
              }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterCategory === cat
                  ? 'bg-neutral-200 text-neutral-900 shadow-sm'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Tất cả' :
               cat === 'food' ? 'Thức ăn / Nước' :
               cat === 'medical' ? 'Y tế & Vết thương' :
               cat === 'weapon' ? 'Vũ khí' :
               cat === 'material' ? 'Vật liệu' :
               cat === 'ammo' ? 'Đạn dược' : 'Công cụ'}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              Không có vật phẩm nào trong ngăn này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const isEquipped = equippedWeapon?.id === item.id || equippedArmor?.id === item.id;
                const canUse = item.category === 'medical' || item.category === 'food';
                const canEquip = item.category === 'weapon' || item.category === 'special';
                const isFood = item.category === 'food';
                const isSpoiled = item.freshness !== undefined && item.freshness < 30;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 bg-neutral-950/60 border rounded-lg flex flex-col justify-between transition-colors ${
                      isSpoiled
                        ? 'border-red-900/80 bg-red-950/20'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 bg-neutral-900 rounded">
                          x{item.quantity}
                        </span>
                      </div>

                      {/* Freshness / Spoilage Status */}
                      {isFood && (
                        <div className="mb-2">
                          {item.isSealed ? (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                              Đồ hộp nguyên seal (Không hỏng)
                            </span>
                          ) : item.isDried ? (
                            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/40 border border-sky-800/60 px-1.5 py-0.5 rounded">
                              Đã sấy khô (Bảo quản lâu dài)
                            </span>
                          ) : item.isCooked ? (
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              Đã nấu chín (Độ tươi: {item.freshness}%)
                            </span>
                          ) : item.freshness !== undefined ? (
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-neutral-400">Độ tươi:</span>
                              <span className={isSpoiled ? 'text-red-400 font-bold' : item.freshness < 60 ? 'text-amber-400' : 'text-emerald-400'}>
                                {item.freshness}% {isSpoiled && '(ĐÃ ÔI THIU!)'}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                        {item.description}
                      </p>

                      {/* Stat effects tags */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-neutral-300 mb-3">
                        {item.damage && <span className="text-red-400">⚔️ Công: {item.damage}</span>}
                        {item.defense && <span className="text-sky-400">🛡️ Giáp: +{item.defense}</span>}
                        {item.healAmount && <span className="text-emerald-400">❤️ Máu: +{item.healAmount}</span>}
                        {item.hungerReduce && <span className="text-amber-400">🍖 No: +{item.hungerReduce}</span>}
                        {item.thirstReduce && <span className="text-blue-400">💧 Khát: -{item.thirstReduce}</span>}
                        {item.infectionReduce && <span className="text-teal-400">🧪 Độc: -{item.infectionReduce}%</span>}
                      </div>

                      {/* Warning if eating spoiled food */}
                      {isSpoiled && (
                        <div className="text-[10px] text-red-400 italic mb-2">
                          ⚠️ Ăn đồ ôi thiu sẽ gây ngộ độc (+30% Nhiễm Độc, -20 HP)!
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5">
                      {canUse && (
                        <button
                          onClick={() => {
                            onUseItem(item);
                          }}
                          className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                            isSpoiled
                              ? 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-700'
                              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                          }`}
                        >
                          {isSpoiled ? 'Ăn (Rủi Ro Ngộ Độc)' : 'Sử Dụng'}
                        </button>
                      )}

                      {/* Cook food action */}
                      {isFood && item.canSpoil && !item.isCooked && !item.isDried && (
                        <button
                          onClick={() => {
                            sound.playLoot();
                            onCookFood(item);
                          }}
                          className="py-1 px-2 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700 rounded text-xs font-medium transition-colors cursor-pointer"
                          title="Nấu chín để tiệt trùng và tăng độ tươi"
                        >
                          <Flame className="w-3 h-3 inline mr-1" />
                          <span>Nấu</span>
                        </button>
                      )}

                      {/* Dry/Cure food action */}
                      {isFood && item.canSpoil && !item.isDried && (
                        <button
                          onClick={() => {
                            sound.playLoot();
                            onDryFood(item);
                          }}
                          className="py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded text-xs font-medium transition-colors cursor-pointer"
                          title="Ướp muối / sấy khô để bảo quản không hỏng"
                        >
                          <span>Sấy Khô</span>
                        </button>
                      )}

                      {canEquip && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onEquipItem(item);
                          }}
                          className={`flex-1 py-1 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-neutral-800 border-neutral-700 text-neutral-400'
                              : 'bg-red-950/60 hover:bg-red-900 text-red-200 border-red-700'
                          }`}
                        >
                          {isEquipped ? 'Đang Dùng' : 'Trang Bị'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
