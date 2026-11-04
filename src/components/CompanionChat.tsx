import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Heart, Shield, Smile, Loader2 } from 'lucide-react';
import { Companion } from '../types/game';
import { ROLES, RoleId, roleFit } from '../data/companionChat';
import { sound } from '../utils/audio';

export interface ChatMsg {
  from: 'player' | 'npc' | 'system';
  text: string;
  delta?: { aff?: number; trust?: number };
}

interface Props {
  companion: Companion;
  playerGender: 'male' | 'female' | 'other';
  playerNameKnown: boolean;
  log: ChatMsg[];
  busy: boolean;
  askingName: boolean;
  onSend: (text: string) => void;
  onSetRole: (role: RoleId) => void;
  onAnswerName: (name: string | null) => void;
  onClose: () => void;
}

const MOOD_LABEL = (aff: number) =>
  aff >= 85 ? 'Tri kỷ' : aff >= 70 ? 'Rung động' : aff >= 50 ? 'Gắn bó' : aff >= 30 ? 'Đồng hành' : 'Xa lạ';

export const CompanionChat: React.FC<Props> = ({ companion, playerGender, playerNameKnown, log, busy, askingName, onSend, onSetRole, onAnswerName, onClose }) => {
  const [text, setText] = useState('');
  const [nameInput, setNameInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const canRomance = (playerGender === 'male' || playerGender === 'female') && companion.gender !== playerGender;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length, busy]);

  const chips = [
    'Cậu/cô có ổn không? Kể tôi nghe đi.',
    'Kể một chuyện vui đi, tôi muốn cười.',
    'Trước đây bạn làm nghề gì?',
    'Tên bạn là gì?',
    'Bàn kế hoạch cho ngày mai nhé.',
    'Cảm ơn vì đã luôn ở bên tôi.',
    ...(canRomance ? ['Ở gần bạn tôi thấy yên tâm lạ.', 'Bạn thật sự rất cuốn hút.'] : []),
  ];

  const send = (t: string) => {
    const v = t.trim();
    if (!v || busy) return;
    sound.playClick();
    onSend(v);
    setText('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none sm:p-4">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 text-2xl">{companion.avatar}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{companion.name}</div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-400">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-sky-400" />Tin {companion.trust}</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{MOOD_LABEL(companion.affection || 0)} {companion.affection || 0}</span>
                <span className="flex items-center gap-1"><Smile className="h-3 w-3 text-amber-400" />Tinh thần {companion.morale}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Phân công */}
        <div className="border-b border-neutral-800 bg-neutral-950/40 p-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Phân công (hiệu quả theo sở trường, có thể nói bằng lời)</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ROLES) as RoleId[]).filter((r) => r !== 'none').map((r) => {
              const fit = roleFit(r, companion);
              const active = (companion.assignment || 'none') === r;
              return (
                <button
                  key={r}
                  onClick={() => { sound.playClick(); onSetRole(active ? 'none' : r); }}
                  title={ROLES[r].effect}
                  className={`cursor-pointer rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? 'border-amber-500 bg-amber-950/60 text-amber-200' : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500'}`}
                >
                  {ROLES[r].label}
                  {fit === 'great' && <span className="ml-1 text-emerald-400">★</span>}
                </button>
              );
            })}
          </div>
          {companion.assignment && companion.assignment !== 'none' && (
            <div className="mt-1.5 text-[11px] text-neutral-400">Đang làm: <span className="text-amber-300">{ROLES[companion.assignment as RoleId]?.label}</span> · {ROLES[companion.assignment as RoleId]?.effect}</div>
          )}
        </div>

        {/* Hội thoại */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-4">
          {log.length === 0 && (
            <div className="py-8 text-center text-xs leading-relaxed text-neutral-500">
              Gõ bất cứ điều gì: hỏi han, tâm sự, kể chuyện, bàn kế hoạch, giao việc{canRomance ? ', hoặc nói điều từ trái tim' : ''}. Họ sẽ phản ứng theo tính cách và mức tin cậy.
            </div>
          )}
          {log.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'player' ? 'justify-end' : m.from === 'system' ? 'justify-center' : 'justify-start'}`}>
              {m.from === 'system' ? (
                <div className="rounded border border-neutral-800 bg-neutral-950/70 px-3 py-1 text-[11px] italic text-neutral-400">{m.text}</div>
              ) : (
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.from === 'player' ? 'rounded-br-sm bg-sky-900/70 text-sky-50' : 'rounded-bl-sm bg-neutral-800 text-neutral-100'}`}>
                  <div className="whitespace-pre-line">{m.text}</div>
                  {m.delta && (m.delta.aff || m.delta.trust) ? (
                    <div className="mt-1 flex gap-2 font-mono text-[10px]">
                      {m.delta.aff ? <span className={m.delta.aff > 0 ? 'text-rose-300' : 'text-red-400'}>{m.delta.aff > 0 ? '+' : ''}{m.delta.aff} thiện cảm</span> : null}
                      {m.delta.trust ? <span className={m.delta.trust > 0 ? 'text-sky-300' : 'text-red-400'}>{m.delta.trust > 0 ? '+' : ''}{m.delta.trust} tin cậy</span> : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-neutral-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />{companion.name} đang suy nghĩ...</div>
          )}
          {askingName && !playerNameKnown && (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 p-3">
              <div className="mb-2 text-xs text-amber-200">{companion.name} hỏi tên bạn. Giữa tận thế, bạn có muốn nói ra không?</div>
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tên bạn muốn nói..."
                  className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <button onClick={() => nameInput.trim() && onAnswerName(nameInput.trim())} className="cursor-pointer rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500">Nói tên</button>
                <button onClick={() => onAnswerName(null)} className="cursor-pointer rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">Giữ im lặng</button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Gợi ý nhanh + ô nhập */}
        <div className="border-t border-neutral-800 bg-neutral-950/60 p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {chips.map((c) => (
              <button key={c} onClick={() => send(c)} disabled={busy} className="shrink-0 cursor-pointer rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-300 transition-colors hover:border-neutral-500 disabled:opacity-40">
                {c}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              maxLength={300}
              placeholder="Gõ điều bạn muốn nói: tâm sự, hỏi han, đùa, giao việc..."
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-sky-500 focus:outline-none"
            />
            <button type="submit" disabled={busy || !text.trim()} className="flex cursor-pointer items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
