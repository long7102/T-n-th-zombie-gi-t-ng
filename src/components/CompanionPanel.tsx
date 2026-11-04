import React, { useState } from 'react';
import {
  Heart,
  Smile,
  Shield,
  MessageCircle,
  Bandage,
  X,
  Sparkles,
  Gift,
  Lock,
  Flame,
  AlertTriangle,
  Syringe,
  Skull,
  UserX,
  Check,
} from 'lucide-react';
import { Companion, Item } from '../types/game';
import { sound } from '../utils/audio';

interface CompanionPanelProps {
  companions: Companion[];
  inventory: Item[];
  onHealCompanion: (companionId: string) => void;
  onTalkCompanion: (companionId: string) => void;
  onFlirtCompanion?: (companionId: string) => void;
  onGiftCompanion?: (companionId: string, item: Item) => void;
  onProposeIntimacy?: (companionId: string) => void;
  onQuarantineCompanion?: (companionId: string) => void;
  onTreatIncubation?: (companionId: string) => void;
  onPurgeCompanion?: (companionId: string) => void;
  onClose?: () => void;
  hasSafeBase?: boolean;
  playerGender?: 'male' | 'female' | 'other';
  onOpenChat?: (c: Companion) => void;
}

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  companions,
  inventory,
  onHealCompanion,
  onTalkCompanion,
  onFlirtCompanion,
  onGiftCompanion,
  onProposeIntimacy,
  onQuarantineCompanion,
  onTreatIncubation,
  onPurgeCompanion,
  onClose,
  hasSafeBase = false,
  playerGender = 'other',
  onOpenChat,
}) => {
  // Quan hệ tình cảm chỉ có giữa hai người khác giới
  const canRomance = (c: Companion) => (playerGender === 'male' || playerGender === 'female') && c.gender !== playerGender;
  const [selectedGiftCompId, setSelectedGiftCompId] = useState<string | null>(null);
  const [socialFeedback, setSocialFeedback] = useState<{ compId: string; message: string; type: 'love' | 'warn' | 'info' } | null>(null);

  const hasMedical = inventory.some((i) => i.category === 'medical' && i.quantity > 0);
  const hasAntibioticsOrAlcohol = inventory.some(
    (i) =>
      i.quantity > 0 &&
      (i.name.toLowerCase().includes('kháng sinh') ||
        i.name.toLowerCase().includes('cồn') ||
        i.name.toLowerCase().includes('thuốc') ||
        i.infectionReduce)
  );

  // Filter giftable items (category 'gift' or specialty food/items)
  const giftableItems = inventory.filter(
    (i) =>
      i.quantity > 0 &&
      (i.category === 'gift' ||
        i.affectionBonus !== undefined ||
        i.name.toLowerCase().includes('chocolate') ||
        i.name.toLowerCase().includes('kẹo') ||
        i.name.toLowerCase().includes('son') ||
        i.name.toLowerCase().includes('dây chuyền') ||
        i.name.toLowerCase().includes('nước hoa') ||
        i.name.toLowerCase().includes('táo') ||
        i.name.toLowerCase().includes('bánh mì') ||
        i.name.toLowerCase().includes('hộp cá') ||
        i.name.toLowerCase().includes('thịt'))
  );

  const getAffectionLabel = (aff: number) => {
    if (aff >= 85) return { label: 'Tri Kỷ Sâu Sắc ❤️‍🔥', color: 'text-rose-400' };
    if (aff >= 70) return { label: 'Rung Động Thân Thiết 💕', color: 'text-pink-400' };
    if (aff >= 50) return { label: 'Gắn Bó & Tin Cậy 🤝', color: 'text-sky-400' };
    if (aff >= 30) return { label: 'Bạn Đồng Hành 🛡️', color: 'text-neutral-300' };
    return { label: 'Xa Lạ / Đề Phòng ❄️', color: 'text-neutral-400' };
  };

  const handleFlirt = (comp: Companion) => {
    sound.playClick();
    if (onFlirtCompanion) {
      onFlirtCompanion(comp.id);
    }

    let responseMsg = '';
    if (comp.gender === 'female') {
      if (comp.affection >= 70) {
        responseMsg = `"${comp.name} mỉm cười e thẹn cúi mặt, khẽ vén lọn tóc mai ra sau tai: 'Anh lúc nào cũng biết cách làm em bật cười giữa nơi chết chóc này đấy...' (+8 Thiện cảm)"`;
      } else if (comp.affection >= 40) {
        responseMsg = `"${comp.name} liếc nhìn bạn, ánh mắt vừa bất ngờ vừa bối rối: 'Anh vẫn còn tâm trạng nói đùa được sao? Nhưng... cảm ơn anh, nhẹ nhõm hơn nhiều rồi.' (+5 Thiện cảm)"`;
      } else {
        responseMsg = `"${comp.name} nhìn quanh cảnh giác rồi nghiêm giọng: 'Bây giờ không phải lúc bông đùa đâu, hãy tập trung canh chừng bầy zombie đã.' (+2 Thiện cảm)"`;
      }
    } else {
      responseMsg = `"${comp.name} vỗ vai bạn cười sảng khoái: 'Haha, chú mày tếu táo phết đấy! Giữ vững tinh thần thế là tốt!' (+5 Thiện cảm)"`;
    }

    setSocialFeedback({ compId: comp.id, message: responseMsg, type: 'love' });
    setTimeout(() => setSocialFeedback(null), 5000);
  };

  const handleSendGift = (comp: Companion, item: Item) => {
    sound.playLoot();
    if (onGiftCompanion) {
      onGiftCompanion(comp.id, item);
    }
    setSelectedGiftCompId(null);

    const bonus = item.affectionBonus || (item.category === 'gift' ? 25 : 15);
    setSocialFeedback({
      compId: comp.id,
      message: `Bạn đã tặng [${item.name}] cho ${comp.name}. Ánh mắt đối phương ngập tràn xúc động: "Món quà này... giữa thời khắc này... em/tôi sẽ trân quý nó!" (+${bonus} Thiện cảm, +15 Lòng tin)`,
      type: 'love',
    });
    setTimeout(() => setSocialFeedback(null), 6000);
  };

  const handlePropose = (comp: Companion) => {
    sound.playLoot();
    if (onProposeIntimacy) {
      onProposeIntimacy(comp.id);
    }
    setSocialFeedback({
      compId: comp.id,
      message: `Giữa căn cứ an toàn tĩnh lặng, bạn và ${comp.name} cùng ngồi bên bếp lửa. Đôi bàn tay siết chặt lấy nhau, trao cho nhau cái ôm ấm áp và lời hứa sống sót cùng nhau đến ngày tận cùng thế giới. (+Mối Quan Hệ Khắc Cốt Ghi Tâm)`,
      type: 'love',
    });
    setTimeout(() => setSocialFeedback(null), 7000);
  };

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-4 sm:p-5 text-neutral-100 shadow-2xl backdrop-blur-md max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">👥</span>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              ĐỒNG ĐỘI SỐNG SÓT ({companions.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Tâm lý học thực tế · Thiện cảm & Tình cảm · Theo dõi tiến triển ủ bệnh ẩn
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {companions.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-neutral-800 rounded-lg">
          <p className="text-sm text-neutral-400 mb-2 font-medium">
            Hiện bạn đang độc hành giữa vùng đất chết.
          </p>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Đồng đội chỉ gia nhập sau khi bạn thực hiện thành công các biến cố giải cứu cụ thể. Hãy chú ý lắng nghe tiếng cầu cứu trong các sự kiện khẩn cấp!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companions.map((comp) => {
            const isInjured = comp.hp < 60;
            const isCritical = comp.hp < 30;
            const affInfo = getAffectionLabel(comp.affection || 0);

            const isIncubatingHidden = comp.incubation?.isInfected && comp.incubation.stage === 'hidden';
            const isIncubatingSymptomatic = comp.incubation?.isInfected && comp.incubation.stage === 'symptomatic';
            const isQuarantined = comp.incubation?.isQuarantined;
            const isTreated = comp.incubation?.isTreated;

            return (
              <div
                key={comp.id}
                className={`p-4 rounded-xl flex flex-col justify-between transition-all border ${
                  isIncubatingSymptomatic
                    ? 'bg-red-950/40 border-red-700/80 shadow-lg shadow-red-950/50'
                    : isIncubatingHidden
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>
                  {/* Top: Avatar, Name, Role, Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-2xl shadow-inner relative">
                        {comp.avatar}
                        {isQuarantined && (
                          <span
                            className="absolute -top-1 -right-1 bg-amber-600 text-[10px] rounded-full p-0.5 border border-neutral-900"
                            title="Đang bị cách ly / trói theo dõi"
                          >
                            🔒
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{comp.name}</h4>
                          <span className="text-[11px] text-rose-400 font-mono">
                            {comp.age} tuổi
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{comp.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-red-950/70 text-red-400 border-red-700 animate-pulse'
                            : isInjured
                            ? 'bg-amber-950/70 text-amber-400 border-amber-700'
                            : 'bg-emerald-950/70 text-emerald-400 border-emerald-700'
                        }`}
                      >
                        {comp.status === 'healthy' ? 'Khỏe Mạnh' : comp.status === 'injured' ? 'Bị Thương' : comp.status}
                      </span>

                      {isQuarantined && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-950/90 text-amber-300 border border-amber-700 rounded">
                          ĐANG CÁCH LY
                        </span>
                      )}

                      {isTreated && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-teal-950/90 text-teal-300 border border-teal-700 rounded">
                          ĐÃ KHÁNG SINH
                        </span>
                      )}
                    </div>
                  </div>

                  {/* INCUBATION SYMPTOM ALERT BANNERS */}
                  {isIncubatingSymptomatic && (
                    <div className="p-2.5 mb-3 bg-red-950/80 border border-red-600 text-red-200 text-xs rounded-lg flex items-start gap-2 shadow-inner">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold text-red-300 block">
                          ☣️ CẢNH BÁO BỆNH PHÁT TÁC (LƯỢT 4-5):
                        </span>
                        <span>
                          Sốt cao mê sảng, đồng tử giãn, đường gân đen nổi rõ quanh cổ, vết thương cũ rỉ dịch máu đen! Cần cách ly hoặc tiêm kháng sinh mạnh ngay lập tức!
                        </span>
                      </div>
                    </div>
                  )}

                  {isIncubatingHidden && (
                    <div className="p-2 mb-3 bg-amber-950/60 border border-amber-700/80 text-amber-200 text-xs rounded-lg flex items-start gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 block">
                          ⚠️ Dấu hiệu nghi ngờ ủ bệnh ẩn:
                        </span>
                        <span>
                          Sốt nhẹ, mồ hôi trộm, cổ họng khô khát liên tục uống nước. Có thể đang giấu vết cào xé!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stat Meters */}
                  <div className="space-y-2 mb-3">
                    {/* HP Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-400 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                          <span>Sinh Lực (HP)</span>
                        </span>
                        <span className="font-mono text-neutral-300">{comp.hp}/{comp.maxHp}</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, (comp.hp / comp.maxHp) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Morale & Trust */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                          <span>Tinh Thần</span>
                          <span className="font-mono text-neutral-300">{comp.morale}%</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all duration-300"
                            style={{ width: `${comp.morale}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                          <span>Lòng Tin</span>
                          <span className="font-mono text-sky-300">{comp.trust}%</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${comp.trust}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Affection (Thiện Cảm & Thân Mật) Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span className="flex items-center gap-1 text-rose-400">
                          <Sparkles className="w-3 h-3" />
                          <span>Điểm Thiện Cảm: {affInfo.label}</span>
                        </span>
                        <span className="font-mono font-bold text-rose-300">{comp.affection || 0}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-300"
                          style={{ width: `${Math.min(100, comp.affection || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {comp.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded"
                      >
                        ✦ {sk}
                      </span>
                    ))}
                  </div>

                  {/* Last dialogue */}
                  {comp.lastComment && (
                    <div className="p-2 bg-neutral-900/80 border-l-2 border-rose-500 text-xs italic text-neutral-300 mb-3 rounded-r">
                      "{comp.lastComment}"
                    </div>
                  )}

                  {/* Social feedback banner */}
                  {socialFeedback && socialFeedback.compId === comp.id && (
                    <div className="p-2 mb-3 bg-rose-950/60 border border-rose-700/80 text-xs text-rose-200 rounded animate-fadeIn">
                      {socialFeedback.message}
                    </div>
                  )}

                  {/* Gift selection drawer if open for this companion */}
                  {selectedGiftCompId === comp.id && (
                    <div className="p-3 mb-3 bg-neutral-900 border border-neutral-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>Chọn quà từ ba lô để tặng:</span>
                        </span>
                        <button
                          onClick={() => setSelectedGiftCompId(null)}
                          className="text-neutral-400 hover:text-white text-xs"
                        >
                          Đóng
                        </button>
                      </div>

                      {giftableItems.length === 0 ? (
                        <p className="text-[11px] text-neutral-500 italic">
                          Ba lô không có quà tặng đặc biệt (thực phẩm ngon, chocolate, son môi, nước hoa...).
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {giftableItems.map((gItem) => (
                            <button
                              key={gItem.id}
                              onClick={() => handleSendGift(comp, gItem)}
                              className="w-full flex items-center justify-between p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-left transition-colors cursor-pointer"
                            >
                              <span className="text-neutral-200 font-medium truncate max-w-[180px]">
                                {gItem.name}
                              </span>
                              <span className="text-rose-400 font-mono text-[10px]">
                                +{gItem.affectionBonus || 15} Thiện Cảm
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Interaction Buttons Cluster */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  {/* Row 1: Care & Dialogue */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onHealCompanion(comp.id);
                      }}
                      disabled={!hasMedical || comp.hp >= comp.maxHp}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs rounded font-medium transition-colors ${
                        hasMedical && comp.hp < comp.maxHp
                          ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 cursor-pointer'
                          : 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                      }`}
                      title={hasMedical ? 'Dùng băng gạc trị thương' : 'Cần có băng gạc/thuốc y tế'}
                    >
                      <Bandage className="w-3.5 h-3.5" />
                      <span>Băng Bó</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onTalkCompanion(comp.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hỏi Thăm</span>
                    </button>

                    {onOpenChat && (
                      <button
                        onClick={() => { sound.playClick(); onOpenChat(comp); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-sky-950/50 hover:bg-sky-900/60 text-sky-200 border border-sky-700/70 rounded text-xs font-semibold transition-colors cursor-pointer"
                        title="Trò chuyện tự do, tâm sự, phân công"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-sky-300" />
                        <span>Trò Chuyện / Giao Việc</span>
                      </button>
                    )}

                    {canRomance(comp) && (
                    <button
                      onClick={() => handleFlirt(comp)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/70 rounded text-xs font-medium transition-colors cursor-pointer"
                      title="Trêu đùa hoặc tán tỉnh nhẹ nhàng"
                    >
                      <Smile className="w-3.5 h-3.5 text-rose-400" />
                      <span>Tán Tỉnh</span>
                    </button>

                    )}

                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedGiftCompId(selectedGiftCompId === comp.id ? null : comp.id);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/70 rounded text-xs font-medium transition-colors cursor-pointer"
                      title="Tặng quà từ ba lô để tăng thiện cảm"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tặng Quà</span>
                    </button>
                  </div>

                  {/* Row 2: Deep Romance / Intimacy (Unlocked when Affection >= 85 and Base is safe) */}
                  {canRomance(comp) && (comp.affection || 0) >= 75 && (
                    <button
                      onClick={() => handlePropose(comp)}
                      disabled={!hasSafeBase || (comp.affection || 0) < 85 || comp.trust < 80}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-all ${
                        hasSafeBase && (comp.affection || 0) >= 85 && comp.trust >= 80
                          ? 'bg-gradient-to-r from-rose-700 to-pink-600 hover:from-rose-600 hover:to-pink-500 text-white shadow-md shadow-rose-950 cursor-pointer animate-pulse'
                          : 'bg-neutral-900/80 border border-neutral-800 text-neutral-500 cursor-not-allowed'
                      }`}
                      title={
                        !hasSafeBase
                          ? 'Cần có căn cứ an toàn để ngỏ lời thân mật'
                          : (comp.affection || 0) < 85
                          ? 'Cần Thiện cảm >= 85'
                          : 'Cần Lòng tin >= 80'
                      }
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {hasSafeBase && (comp.affection || 0) >= 85 && comp.trust >= 80
                          ? 'Bày Tỏ Tình Cảm & Quan Hệ Thân Mật ❤️'
                          : `Đề Nghị Thân Mật (Cần Căn Cứ & Thiện Cảm 85: hiện ${comp.affection || 0})`}
                      </span>
                    </button>
                  )}

                  {/* Row 3: Incubation Management & Containment Controls */}
                  <div className="pt-1.5 border-t border-neutral-800/60 flex items-center gap-1.5 text-[11px]">
                    <span className="text-[10px] text-neutral-500 font-mono">XỬ LÝ DỊCH:</span>

                    {/* Quarantine Button */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        if (onQuarantineCompanion) onQuarantineCompanion(comp.id);
                      }}
                      className={`flex-1 py-1 px-2 rounded border transition-colors cursor-pointer ${
                        isQuarantined
                          ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                          : 'bg-amber-950/60 hover:bg-amber-900 border-amber-700 text-amber-300'
                      }`}
                      title="Trói hoặc cách ly trong phòng riêng để ngăn nguy cơ lây lan khi biến đổi"
                    >
                      {isQuarantined ? 'Mở Khóa Trói' : 'Cách Ly / Trói'}
                    </button>

                    {/* Treat Incubation Button */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        if (onTreatIncubation) onTreatIncubation(comp.id);
                      }}
                      disabled={!hasAntibioticsOrAlcohol || isTreated}
                      className={`flex-1 py-1 px-2 rounded border transition-colors ${
                        hasAntibioticsOrAlcohol && !isTreated
                          ? 'bg-teal-950/60 hover:bg-teal-900 border-teal-700 text-teal-300 cursor-pointer'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
                      }`}
                      title={
                        isTreated
                          ? 'Đã tiêm kháng sinh mạnh cầm cự'
                          : hasAntibioticsOrAlcohol
                          ? 'Tiêu thụ 1 đơn vị kháng sinh/cồn đỏ để ức chế ủ bệnh'
                          : 'Cần Kháng sinh hoặc Cồn y tế trong ba lô'
                      }
                    >
                      {isTreated ? 'Đã Điều Trị' : 'Tiêm Kháng Sinh'}
                    </button>

                    {/* Emergency Purge Button */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xử tử hoặc trục xuất ${comp.name} để bảo toàn mạng sống cho căn cứ không?`)) {
                          sound.playGunshot();
                          if (onPurgeCompanion) onPurgeCompanion(comp.id);
                        }
                      }}
                      className="py-1 px-2 bg-red-950/40 hover:bg-red-900/80 border border-red-800/80 text-red-300 rounded transition-colors cursor-pointer"
                      title="Thanh trừng khẩn cấp / Trục xuất trước khi biến dị tấn công đồng đội"
                    >
                      <Skull className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
