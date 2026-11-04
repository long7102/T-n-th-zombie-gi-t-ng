import React, { useEffect, useState } from 'react';
import { Play, Volume2, VolumeX, ShieldAlert, BookOpen, Sparkles, Dna, Skull, Heart } from 'lucide-react';
import { sound } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenChronicle?: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  hasApiKey: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenChronicle,
  audioEnabled,
  onToggleAudio,
  hasApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'pillars' | 'mechanics'>('pillars');
  const [selectedFeatureModal, setSelectedFeatureModal] = useState<'emergency' | 'companions' | 'custom_input' | null>(null);
  const [volume, setVolume] = useState(sound.getVolume() || 0.7);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        sound.startDarkAmbientDrone();
        sound.playGunshot();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-4 py-8 text-neutral-100 select-none">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
          <span className="text-xs tracking-widest uppercase font-mono text-neutral-400">
            TẬN THẾ NĂM 2026 · VÙNG CÁCH LY THÀNH PHỐ
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>AI: Gemini 3.8 Flash {hasApiKey ? '(Trực Tuyến)' : '(Ngoại Tuyến Sẵn Sàng)'}</span>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 rounded px-2.5 py-1">
            <button
              onClick={() => {
                onToggleAudio();
                sound.playClick();
              }}
              className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title={audioEnabled ? 'Tắt tiếng' : 'Bật tiếng'}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-500" />}
              <span>{audioEnabled ? `${Math.round(volume * 100)}%` : 'Tắt'}</span>
            </button>
            {audioEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  sound.setVolume(val);
                }}
                className="w-16 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                title="Âm lượng nhạc nền & hiệu ứng"
              />
            )}
          </div>
        </div>
      </div>

      {/* Hero Centerpiece */}
      <div className="flex flex-col items-center text-center max-w-3xl my-auto py-12">
        {/* Title lockup SVG */}
        <div className="mb-6 relative">
          <div className="flex items-center justify-center gap-3 text-red-500 font-mono tracking-widest text-xs uppercase mb-3">
            <Skull className="w-4 h-4 animate-pulse" />
            <span>Game RPG Sinh Tồn Phân Nhánh Quyết Định</span>
            <Skull className="w-4 h-4 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_4px_24px_rgba(220,38,38,0.45)]">
            HỒI KẾT <span className="text-red-500">ZOMBIE</span>
          </h1>
          <p className="text-lg sm:text-2xl font-light text-neutral-300 tracking-wide mt-2">
            KỶ NGUYÊN SINH TỒN
          </p>
        </div>

        <p className="text-sm sm:text-base text-neutral-400 max-w-xl leading-relaxed mb-8">
          Mỗi quyết định của bạn định đoạt mạng sống của bản thân và những người bạn đồng hành.
          Phát triển kỹ năng độc bản, chế tạo vũ khí dã chiến và đối mặt với các biến cố thời gian thực
          được tương tác trực tiếp với <span className="text-neutral-200 font-semibold">Gemini AI</span> bằng tiếng Việt.
        </p>

        {/* Start Game CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={() => {
              sound.startAmbientSoundscape('dense_fog', 2);
              sound.playGunshot();
              onStartGame();
            }}
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:shadow-[0_0_40px_rgba(220,38,38,0.8)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span className="text-base tracking-wide">BƯỚC VÀO VÙNG ĐẤT CHẾT</span>
          </button>

          {onOpenChronicle && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenChronicle();
              }}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 hover:border-neutral-500 rounded-lg transition-colors cursor-pointer text-sm font-medium"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Cây Cốt Truyện 5 Phân Nhánh</span>
            </button>
          )}
        </div>

        {/* Feature Category Switcher */}
        <div className="flex items-center justify-center gap-2 mt-8 mb-3">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('pillars');
            }}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
              activeTab === 'pillars'
                ? 'bg-red-950/70 border border-red-700/80 text-red-300 font-semibold shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
            }`}
          >
            ★ 3 TRỤ CỘT ĐỘT PHÁ
          </button>
          <span className="text-neutral-700">·</span>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('mechanics');
            }}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
              activeTab === 'mechanics'
                ? 'bg-neutral-800 border border-neutral-700 text-neutral-200 font-semibold shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
            }`}
          >
            ⚙ CƠ CHẾ SINH TỒN THỰC TẾ
          </button>
        </div>

        {/* Feature Highlights - Matching the 3 Cards from Screenshot */}
        {activeTab === 'pillars' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl text-left">
            {/* Card 1: Biến Cố Khẩn Cấp 15s */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedFeatureModal('emergency');
              }}
              className="p-3.5 sm:p-4 bg-neutral-900/60 border border-neutral-800 hover:border-red-900/80 rounded-lg backdrop-blur-sm transition-all hover:bg-neutral-900/80 cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm font-semibold mb-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Biến Cố Khẩn Cấp 15s</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Bị cướp, phục kích cống ngầm, sương mù độc xảy ra trong thời gian thực.
              </p>
            </div>

            {/* Card 2: Đồng Đội Nữ Sống Sót */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedFeatureModal('companions');
              }}
              className="p-3.5 sm:p-4 bg-neutral-900/60 border border-neutral-800 hover:border-pink-900/80 rounded-lg backdrop-blur-sm transition-all hover:bg-neutral-900/80 cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-pink-400 text-xs sm:text-sm font-semibold mb-1.5">
                <Heart className="w-4 h-4 shrink-0 fill-pink-500/20 transition-transform group-hover:scale-110" />
                <span>Đồng Đội Nữ Sống Sót</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Chiêu mộ Bác sĩ Nhã Uyên, cung thủ Mai Lan, đặc nhiệm Bích Trâm...
              </p>
            </div>

            {/* Card 3: Tự Do Nhập Lựa Chọn */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedFeatureModal('custom_input');
              }}
              className="p-3.5 sm:p-4 bg-neutral-900/60 border border-neutral-800 hover:border-amber-900/80 rounded-lg backdrop-blur-sm transition-all hover:bg-neutral-900/80 cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-semibold mb-1.5">
                <Sparkles className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Tự Do Nhập Lựa Chọn</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Chọn 3 phương án gợi ý hoặc tự tay gõ bất kỳ hành động sáng tạo nào!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl text-left">
            <div className="p-3.5 bg-neutral-900/70 border border-neutral-800/80 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1.5">
                <span className="text-sm">🥩</span>
                <span>Sinh Tồn Thực Tế & Ôi Thiu</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Quản lý độ tươi thực phẩm, sấy khô ướp muối, nấu chín diệt khuẩn và theo dõi vết thương hoại tử, nhiễm trùng máu.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-900/70 border border-neutral-800/80 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold mb-1.5">
                <span className="text-sm">🩺</span>
                <span>Tâm Lý Đồng Đội & Ủ Bệnh Ẩn</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tán tỉnh, tặng quà, theo dõi dấu hiệu sốt trộm (Lượt 1-3) & gân đen (Lượt 4-5) để kịp thời cách ly hoặc tiêm kháng sinh.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-900/70 border border-neutral-800/80 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1.5">
                <span className="text-sm">🏰</span>
                <span>Căn Cứ Kiên Cố & Bản Đồ</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Kho chứa giảm 50% hư hao, nâng cấp máy phát & tủ lạnh, tự động mở tuyến đường loot đồ khẩn cấp khi cạn kiệt tài nguyên.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Hint Line */}
      <div className="w-full text-center py-2 text-xs font-mono text-neutral-500 border-t border-neutral-800/50">
        Nhấn <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">Enter</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">Space</kbd> để bắt đầu · Nhấp vào thẻ để xem tính năng chi tiết
      </div>

      {/* Feature Details Modal */}
      {selectedFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setSelectedFeatureModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-mono px-2 py-1"
            >
              ✕
            </button>

            {selectedFeatureModal === 'emergency' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-red-500">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Biến Cố Khẩn Cấp 15s Thời Gian Thực</h3>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Bất cứ lúc nào trong hành trình, bạn có thể đối mặt với còi báo động khẩn cấp: zombie đột kích từ cống ngầm, toán cướp có súng mai phục, hoặc bão sương mù độc tràn vào.
                </p>
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-300 space-y-1">
                  <p className="font-semibold">⚠️ Quy luật sinh tử:</p>
                  <p>• Đồng hồ đếm ngược 15 giây buộc bạn ra quyết định chớp nhoáng.</p>
                  <p>• Nếu không kịp phản ứng trước khi hết giờ, hậu quả thảm khốc nhất sẽ tự động kích hoạt.</p>
                  <p>• Chuẩn bị sẵn vũ khí và phân công đồng đội trực gác sẽ tăng 40% tỷ lệ phản xạ thành công.</p>
                </div>
              </div>
            )}

            {selectedFeatureModal === 'companions' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-pink-400">
                  <Heart className="w-5 h-5 fill-pink-500/20" />
                  <h3 className="text-lg font-bold">Hệ Thống Đồng Đội Nữ Sinh Tồn</h3>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Gặp gỡ và chiêu mộ các nữ sinh tồn giả với kỹ năng độc bản, chuyên môn hậu cần y tế, và cơ chế tâm lý tình cảm chân thực:
                </p>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="p-2.5 bg-neutral-800/60 rounded border border-neutral-700/60">
                    <span className="font-semibold text-rose-300">🩺 BS. Nhã Uyên:</span> Cứu thương khẩn cấp, chế thuốc kháng sinh, chẩn đoán sớm vết cắn.
                  </div>
                  <div className="p-2.5 bg-neutral-800/60 rounded border border-neutral-700/60">
                    <span className="font-semibold text-rose-300">🏹 Cung thủ Mai Lan:</span> Bắn tỉa im lặng, chế tạo mũi tên dã chiến, trinh sát từ xa.
                  </div>
                  <div className="p-2.5 bg-neutral-800/60 rounded border border-neutral-700/60">
                    <span className="font-semibold text-rose-300">⚡ Đặc nhiệm Bích Trâm:</span> Cận chiến tàn độc, huấn luyện võ thuật, mở khóa vũ khí nặng.
                  </div>
                </div>
                <p className="text-xs text-amber-400">
                  ⚠️ Lưu ý: Đồng đội có thể che giấu vết cào khi mới được cứu (Ủ bệnh Lượt 1-3 và phát tác gân đen ở Lượt 4-5).
                </p>
              </div>
            )}

            {selectedFeatureModal === 'custom_input' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Tự Do Gõ Mọi Hành Động Sáng Tạo</h3>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Ngoài 3 lựa chọn AI đề xuất mỗi lượt, bạn hoàn toàn có thể tự gõ bất kỳ kế hoạch hành động nào bạn nghĩ ra bằng tiếng Việt tự nhiên!
                </p>
                <div className="p-3 bg-neutral-800/80 border border-neutral-700 rounded-lg text-xs text-neutral-300 space-y-1.5">
                  <p className="text-amber-400 font-semibold">Ví dụ các nước đi sáng tạo:</p>
                  <p>• "Dùng cồn sát trùng và phân bón chế tạo bom khói gây mù mắt zombie."</p>
                  <p>• "Leo lên ống nước thoát hiểm tầng thượng để quan sát bầy đàn."</p>
                  <p>• "Giăng bẫy dây chuông quanh cầu thang và rút lui về phòng ngủ cố thủ."</p>
                </div>
                <p className="text-xs text-neutral-400">
                  Gemini AI sẽ đối chiếu hành động với vật phẩm thực tế trong Ba Lô (Cross-validation) và tính toán kết quả logic.
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedFeatureModal(null)}
              className="mt-5 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

