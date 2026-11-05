import { BaseCamp, Companion, Item } from '../types/game';
import { CLUES, FLAG_TEXT, clueCount, computeQuests, factionStanding } from './storyArc';
import { MODULE_BY_ID } from '../utils/baseSystem';
import { VEHICLES, Vehicle } from './vehicles';

// ====================================================================
// BẢN TÓM TẮT TRẠNG THÁI THẾ GIỚI sau các phiên chơi dài.
// Phần 1: Thế giới | Phần 2: Sinh tồn | Phần 3: Cốt truyện.
// Cập nhật khi có sự kiện quan trọng (nhật ký sự kiện), và được gửi cho AI ở mỗi lượt để AI không "quên".
// ====================================================================

export interface WorldEvent {
  day: number;
  turn: number;
  text: string;
  kind: 'world' | 'survival' | 'story' | 'relation';
}

export interface WorldInput {
  day: number;
  turn: number;
  weatherLabel: string;
  forecastLabel?: string;
  locationText: string;
  dangerLevel: number;
  flags: string[];
  companions: Companion[];
  base: BaseCamp;
  inventory: Item[];
  vehicle: Vehicle | null;
  visitedNames: string[];
  outpostNames: string[];
  stats: { hp: number; maxHp: number; hunger: number; thirst: number; infection: number; sanity: number; stamina: number };
  equippedWeapon?: string;
  log: WorldEvent[];
}

export interface WorldSummary {
  headline: string;
  part1: string[];
  part2: string[];
  part3: string[];
  text: string; // bản rút gọn gửi cho AI
}

const countBy = (items: Item[], re: RegExp, pred?: (i: Item) => boolean) =>
  items.filter((i) => re.test(i.name) && (!pred || pred(i))).reduce((s, i) => s + i.quantity, 0);

// Biến một cờ quyết định thành sự kiện nhật ký
export function eventsFromFlags(added: string[], day: number, turn: number): WorldEvent[] {
  return added
    .filter((f) => FLAG_TEXT[f] || /^clue_/.test(f))
    .map((f) => {
      const clue = CLUES.find((c) => c.id === f);
      return clue
        ? { day, turn, kind: 'story' as const, text: `Tìm thấy manh mối: ${clue.title}` }
        : { day, turn, kind: /^(rival|bloodwolf|bunker|saved|abandoned)/.test(f) ? ('relation' as const) : ('story' as const), text: FLAG_TEXT[f] };
    });
}

