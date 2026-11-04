import React from 'react';
import { Skull, Trophy, RotateCcw, Heart, Calendar, Users, Shield, BookOpen, AlertTriangle } from 'lucide-react';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';

interface EndGameModalProps {
  gameState: GameState;
  onRestart: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({ gameState, onRestart }) => {
  const isVictory = gameState.gamePhase === 'victory';
  const player = gameState.player;
  const ending = gameState.currentTurn?.game_ending;

  // Determine specific cause of death or victory summary
  let deathCauseTitle = 'BẠN ĐÃ TỬ TRẬN';
  let deathDetail = ending?.cause_of_death || '';

  if (!deathDetail) {
    if (player.stats.hp <= 0) {
      if (player.wound.status === 'septic') {
        deathCauseTitle = 'TỬ VONG DO NHIỄM TRÙNG MÁU';
        deathDetail = 'Độc tố vi khuẩn từ vết thương hoại tử đã tràn vào tim và não bộ. Bạn gục ngã trên nền đất ẩm ướt trong cơn sốt mê sảng, đôi mắt dần đờ đẫn khi đàn zombie tiến đến chia cắt cơ thể bạn.';
      } else if (player.stats.hunger >= 100 || player.stats.thirst >= 100) {
        deathCauseTitle = 'CHẾT VÌ ĐÓI KHÁT KIỆT QUỆ';
        deathDetail = 'Cổ họng khô cháy như thiêu đốt và dạ dày quặn thắt vì nhiều ngày không có một mẩu thức ăn. Bạn gục ngã giữa góc phòng tối tăm, hơi thở lịm dần giữa vùng đất hoang tàn.';
      } else {
        deathCauseTitle = 'BỊ BẦY QUÁI VẬT XÉ XÁC';
        deathDetail = 'Móng vuốt và răng nanh của đàn quái vật lao vào xé toạc các lớp áo giáp. Cơn đau thấu xương kéo dài trong vài giây ngắn ngủi trước khi bóng tối vĩnh hằng khép lại đôi mắt bạn.';
      }
    } else if (player.stats.sanity <= 0) {
      deathCauseTitle = 'PHÁT ĐIÊN & TỰ SÁT TRONG HOẢNG LOẠN';
      deathDetail = 'Nỗi sợ hãi tột cùng, những bóng ma ảo giác và tiếng gào thét của đồng loại đã bẻ gãy hoàn toàn tâm trí bạn. Mất hết nhận thức và hy vọng, bạn đã tự kết liễu mạng sống giữa cơn cuồng loạn tột cùng.';
    } else if (player.stats.infection >= 100) {
      deathCauseTitle = 'BIẾN ĐỔI THÀNH XÁC SỐNG';
      deathDetail = 'Máu trong huyết quản chuyển sang màu đen kịt. Ý thức con người tan biến hoàn toàn, nhường chỗ cho cơn thèm khát thịt sống nguyên thủy. Bạn đã trở thành một phần của bầy đàn diệt vong.';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none overflow-y-auto">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl p-6 sm:p-8 text-center text-neutral-100 my-auto">
        <div className="flex justify-center mb-4">
          {isVictory ? (
            <div className="p-4 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/40">
              <Trophy className="w-12 h-12" />
            </div>
          ) : (
            <div className="p-4 bg-red-950/80 text-red-500 rounded-full border border-red-800">
              <Skull className="w-12 h-12" />
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
          {isVictory ? 'KỶ NGUYÊN TÁI SINH: CHIẾN THẮNG SINH TỒN!' : deathCauseTitle}
        </h2>

        {/* Detailed Narrative / Death or Epilogue */}
        <div className="text-sm text-neutral-300 mb-6 leading-relaxed bg-neutral-950/60 p-4 rounded-lg border border-neutral-800 text-left">
          {isVictory ? (
            <div>
              <div className="text-xs font-mono uppercase text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>VĨ THANH (EPILOGUE): KỶ NGUYÊN TỰ CHỦ</span>
              </div>
              <p className="whitespace-pre-line">
                {ending?.epilogue ||
                  `Sau ${gameState.day} ngày kiên cường vượt qua đói khát, bão tố và bầy xác sống, bạn đã làm được điều không tưởng: xây dựng một Căn cứ tự cung tự cấp kiên cố bất khả xâm phạm.
                  
Kho lương thực sấy khô dồi dào, nguồn nước mưa lọc vô trùng và hệ thống bẫy phòng thủ đã đẩy lùi hoàn toàn đợt càn quét của bầy Horde. Những người bạn đồng hành sống sót bên bạn đã tìm thấy một mái nhà thực sự giữa hoang tàn tận thế.

Tên của bạn không phải là một siêu anh hùng, mà là một Kẻ Sinh Tồn Vĩ Đại đã đánh bại cái chết bằng ý chí thép và sự khôn ngoan ngoài đời thực.`}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-mono uppercase text-red-400 font-bold mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>BÁO CÁO TỬ TRẬN LẠNH LÙNG</span>
              </div>
              <p>{deathDetail}</p>
            </div>
          )}
        </div>

        {/* Survival Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-left">
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Số Ngày Sống</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {gameState.day} Ngày
            </div>
          </div>

          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>Tổng Quyết Định</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {gameState.turnCount} Lượt
            </div>
          </div>

          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span>Đồng Đội Cứu Được</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {gameState.companions.length} Người
            </div>
          </div>

          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kỹ Năng Độc Bản</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {player.skills.length} Kỹ Năng
            </div>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={() => {
            sound.playGunshot();
            onRestart();
          }}
          className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Bắt Đầu Hành Trình Sinh Tồn Mới</span>
        </button>
      </div>
    </div>
  );
};
