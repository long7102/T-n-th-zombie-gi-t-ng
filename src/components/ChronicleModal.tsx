import React from 'react';
import { BookOpen, GitBranch, CheckCircle2, Lock, X, Shield, Sparkles } from 'lucide-react';
import { STORY_MILESTONES } from '../data/storyBranches';
import { StoryTurn, Skill, Companion } from '../types/game';

interface ChronicleModalProps {
  currentDay: number;
  history: StoryTurn[];
  skills: Skill[];
  companions: Companion[];
  onClose: () => void;
}

export const ChronicleModal: React.FC<ChronicleModalProps> = ({
  currentDay,
  history,
  skills,
  companions,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/60 text-amber-500 rounded-lg border border-amber-800/60">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                NHẬT KÝ SINH TỒN & CÂY PHÂN NHÁNH
              </h3>
              <p className="text-xs text-neutral-400">
                Các sự kiện tương lai được bảo mật hoàn toàn cho đến khi bạn sống sót đạt mốc
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Section 1: 5 Major Branch Milestones (Strictly Hiding Future Info) */}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-widest text-amber-500 mb-3">
              <GitBranch className="w-4 h-4" />
              <span>5 Điểm Rẽ Nhánh Cốt Truyện</span>
            </div>

            <div className="space-y-3">
              {STORY_MILESTONES.map((milestone, idx) => {
                const milestoneMinDay = milestone.actNumber === 1 ? 1
                  : milestone.actNumber === 2 ? 3
                  : milestone.actNumber === 3 ? 6
                  : milestone.actNumber === 4 ? 9
                  : 14;

                const isUnlocked = currentDay >= milestoneMinDay;
                const isPassed = currentDay > milestoneMinDay + 2;

                return (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-lg border transition-all ${
                      !isUnlocked
                        ? 'bg-neutral-950/30 border-neutral-800/60 opacity-60'
                        : isPassed
                        ? 'bg-neutral-950/80 border-neutral-700'
                        : 'bg-neutral-950/95 border-amber-600/70 ring-1 ring-amber-500/30 shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        {isUnlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                        )}
                        <h4 className="font-bold text-sm text-white">
                          {isUnlocked ? milestone.title : `[KHÓA] Điểm Rẽ Hồi ${milestone.actNumber} - Chưa Đạt Mốc Ngày ${milestoneMinDay}`}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                        {isUnlocked ? `Hồi ${milestone.actNumber}` : 'Bí Ẩn Tương Lai'}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <>
                        <p className="text-xs text-neutral-400 mb-3 ml-6">
                          {milestone.description}
                        </p>

                        {/* Choices tree (Only visible if reached) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-6 pt-2 border-t border-neutral-800/80">
                          {milestone.majorChoices.map((c) => (
                            <div
                              key={c.id}
                              className="p-2.5 bg-neutral-900/60 border border-neutral-800/60 rounded text-[11px] text-neutral-300 flex flex-col justify-between"
                            >
                              <span className="font-semibold text-neutral-200 mb-1 leading-snug">
                                {c.label}
                              </span>
                              <span className="text-[10px] text-neutral-500 italic mt-auto">
                                Tác động: {c.worldImpact}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-neutral-500 italic ml-6">
                        Tình huống, ngã rẽ và hậu quả tương lai được ẩn hoàn toàn để đảm bảo tính bất ngờ thực tế. Bạn phải sống sót đến Ngày {milestoneMinDay} để đối mặt ngã rẽ này.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Unlocked Unique Skills */}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-widest text-rose-400 mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Kỹ Năng Độc Bản Đã Mở Khóa ({skills.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {skills.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">✦ {s.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-rose-300 border border-neutral-800">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Detailed Timeline History */}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-widest text-sky-400 mb-3">
              <Shield className="w-4 h-4" />
              <span>Nhật Ký Hành Trình ({history.length} Lượt Quyết Định)</span>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                Hành trình vừa bắt đầu. Mọi quyết định của bạn sẽ được khắc ghi tại đây.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((turn, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-neutral-400 border-b border-neutral-800/80 pb-1">
                      <span>LƯỢT {turn.turnNumber} · NGÀY {turn.day}</span>
                      <span className="text-neutral-500">{turn.location} · {turn.weatherLabel}</span>
                    </div>

                    <p className="text-neutral-300 font-medium">
                      Quyết định của bạn: <span className="text-amber-300 font-semibold">"{turn.selectedChoice}"</span>
                    </p>

                    {turn.outcome && (
                      <p className="text-neutral-400 text-[11px] italic bg-neutral-900/50 p-2 rounded">
                        {turn.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
