import React from 'react';
import { X, Search, Lock, Eye, PackageOpen } from 'lucide-react';
import { SiteState, siteProgress } from '../data/sites';
import { fmtNamed } from '../data/units';
import { itemIcon } from '../utils/itemIcon';
import { PlaceIllustration } from './PlaceIllustration';
import { NodeKind } from '../data/worldMap';
import { sound } from '../utils/audio';

interface Props {
  state: SiteState;
  hasTool: (regexSource: string) => boolean;
  log: string[];
  onSearch: (containerId: string) => void;
  onTake: (containerId: string, index: number) => void;
  onTakeAll: (containerId: string) => void;
  onEvidence: () => void;
  onLeave: () => void;
}

const NOISE = ['yên ắng', 'hơi ồn', 'ồn', 'rất ồn'];

// Kiểm tra từng hòm đồ ở một nơi: xem dấu vết câu chuyện, mở hòm, chọn món cần lấy, theo dõi % đã lục như This War of Mine.
export const LootSiteModal: React.FC<Props> = ({ state, hasTool, log, onSearch, onTake, onTakeAll, onEvidence, onLeave }) => {
  const { site } = state;
  const prog = siteProgress(state);
  const story = site.story;
  const kindForArt = (site.kind === 'house' ? 'home' : site.kind) as NodeKind;
  const variant = site.kind === 'house' ? 'house' : site.kind === 'crash' || site.kind === 'truck' || site.kind === 'flood' ? `dyn_${site.kind}` : undefined;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="twm-paper flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-neutral-700 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div className="min-w-0">
            <h3 className="twm-type truncate text-base font-bold tracking-wide text-white sm:text-lg">{site.name}</h3>
            <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-neutral-400">
              <span>Đã lục soát: <span className={prog.empty ? 'text-emerald-300' : 'text-amber-300'}>{prog.pct}%</span> ({prog.taken}/{prog.total} món)</span>
              {prog.empty && <span className="text-emerald-300">Nơi này đã sạch, không còn gì để lấy</span>}
            </div>
          </div>
          <button onClick={onLeave} className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" aria-label="Rời đi"><X className="h-5 w-5" /></button>
        </div>

        <div className="h-1.5 bg-neutral-900"><div className={`h-full ${prog.empty ? 'bg-emerald-600' : 'bg-amber-600'}`} style={{ width: `${prog.pct}%`, transition: 'width .4s' }} /></div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          <PlaceIllustration kind={kindForArt} danger={site.danger} known seed={site.id} variant={variant} />

          {story && (
            <div className="rounded-lg border border-neutral-700/80 bg-black/40 p-3">
              <div className="twm-type mb-1 text-[11px] uppercase tracking-wider text-amber-300">Dấu vết còn lại · {story.title}</div>
              <p className="twm-type text-sm leading-relaxed text-neutral-200">{story.scene}</p>
              {!state.evidenceSeen ? (
                <button onClick={() => { sound.playClick(); onEvidence(); }} className="mt-2 flex cursor-pointer items-center gap-1.5 rounded border border-amber-800/80 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-900/50">
                  <Eye className="h-3.5 w-3.5" />{story.evidenceLabel}
                </button>
              ) : (
                <div className="mt-2 border-l-2 border-amber-700/70 pl-3">
                  <p className="twm-type text-sm italic leading-relaxed text-neutral-300">{story.evidence}</p>
                  <div className="mt-1 font-mono text-[10px] text-neutral-500">{story.sanity < 0 ? `Tinh thần ${story.sanity}` : story.sanity > 0 ? `Tinh thần +${story.sanity}` : ''}{story.gain ? ` · Bạn giữ lại: ${story.gain.name}` : ''}</div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {site.containers.map((ct) => {
              const opened = state.searched.includes(ct.id);
              const takenIdx = state.taken[ct.id] || [];
              const locked = !!ct.needs && !hasTool(ct.needs.source);
              const left = ct.items.filter((_, i) => !takenIdx.includes(i)).length;
              return (
                <div key={ct.id} className="twm-cell border border-neutral-800 p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="twm-ink text-xl">{ct.icon}</span><span className="twm-type text-sm font-bold text-white">{ct.name}</span></div>
                    {opened && <span className="font-mono text-[10px] text-neutral-500">{left === 0 ? 'đã trống' : `còn ${left} món`}</span>}
                  </div>
                  <p className="twm-type mb-2 text-[11px] leading-relaxed text-neutral-400">{ct.blurb}</p>

                  {!opened ? (
                    locked ? (
                      <div className="flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-500"><Lock className="h-3.5 w-3.5" />Khóa chặt: cần {ct.needs!.label}</div>
                    ) : (
                      <button onClick={() => { sound.playClick(); onSearch(ct.id); }} className="flex w-full cursor-pointer items-center justify-between rounded border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:border-amber-600 hover:text-white">
                        <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />{ct.needs ? 'Cạy mở' : 'Lục soát'}</span>
                        <span className="font-mono text-[10px] text-neutral-500">{NOISE[Math.min(3, ct.noise)]}</span>
                      </button>
                    )
                  ) : left === 0 && ct.items.length === 0 ? (
                    <div className="text-[11px] italic text-neutral-500">Trống rỗng.</div>
                  ) : (
                    <div className="space-y-1">
                      {ct.items.map((it, i) => {
                        const gone = takenIdx.includes(i);
                        return (
                          <div key={it.id} className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px] ${gone ? 'bg-neutral-950/30 text-neutral-600 line-through' : 'bg-neutral-950/70 text-neutral-200'}`}>
                            <span className="flex min-w-0 items-center gap-1.5"><span className="twm-ink">{itemIcon(it)}</span><span className="truncate">{fmtNamed(it)}</span></span>
                            {!gone && <button onClick={() => { sound.playLoot(); onTake(ct.id, i); }} className="shrink-0 cursor-pointer rounded border border-emerald-800 bg-emerald-950/50 px-2 py-0.5 font-semibold text-emerald-200 hover:bg-emerald-900">Lấy</button>}
                          </div>
                        );
                      })}
                      {left > 1 && (
                        <button onClick={() => { sound.playLoot(); onTakeAll(ct.id); }} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-amber-800/80 bg-amber-950/40 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/50"><PackageOpen className="h-3.5 w-3.5" />Lấy hết</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {log.length > 0 && (
            <div className="twm-type space-y-1 rounded-lg border border-neutral-800 bg-black/40 p-3 text-[11px] text-neutral-300">
              {log.slice(-4).map((l, i) => <div key={i}>▸ {l}</div>)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950/80 p-3">
          <span className="font-mono text-[10px] text-neutral-500">Đồ đã lấy sẽ không tự mọc lại. Muốn có thêm, hãy tìm điểm mới hoặc chờ sự kiện bất ngờ.</span>
          <button onClick={onLeave} className="cursor-pointer rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-700">Rời đi</button>
        </div>
      </div>
    </div>
  );
};
