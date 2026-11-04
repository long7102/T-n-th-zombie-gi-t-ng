import React, { useState } from 'react';
import { Dices, User, Sparkles, ArrowRight, Building, ShoppingCart, Car, Train, Stethoscope, Edit3 } from 'lucide-react';
import { PlayerCharacter, Companion, Item, Skill } from '../types/game';
import { STARTING_SCENARIOS, StartingScenarioPreset } from '../data/startingScenarios';
import { REALISTIC_SURVIVOR_ROSTER } from '../data/randomEvents';
import { sound } from '../utils/audio';

interface CharacterCreatorProps {
  onComplete: (
    character: PlayerCharacter,
    startingCompanion: Companion | null,
    scenarioId?: string,
    customPrompt?: string
  ) => void;
  onBack: () => void;
}

const RANDOM_NAMES = [
  'Vũ Hoàng Nam', 'Trần Quốc Bảo', 'Lê Minh Khang', 'Đặng Tuấn Kiệt',
  'Nguyễn Hữu Thắng', 'Phạm Hải Đăng', 'Bùi Đức Anh', 'Ngô Kiến Huy',
  'Trịnh Hoài An', 'Đỗ Thanh Tùng', 'Hà Vĩnh Thụy', 'Lâm Phong',
  'Nguyễn Phương Thảo', 'Trần Thu Trang', 'Lê Khánh Linh', 'Hoàng Bảo Ngọc'
];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete, onBack }) => {
  const [name, setName] = useState('Vũ Hoàng Nam');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [customPrompt, setCustomPrompt] = useState('');
  const [companionOption, setCompanionOption] = useState<string>('none');

  const currentScenario = STARTING_SCENARIOS[selectedScenarioIdx];

  const handleRandomize = () => {
    sound.playClick();
    const randName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const randScenario = Math.floor(Math.random() * STARTING_SCENARIOS.length);
    const randGender = Math.random() > 0.5 ? 'male' : 'female';
    const companions = ['none', 'nhauyen', 'mailan', 'phuonglinh', 'bichtram', 'tieumy'];
    const randComp = Math.random() < 0.8 ? 'none' : companions[Math.floor(Math.random() * companions.length)];

    setName(randName);
    setGender(randGender);
    setSelectedScenarioIdx(randScenario);
    setCompanionOption(randComp);
    setMode('preset');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playGunshot();

    const selectedCompanion = REALISTIC_SURVIVOR_ROSTER.find((c: Companion) => c.id.includes(companionOption)) || null;

    if (mode === 'custom' && customPrompt.trim()) {
      // Custom mode: Send custom background to AI for dynamic stat/inventory calculation
      const customChar: PlayerCharacter = {
        name: 'Người sống sót',
        nameKnown: false,
        gender,
        background: 'custom_background',
        backgroundTitle: 'Tự Nhập Bối Cảnh',
        avatar: gender === 'female' ? '👩' : '🧑',
        customBackgroundPrompt: customPrompt.trim(),
        stats: {
          hp: 90,
          maxHp: 90,
          hunger: 10,
          thirst: 15,
          infection: 0,
          sanity: 80,
          stamina: 90,
          maxStamina: 100,
        },
        wound: {
          hasOpenWound: false,
          status: 'none',
          turnsUnchecked: 0,
          locationOnBody: '',
        },
        skills: [],
        inventory: [],
      };
      onComplete(customChar, selectedCompanion, undefined, customPrompt.trim());
    } else {
      // Preset mode
      const presetChar: PlayerCharacter = {
        name: 'Người sống sót',
        nameKnown: false,
        gender,
        background: currentScenario.id,
        backgroundTitle: currentScenario.subtitle,
        avatar: gender === 'female' ? '👩' : '🧑',
        stats: {
          hp: currentScenario.startingHp,
          maxHp: currentScenario.startingHp,
          hunger: 15,
          thirst: 20,
          infection: 0,
          sanity: currentScenario.startingSanity,
          stamina: currentScenario.startingStamina,
          maxStamina: 100,
        },
        wound: {
          hasOpenWound: currentScenario.id === 'clinic_containment',
          status: currentScenario.id === 'clinic_containment' ? 'open' : 'none',
          turnsUnchecked: 0,
          locationOnBody: currentScenario.id === 'clinic_containment' ? 'Vết cào rách da cẳng tay' : '',
        },
        skills: [...currentScenario.initialSkills],
        inventory: [...currentScenario.initialItems],
        equippedWeapon: currentScenario.initialItems.find(i => i.category === 'weapon'),
      };
      onComplete(presetChar, selectedCompanion, currentScenario.id, undefined);
    }
  };

  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'apartment_survivors': return Building;
      case 'supermarket_lockdown': return ShoppingCart;
      case 'highway_traffic_breakdown': return Car;
      case 'metro_train_derailment': return Train;
      case 'clinic_containment': return Stethoscope;
      default: return Building;
    }
  };

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto my-auto p-4 sm:p-6 text-neutral-100">
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5 mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-red-500 font-mono flex items-center gap-2 mb-1">
              <User className="w-3.5 h-3.5" />
              <span>Hồ Sơ Nhân Vật & Bối Cảnh Khởi Đầu</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              XUẤT THÂN TẬN THẾ
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 rounded-lg text-sm font-medium text-neutral-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>Chọn Ngẫu Nhiên Tất Cả</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Character Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Danh tính</label>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-2.5 text-xs leading-relaxed text-neutral-400">
                Giữa tận thế, bạn chưa có tên. Chỉ khi một người sống sót khác hỏi, bạn mới quyết định có nói tên mình ra hay không.
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Giới Tính
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setGender('male'); sound.playClick(); }}
                  className={`py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                    gender === 'male'
                      ? 'bg-red-600/20 border-red-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  Nam
                </button>
                <button
                  type="button"
                  onClick={() => { setGender('female'); sound.playClick(); }}
                  className={`py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                    gender === 'female'
                      ? 'bg-red-600/20 border-red-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  Nữ
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs: Preset Scenarios vs Custom Free-form Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Lựa Chọn Bối Cảnh Xuất Phát
              </label>

              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => { setMode('preset'); sound.playClick(); }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    mode === 'preset' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Kịch Bản Có Sẵn ({STARTING_SCENARIOS.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('custom'); sound.playClick(); }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    mode === 'custom' ? 'bg-rose-900/60 text-rose-200 border border-rose-700' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Tự Nhập Bối Cảnh Riêng (AI)</span>
                </button>
              </div>
            </div>

            {mode === 'preset' ? (
              /* Preset Scenarios Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {STARTING_SCENARIOS.map((sc, idx) => {
                  const Icon = getScenarioIcon(sc.id);
                  const isSelected = selectedScenarioIdx === idx;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => {
                        setSelectedScenarioIdx(idx);
                        sound.playClick();
                      }}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-neutral-800/90 border-red-500 shadow-md ring-1 ring-red-500/50'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 mb-1.5">
                        <div className={`p-2 rounded-md shrink-0 ${isSelected ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-white leading-snug">{sc.title}</h4>
                          <span className="text-[11px] text-amber-400 font-mono">{sc.subtitle}</span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 line-clamp-2 mb-2">
                        {sc.description}
                      </p>

                      <div className="text-[11px] font-mono text-neutral-500 flex items-center justify-between border-t border-neutral-800/70 pt-1.5">
                        <span>{sc.weatherLabel}</span>
                        <span>Máu: {sc.startingHp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Custom Free-form Input Area */
              <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-3">
                <div className="text-xs text-neutral-300 leading-relaxed">
                  ✍️ <strong className="text-white">Tự Do Định Hình Hoàn Cảnh:</strong> Nhập bất kỳ hoàn cảnh xuất phát nào bạn muốn (ví dụ: <span className="italic text-amber-300">"Tôi là một thợ hàn đang kẹt trong tầng hầm xưởng cơ khí cùng cô em gái, cửa sắt đã bị zombie đập lõm, trên tay tôi cầm mỏ hàn và bình ga mini..."</span>).
                  <br />
                  Gemini AI sẽ dựa vào mô tả này để tự động tính toán vũ khí, đồ nghề, chỉ số HP, thể lực và bối cảnh mở đầu hợp lý nhất cho bạn!
                </div>

                <textarea
                  rows={4}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Nhập bối cảnh xuất phát, nghề nghiệp, nơi bạn đang trốn, những người xung quanh và bất kỳ vật dụng nào bạn đang nắm giữ..."
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 focus:border-rose-500 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Starting Companion Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
              <span>Người Đồng Hành Cùng Bạn (Tùy Chọn)</span>
              <span className="text-rose-400 font-normal">Đồng đội hỗ trợ sinh tồn từ ngày đầu</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setCompanionOption('none'); sound.playClick(); }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  companionOption === 'none'
                    ? 'bg-neutral-800 border-red-500 text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-semibold mb-1">Đi Một Mình (Solo)</div>
                <div className="text-xs text-neutral-400">Tự sinh tự diệt giữa vùng đất chết.</div>
              </button>

              <button
                type="button"
                onClick={() => { setCompanionOption('nhauyen'); sound.playClick(); }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  companionOption === 'nhauyen'
                    ? 'bg-rose-950/40 border-rose-500 text-white ring-1 ring-rose-500/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-semibold text-rose-300 flex items-center gap-1.5 mb-1">
                  <span>👩‍⚕️</span>
                  <span>Bác Sĩ Nhã Uyên</span>
                </div>
                <div className="text-xs text-neutral-400">Quân y dã chiến, khử trùng và cứu chữa vết thương.</div>
              </button>

              <button
                type="button"
                onClick={() => { setCompanionOption('thuha'); sound.playClick(); }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  companionOption === 'thuha'
                    ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-sm font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                  <span>👩‍💼</span>
                  <span>Chị Thu Hà (Tạp Hóa)</span>
                </div>
                <div className="text-xs text-neutral-400">Chủ tiệm bách hóa, quản lý kho lương và ướp muối sấy khô thực phẩm.</div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-neutral-800 pt-5">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Quay Lại
            </button>

            <button
              type="submit"
              disabled={mode === 'custom' && !customPrompt.trim()}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-semibold text-sm shadow-lg transition-all cursor-pointer ${
                mode === 'custom' && !customPrompt.trim()
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
              }`}
            >
              <span>Vào Game Khởi Đầu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