export function buildWorldSummary(w: WorldInput): WorldSummary {
  const alive = w.companions.filter((c) => c.status !== 'deceased');
  const dead = w.companions.filter((c) => c.status === 'deceased');
  const food = countBy(w.inventory, /./, (i) => i.category === 'food' && !!i.hungerReduce);
  const water = countBy(w.inventory, /./, (i) => i.category === 'food' && !!i.thirstReduce);
  const meds = countBy(w.inventory, /./, (i) => i.category === 'medical');
  const fuel = countBy(w.inventory, /xăng|gas|củi/i);
  const whFood = countBy(w.base.warehouse, /./, (i) => i.category === 'food');
  const quests = computeQuests({ flags: w.flags, day: w.day, fortification: w.base.fortification, hasBase: w.base.hasBase, companionsAlive: alive.length });
  const factions = factionStanding(w.flags);
  const clues = clueCount(w.flags);
  const dn = (c: Companion) => c.name;

  const worldEvents = w.log.filter((e) => e.kind === 'world').slice(-4);
  const part1 = [
    `Ngày ${w.day}, lượt ${w.turn}. Thời tiết: ${w.weatherLabel}${w.forecastLabel ? ` · dự báo ngày mai: ${w.forecastLabel}` : ''}.`,
    `Đang ở: ${w.locationText}. Mức nguy hiểm hiện tại: ${w.dangerLevel}/5.`,
    w.day >= 10 ? 'Điện và nước toàn thành phố đã mất; đêm tối và khát là kẻ thù thường trực.' : w.day >= 7 ? 'Nước máy toàn thành phố đã cạn; chỉ còn nước đóng chai và nước mưa.' : 'Thành phố đã sụp đổ nhưng điện nước vẫn chập chờn.',
    w.visitedNames.length ? `Đã tới: ${w.visitedNames.join(', ')}.` : 'Chưa đi xa khỏi chỗ trú.',
    w.outpostNames.length ? `Cứ điểm đã nghe tin hoặc thấy dấu hiệu: ${w.outpostNames.join(', ')}.` : '',
    `Các nhóm người sống sót: ${factions.map((f) => `${f.name} (${f.standing})`).join('; ')}.`,
    ...worldEvents.map((e) => `Ngày ${e.day}: ${e.text}`),
  ].filter(Boolean);

  const mods = Object.entries(w.base.modules || {}).filter(([, v]) => v > 0).map(([k, v]) => `${MODULE_BY_ID[k]?.name || k} cấp ${v}`);
  const rivals = factions.find((f) => f.id === 'rival');
  const part2 = [
    `Nhân vật: máu ${w.stats.hp}/${w.stats.maxHp}, đói ${w.stats.hunger}, khát ${w.stats.thirst}, nhiễm độc ${w.stats.infection}%, tinh thần ${w.stats.sanity}, thể lực ${w.stats.stamina}. Vũ khí: ${w.equippedWeapon || 'tay không'}.`,
    w.base.hasBase ? `Căn cứ: ${w.base.name}, kiên cố ${w.base.fortification}%, nhiên liệu ${w.base.fuel || 0}${mods.length ? `, công trình: ${mods.join(', ')}` : ''}.` : 'Chưa có căn cứ cố định.',
    `Tài nguyên: ba lô ${food} thức ăn, ${water} nước, ${meds} y tế, ${fuel} nhiên liệu; kho căn cứ ${whFood} thức ăn.`,
    w.vehicle ? `Phương tiện: ${VEHICLES[w.vehicle.kind].name}, xăng ${Math.round(w.vehicle.fuel)}, độ bền ${Math.round(w.vehicle.condition)}%.` : 'Chưa có phương tiện.',
    alive.length ? `Đồng đội (${alive.length}): ${alive.map((c) => `${dn(c)} (tin ${c.trust}, thiện cảm ${c.affection || 0}${(c.assignments && c.assignments.length) || c.assignment ? `, làm ${((c.assignments && c.assignments.length ? c.assignments : [c.assignment]) as string[]).join('+')}` : ''})`).join('; ')}.` : 'Không có đồng đội.',
    dead.length ? `Đã mất: ${dead.map(dn).join(', ')}.` : '',
    rivals && rivals.tone !== 'unknown' ? `Quan hệ với nhóm đối thủ: ${rivals.standing}. Hai bên tranh giành tài nguyên, lựa chọn khó khăn sẽ ngày càng nhiều.` : 'Chưa chạm trán nhóm người sống sót đối thủ nào.',
    ...w.log.filter((e) => e.kind === 'survival' || e.kind === 'relation').slice(-4).map((e) => `Ngày ${e.day}: ${e.text}`),
  ].filter(Boolean);

  const open = quests.filter((q) => q.open && !q.done);
  const done = quests.filter((q) => q.done);
  const lasting = w.flags.filter((f) => FLAG_TEXT[f] && !/^clue_/.test(f)).map((f) => FLAG_TEXT[f]);
  const part3 = [
    `Bí ẩn dịch bệnh: ${clues}/6 manh mối. ${CLUES.filter((c) => w.flags.includes(c.id)).map((c) => c.title).join('; ') || 'Chưa có manh mối nào.'}`,
    clues >= 5 ? 'Sự thật: dịch bệnh bắt nguồn từ dự án quân sự "Mầm Xanh"; sau đợt sơ tán thành phố sẽ bị phong tỏa và ném bom.' : clues >= 3 ? 'Bạn nghi có một dự án bí mật đứng sau, nhưng chưa đủ bằng chứng.' : '',
    open.length ? `Nhiệm vụ đang dang dở: ${open.map((q) => `${q.title} [${q.progress}]`).join('; ')}.` : 'Chưa có nhiệm vụ nào đang mở.',
    done.length ? `Đã hoàn thành: ${done.map((q) => q.title).join('; ')}.` : '',
    lasting.length ? `Hệ quả dài hạn từ các quyết định: ${lasting.join('; ')}.` : 'Chưa có quyết định lớn nào để lại hệ quả.',
    ...w.log.filter((e) => e.kind === 'story').slice(-4).map((e) => `Ngày ${e.day}: ${e.text}`),
  ].filter(Boolean);

  const text = [
    `[THẾ GIỚI] ${part1.slice(0, 3).join(' ')}`,
    `[SINH TỒN] ${part2.join(' ')}`,
    `[CỐT TRUYỆN] ${part3.join(' ')}`,
  ].join('\n').slice(0, 2600);

  return { headline: `Ngày ${w.day} · ${alive.length} đồng đội · ${clues}/6 manh mối`, part1, part2, part3, text };
}
