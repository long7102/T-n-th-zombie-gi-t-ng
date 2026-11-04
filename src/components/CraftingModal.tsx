import React, { useState } from 'react';
import { Hammer, Sparkles, X, Check, AlertCircle, Wrench, Flame, Plus } from 'lucide-react';
import { Item, CraftingRecipe } from '../types/game';
import { CRAFTING_RECIPES } from '../data/craftingRecipes';
import { sound } from '../utils/audio';

interface CraftingModalProps {
  inventory: Item[];
  onCraftRecipe: (recipe: CraftingRecipe) => void;
  onCustomCraft: (itemName: string, materials: string, description: string) => Promise<void>;
  onClose: () => void;
  isCraftingLoading: boolean;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  inventory,
  onCraftRecipe,
  onCustomCraft,
  onClose,
  isCraftingLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'custom'>('recipes');

  // Custom craft state
  const [customName, setCustomName] = useState('');
  const [customMaterials, setCustomMaterials] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // Check if player has required items for recipe
  const canCraft = (recipe: CraftingRecipe) => {
    return recipe.requiredItems.every(req => {
      // Fuzzy match by item category or partial name
      const found = inventory.find(it =>
        it.name.toLowerCase().includes(req.itemName.toLowerCase().split(' ')[0]) ||
        req.itemName.toLowerCase().includes(it.name.toLowerCase())
      );
      return (found?.quantity || 0) >= req.quantity;
    });
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    sound.playLoot();
    await onCustomCraft(customName, customMaterials, customDesc);
    setCustomName('');
    setCustomMaterials('');
    setCustomDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 text-amber-500 rounded-lg border border-amber-600/30">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                BÀN CHẾ TẠO DÃ CHIẾN
              </h3>
              <p className="text-xs text-neutral-400">
                Lắp ráp vũ khí, thuốc men và trang bị sinh tồn từ phế liệu tận thế
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

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 px-5 pt-3 gap-4 bg-neutral-950/30">
          <button
            onClick={() => { setActiveTab('recipes'); sound.playClick(); }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'recipes'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Công Thức Tiêu Chuẩn ({CRAFTING_RECIPES.length})
          </button>

          <button
            onClick={() => { setActiveTab('custom'); sound.playClick(); }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sáng Chế Vũ Khí Độc Bản (AI)</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'recipes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CRAFTING_RECIPES.map((recipe) => {
                const affordable = canCraft(recipe);
                return (
                  <div
                    key={recipe.id}
                    className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm text-white">{recipe.name}</h4>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                          {recipe.category}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 mb-3">
                        {recipe.description}
                      </p>

                      {/* Required Items */}
                      <div className="space-y-1 mb-3">
                        <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-mono">
                          Nguyên liệu yêu cầu:
                        </span>
                        {recipe.requiredItems.map((req, i) => (
                          <div key={i} className="text-xs flex items-center justify-between text-neutral-300">
                            <span>• {req.itemName}</span>
                            <span className="font-mono text-neutral-400">x{req.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Result item preview */}
                      <div className="p-2 bg-neutral-900/60 rounded text-xs text-amber-300/90 font-mono flex items-center gap-2 mb-3">
                        <span>Nhận được:</span>
                        <span className="font-bold text-white">{recipe.resultItem.name}</span>
                        {recipe.resultItem.damage && <span>(Sát thương: {recipe.resultItem.damage})</span>}
                        {recipe.resultItem.healAmount && <span>(Hồi phục: +{recipe.resultItem.healAmount} HP)</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sound.playLoot();
                        onCraftRecipe(recipe);
                      }}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>Chế Tạo Ngay</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Custom AI Crafting Form */
            <form onSubmit={handleCustomSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs text-neutral-300 leading-relaxed">
                💡 <span className="font-semibold text-white">Tính Năng Sáng Chế Tự Do:</span> Bạn có thể nghĩ ra bất kỳ món vũ khí hay bẫy sinh tồn nào (ví dụ: <span className="italic text-amber-300">"Bình ắc quy gắn dây đồng phóng sét qua lưỡi dao"</span> hay <span className="italic text-amber-300">"Nỏ bắn phi tiêu tẩm độc hoa bìm bịp"</span>). Gemini AI sẽ phân tích tính thực tế và cấp chỉ số độc nhất vô nhị cho bạn!
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Tên Vũ Khí / Vật Phẩm Sáng Chế
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ví dụ: Rìu xích điện cưa Zombie..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Nguyên Liệu Phế Liệu Sử Dụng
                </label>
                <input
                  type="text"
                  required
                  value={customMaterials}
                  onChange={(e) => setCustomMaterials(e.target.value)}
                  placeholder="Ví dụ: Lưỡi cưa sắt cũ, xích xe đạp, pin lithium, băng dính..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Cơ Chế Hoạt Động & Ý Tưởng Của Bạn
                </label>
                <textarea
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Mô tả cách vũ khí này hoạt động khi đâm chém hoặc phòng thủ..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isCraftingLoading || !customName.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  isCraftingLoading || !customName.trim()
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                }`}
              >
                {isCraftingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Đang Thẩm Định & Đúc Rèn...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Chế Tạo Bằng Sáng Tạo AI</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
