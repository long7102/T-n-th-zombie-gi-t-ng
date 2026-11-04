import React, { useState } from 'react';
import { X, Globe2, HeartPulse, ScrollText, Search, Flag } from 'lucide-react';
import { WorldSummary, WorldEvent } from '../data/worldState';
import { CLUES, Quest, FactionState } from '../data/storyArc';
import { sound } from '../utils/audio';

interface Props {
  summary: WorldSummary;
  quests: Quest[];
  factions: FactionState[];
  flagsText: string[];
  clueIds: string[];
  log: WorldEvent[];
  onClose: () => void;
}

const TONE: Record<string, string> = { ally: 'text-emerald-300 border-emerald-800/60', enemy: 'text-red-300 border-red-800/60', neutral: 'text-amber-300 border-amber-800/60', unknown: 'text-neutral-400 border-neutral-800' };
const KIND_LABEL: Record<string, string> = { world: 'Thế giới', survival: 'Sinh tồn', story: 'Cốt truyện', relation: 'Quan hệ' };

export const WorldSummaryModal: React.FC<Props> = ({ summary, quests, factions, flagsText, clueIds, log, onClose }) => {
  const [tab, setTab] = useState<'world' | 'survival' | 'story'>('world');
  const tabs = [
    { id: 'world' as const, label: 'Phần 1 · Thế giới', icon: <Globe2 className="h-3.5 w-3.5" /> },
    { id: 'survival' as const, label: 'Phần 2 · Sinh tồn', icon: <HeartPulse className="h-3.5 w-3.5" /> },
    { id: 'story' as const, label: 'Phần 3 · Cốt truyện', icon: <ScrollText className="h-3.5 w-3.5" /> },
  ];
  const lines = tab === 'world' ? summary.part1 : tab === 'survival' ? summary.part2 : summary.part3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div>
            <h3 className="text-base font-bold tracking-wide text-white sm:text-lg">TÓM TẮT TRẠNG THÁI THẾ GIỚI</h3>
            <p className="text-[11px] text-neutral-400 sm:text-xs">{summary.headline} · cập nhật mỗi khi có sự kiện quan trọng, và được AI ghi nhớ qua các phiên chơi dài.</p>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-1.5 border-b border-neutral-800 bg-neutral-950/30 p-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { sound.playClick(); setTab(t.id); }} className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${tab === t.id ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800/80 text-neutral-400 hover:text-white'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <ul className="space-y-2">
            {lines.map((l, i) => (
              <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs leading-relaxed text-neutral-200">{l}</li>
            ))}
          </ul>

          {tab === 'world' && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400"><Flag className="h-3.5 w-3.5" />Phe phái & nhóm sống sót</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {factions.map((f) => (
                  <div key={f.id} className={`rounded-lg border bg-neutral-950/60 p-3 ${TONE[f.tone]}`}>
                    <div className="text-xs font-bold">{f.name}</div>
                    <div className="text-[11px] opacity-90">{f.standing}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'story' && (
            <>
              <div>
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400"><Search className="h-3.5 w-3.5" />Manh mối bí ẩn dịch bệnh</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CLUES.map((c) => {
                    const found = clueIds.includes(c.id);
                    return (
                      <div key={c.id} className={`rounded-lg border p-3 ${found ? 'border-amber-800/60 bg-amber-950/20' : 'border-neutral-800 bg-neutral-950/40 opacity-70'}`}>
                        <div className="text-xs font-bold text-white">{found ? c.title : '??? Chưa tìm thấy'}</div>
                        <div className="mt-0.5 text-[11px] leading-relaxed text-neutral-300">{found ? c.text : `Gợi ý nơi tìm: ${c.hint}`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">Nhiệm vụ</div>
                <div className="space-y-1.5">
                  {quests.map((q) => (
                    <div key={q.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                      <div className="flex items-center justify-between text-xs"><span className={`font-bold ${q.done ? 'text-emerald-300 line-through' : 'text-white'}`}>{q.title}</span><span className="font-mono text-[10px] text-neutral-400">{q.progress}</span></div>
                      <div className="text-[11px] text-neutral-400">{q.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              {flagsText.length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">Hệ quả dài hạn của quyết định</div>
                  <ul className="space-y-1 text-[11px] text-neutral-300">{flagsText.map((t) => (<li key={t}>▸ {t}</li>))}</ul>
                </div>
              )}
            </>
          )}

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">Nhật ký sự kiện quan trọng</div>
            {log.length === 0 ? (
              <div className="text-[11px] text-neutral-600">Chưa có sự kiện quan trọng nào.</div>
            ) : (
              <ul className="space-y-1">
                {[...log].reverse().slice(0, 25).map((e, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-neutral-300"><span className="w-14 shrink-0 font-mono text-neutral-500">Ngày {e.day}</span><span className="w-20 shrink-0 text-neutral-500">{KIND_LABEL[e.kind]}</span><span>{e.text}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
