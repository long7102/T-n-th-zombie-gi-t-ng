import { Item } from '../types/game';
import { rollLoot } from './lootTables';

// ====================================================================
// CĂN CỨ BỊ TẤN CÔNG
// Sức tấn công tăng theo ngày và loại kẻ địch; sức phòng thủ tính từ tường, tháp canh, người canh gác,
// bẫy đã giăng, vũ khí, chó và số người chiến đấu được. Kết quả có 4 mức, mỗi mức có hậu quả thật:
// mất độ kiên cố, hỏng công trình, bị cướp kho, đồng đội bị thương hoặc chết.
// ====================================================================

type Rng = () => number;

export type RaidType = 'zombie' | 'bandit' | 'rival' | 'wolves';
export type RaidMode = 'hold' | 'sortie' | 'evacuate';

export const RAID_LABEL: Record<RaidType, string> = {
  zombie: 'một bầy zombie bị tiếng động và mùi người thu hút',
  bandit: 'một toán cướp vũ trang đã dò ra căn cứ của bạn',
  rival: 'Đội Cây Cầu, nhóm mà bạn đã gây thù',
  wolves: 'băng Huyết Lang, kẻ vẫn chưa quên món nợ máu với bạn',
};

// Loại kẻ địch suy ra từ các mối thù đang có, nếu không thì luân phiên theo ngày
export function raidTypeFor(flags: string[], day: number): RaidType {
  if (flags.includes('rival_hostile')) return 'rival';
  if (flags.includes('bloodwolf_nemesis')) return 'wolves';
  return day % 2 === 0 ? 'bandit' : 'zombie';
}

export function raidDayOf(flags: string[]): number {
  return flags.reduce((m, f) => (f.startsWith('raid_day_') ? Math.max(m, parseInt(f.slice(9), 10) || 0) : m), 0);
}

export function attackStrength(type: RaidType, day: number, powerOn: boolean): number {
  const bonus: Record<RaidType, number> = { zombie: 6, bandit: 14, rival: 12, wolves: 20 };
  return 28 + day * 2.6 + bonus[type] + (powerOn ? 4 : 0); // máy phát ồn thu hút kẻ địch
}

export interface RaidCompanion { name: string; hp: number; status?: string; assignment?: string; traits?: string[]; role?: string; skills?: string[] }
export interface RaidInput {
  base: { fortification?: number; modules?: Record<string, number>; warehouse?: Item[]; facilities?: { hasGeneratorAndFridge?: boolean } };
  companions: RaidCompanion[];
  inventory: Item[];
  weaponDamage: number;
  flags: string[];
  day: number;
}

export function defenseScore(i: RaidInput): { score: number; parts: string[] } {
  const m = i.base.modules || {};
  const parts: string[] = [];
  let s = (i.base.fortification ?? 0) * 0.6;
  parts.push(`tường rào ${i.base.fortification ?? 0}%`);
  const tower = m.watchtower || 0;
  if (tower) { s += tower * 7; parts.push(`tháp canh cấp ${tower}`); }
  const walls = m.walls || 0;
  if (walls) s += walls * 3;
  const alive = i.companions.filter((c) => c.status !== 'deceased' && c.hp >= 20);
  const guards = alive.filter((c) => c.assignment === 'guard').length;
  if (guards) { s += guards * 11; parts.push(`${guards} người canh gác`); }
  s += (alive.length - guards) * 3.5; // những người còn lại vẫn cầm vũ khí được
  if (alive.length) parts.push(`${alive.length} người chiến đấu được`);
  if (i.weaponDamage) { s += i.weaponDamage / 6; parts.push(`vũ khí sát thương ${i.weaponDamage}`); }
  if (i.flags.includes('pet_dog')) { s += 4; parts.push('chó báo động'); }
  if (i.flags.includes('prep_traps')) { s += 15; parts.push('bẫy đã giăng'); }
  if (i.flags.includes('prep_guards')) { s += 10; parts.push('đã phân hướng canh gác'); }
  if (i.flags.includes('bunker13_heroes') || i.flags.includes('rival_allied')) { s += 6; parts.push('đồng minh hỗ trợ'); }
  return { score: s, parts };
}

export interface RaidResult {
  tier: 'decisive' | 'win' | 'costly' | 'breach' | 'evacuated';
  outcome: string;
  stats: { hp?: number; stamina?: number; sanity?: number };
  baseDelta: { fortification: number; moduleLoss: string[]; stolen: { name: string; quantity: number }[] };
  companionUpdates: any[];
  gain: Item[];
  flags: string[];
}

const pick = <T,>(a: T[], r: Rng): T => a[Math.floor(r() * a.length)];

const TIER_TEXT: Record<RaidType, Record<string, string[]>> = {
  zombie: {
    decisive: ['Bầy zombie xô tới nhưng vấp phải hàng rào và bẫy dây, ngã chồng lên nhau. Bạn và đồng đội hạ từng con qua khe chắn, hầu như không bị thương.'],
    win: ['Cuộc đối đầu kéo dài cả đêm. Vài tấm chắn bị xé toạc, nhưng chúng không vào được trong. Khi trời sáng, thi thể nằm la liệt trước cửa.'],
    costly: ['Bầy zombie phá vỡ một mảng hàng rào, tràn vào tầng dưới trước khi bạn kịp dồn chúng ra. Cả nhóm phải chiến đấu giáp lá cà trong bóng tối.'],
    breach: ['Hàng phòng thủ sụp đổ. Bầy zombie tràn vào như nước vỡ bờ, đồ đạc đổ ngổn ngang, tiếng thét và tiếng gầm lẫn vào nhau. Bạn phải bỏ cả mảng căn cứ để giữ lấy mạng sống.'],
  },
  bandit: {
    decisive: ['Toán cướp bị bẫy và loạt phản công bất ngờ làm cho hoảng loạn. Chúng bỏ lại vũ khí, kẻ chạy trước, kẻ chạy sau.'],
    win: ['Chúng thử cửa chính và cửa sau, bị chặn cả hai chỗ. Sau vài loạt đạn qua lại, bọn cướp rút đi để lại vết máu và vài món đồ.'],
    costly: ['Chúng phá được cửa phụ và xông vào, vơ vội một phần kho trước khi bạn kịp dồn chúng ra. Trận đánh trong hành lang chật chội thật khủng khiếp.'],
    breach: ['Bọn cướp đông và hung hãn hơn dự tính. Chúng làm chủ tầng dưới, cướp phá thoải mái trong khi bạn phải co cụm ở tầng trên, nhìn tài sản của mình bị khuân đi.'],
  },
  rival: {
    decisive: ['Đội Cây Cầu không ngờ bạn đã chuẩn bị kỹ đến thế. Thủ lĩnh bị bẫy làm bị thương và nhóm phải rút lui, thề sẽ không quay lại.'],
    win: ['Hai nhóm đấu nhau ở hành lang, ai cũng quen mặt đối phương. Sau một trận ác liệt, họ rút lui, và cả hai bên đều hiểu thù hận này còn dài.'],
    costly: ['Đội Cây Cầu biết rõ điểm yếu của bạn vì từng theo dấu bạn. Họ đánh thẳng vào đó, cướp một phần kho trước khi bị đẩy ra.'],
    breach: ['Họ đến đông và có chuẩn bị. Căn cứ bị chiếm từng phòng một, và bạn phải trốn chạy khỏi chính nơi mình đã dày công xây dựng.'],
  },
  wolves: {
    decisive: ['Huyết Lang xông vào cổng và gặp một biển bẫy và đạn. Tên đầu sỏ gục ngay ở bậc thềm, bọn còn lại bỏ chạy trong hỗn loạn.'],
    win: ['Chúng không còn là đám cướp ô hợp: chúng đánh có bài bản. Nhưng nhờ phòng thủ nhiều lớp, bạn giữ được căn cứ và buộc chúng rút.'],
    costly: ['Huyết Lang đánh vỡ cổng chính, cướp phá nhanh gọn và rút trước khi bạn kịp phản công. Tiếng cười của chúng vang lại từ cầu thang.'],
    breach: ['Cuộc trả thù tàn bạo: chúng đốt, cướp và đập phá. Khi chúng đi, căn cứ chỉ còn là một đống đổ nát đang âm ỉ khói.'],
  },
};

export function resolveRaid(mode: RaidMode, type: RaidType, i: RaidInput, rng: Rng = Math.random): RaidResult {
  const powerOn = !!i.base.facilities?.hasGeneratorAndFridge;
  const atk = attackStrength(type, i.day, powerOn);
  const def = defenseScore(i);
  const wh = i.base.warehouse || [];
  const hideFactor = i.flags.includes('prep_hide') ? 0.5 : 1;
  const result: RaidResult = { tier: 'win', outcome: '', stats: {}, baseDelta: { fortification: 0, moduleLoss: [], stolen: [] }, companionUpdates: [], gain: [], flags: [] };

  const steal = (frac: number) => {
    for (const it of wh) {
      if (rng() < Math.min(0.9, frac * 1.6)) {
        const q = Math.max(1, Math.ceil(it.quantity * frac * hideFactor));
        result.baseDelta.stolen.push({ name: it.name, quantity: Math.min(q, it.quantity) });
      }
    }
  };
  const loseModules = (n: number) => {
    const built = Object.entries(i.base.modules || {}).filter(([k, v]) => v > 0 && k !== 'walls').map(([k]) => k);
    for (let c = 0; c < n && built.length; c++) result.baseDelta.moduleLoss.push(built.splice(Math.floor(rng() * built.length), 1)[0]);
  };
  const hurt = (n: number, minDmg: number, maxDmg: number, deathChance: number) => {
    const pool = i.companions.filter((c) => c.status !== 'deceased');
    for (let k = 0; k < n && pool.length; k++) {
      const c = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const dmg = Math.round(minDmg + rng() * (maxDmg - minDmg));
      const dies = c.hp - dmg <= 0 || (c.hp < 45 && rng() < deathChance);
      result.companionUpdates.push(dies
        ? { name: c.name, statusChange: 'deceased', hpChange: -999, dialogue: undefined }
        : { name: c.name, hpChange: -dmg, moraleChange: -6, dialogue: 'Tôi... vẫn ổn. Chỉ là hơi đau thôi.' });
    }
  };

  if (mode === 'evacuate') {
    result.tier = 'evacuated';
    result.outcome = `Bạn dẫn cả nhóm rút theo lối thoát hiểm, bỏ lại căn cứ cho ${RAID_LABEL[type]}. Không ai bị thương, nhưng nhìn từ xa bạn thấy chúng lục tung mọi thứ. Khi quay lại, căn cứ nham nhở như vừa bị bão quét qua.`;
    result.stats = { stamina: -8, sanity: -6 };
    result.baseDelta.fortification = -12;
    steal(0.3);
    result.flags.push('raid_evacuated');
    return result;
  }

  // Phản công ra ngoài: dựa vào vũ khí và số người, nhưng rủi ro thương tích cao hơn
  const sortieBonus = mode === 'sortie' ? 6 + i.weaponDamage / 8 : 0;
  const margin = def.score + sortieBonus - atk + (rng() - 0.5) * 30;
  const injuryMul = mode === 'sortie' ? 1.4 : 1;

  if (margin >= 15) {
    result.tier = 'decisive';
    result.baseDelta.fortification = -2;
    result.stats = { hp: -Math.round(2 * injuryMul), stamina: -8, sanity: 3 };
    result.gain = rollLoot(type === 'zombie' ? 'household' : 'weapons', 2, rng);
    result.flags.push('raid_won');
  } else if (margin >= 0) {
    result.tier = 'win';
    result.baseDelta.fortification = -8;
    result.stats = { hp: -Math.round(6 * injuryMul), stamina: -12, sanity: -1 };
    result.gain = rollLoot(type === 'zombie' ? 'household' : 'weapons', 1, rng);
    hurt(1, 8, 18 * injuryMul, 0.05);
    result.flags.push('raid_won');
  } else if (margin >= -15) {
    result.tier = 'costly';
    result.baseDelta.fortification = -20;
    result.stats = { hp: -Math.round(12 * injuryMul), stamina: -16, sanity: -6 };
    loseModules(1);
    steal(0.25);
    hurt(1, 12, 26 * injuryMul, 0.25);
  } else {
    result.tier = 'breach';
    result.baseDelta.fortification = -35;
    result.stats = { hp: -Math.round(20 * injuryMul), stamina: -22, sanity: -12 };
    loseModules(2);
    steal(0.45);
    hurt(2, 15, 35 * injuryMul, 0.45);
    result.flags.push('base_breached');
  }

  const intro = mode === 'sortie' ? 'Bạn chọn xông ra chặn chúng ngay trước cổng. ' : 'Bạn giữ chặt phòng tuyến, từng người vào đúng vị trí. ';
  const detail = `\n\n(Sức phòng thủ ${Math.round(def.score)} so với sức tấn công ${Math.round(atk)}: ${def.parts.slice(0, 5).join(', ')}.)`;
  result.outcome = `${intro}${pick(TIER_TEXT[type][result.tier], rng)}${detail}`;
  return result;
}

// ---------- Xác suất bị tấn công ----------
// Căn cứ trông bình thường, im lìm thì không ai để ý. Chỉ khi nó nổi bật (tiếng máy phát, khói bếp,
// kho đầy ắp, người đông, xe đậu, có kẻ thù theo dõi) thì mới có xác suất bị nhắm tới.
export interface ExposureInput {
  base: { fortification?: number; modules?: Record<string, number>; warehouse?: Item[]; fortified?: string[]; facilities?: { hasGeneratorAndFridge?: boolean; hasStove?: boolean } };
  flags: string[];
  day: number;
  companionCount: number;
  hasVehicle: boolean;
}

export interface Exposure { score: number; chance: number; factors: { label: string; value: number }[] }

export function exposureOf(i: ExposureInput): Exposure {
  const m = i.base.modules || {};
  const f: { label: string; value: number }[] = [];
  const add = (label: string, value: number) => { if (value > 0) f.push({ label, value }); };
  add('Tiếng máy phát điện và ánh đèn', i.base.facilities?.hasGeneratorAndFridge || (m.generator || 0) > 0 ? 18 : 0);
  add('Khói từ bếp', (m.stove || 0) > 0 || i.base.facilities?.hasStove ? 7 : 0);
  add('Khói và mùi từ hầm biogas', (m.biogas || 0) > 0 ? 6 : 0);
  add('Vườn trên mái lộ ra từ xa', (m.garden || 0) > 0 ? 4 : 0);
  add('Tháp canh và chuông báo động nổi bật', (m.watchtower || 0) * 3);
  const stock = (i.base.warehouse || []).filter((x) => x.category === 'food').reduce((s, x) => s + x.quantity, 0);
  add('Kho lương thực đầy ắp', stock >= 40 ? 14 : stock >= 20 ? 7 : 0);
  add('Nhiều người qua lại', Math.max(0, i.companionCount - 1) * 2);
  add('Xe đậu ngoài căn cứ', i.hasVehicle ? 5 : 0);
  add('Số ngày càng dài, càng nhiều kẻ lùng sục', Math.max(0, i.day - 3) * 0.8);
  add('Băng Huyết Lang đang truy sát bạn', i.flags.includes('bloodwolf_nemesis') ? 28 : 0);
  add('Đội Cây Cầu đang thù bạn', i.flags.includes('rival_hostile') ? 22 : 0);
  add('Từng bị đột nhập (kẻ khác đã biết chỗ)', i.flags.includes('base_breached') ? 10 : 0);
  // Các việc đã làm để che giấu (che cửa sổ, giấu vật tư, im lặng) giảm mức lộ diện
  const stealth = (i.base.fortified || []).reduce((s, id) => s + (({ dim_light: 6, hide_stock: 6, quiet_floor: 4 } as Record<string, number>)[id] || 0), 0);
  const score = Math.max(0, f.reduce((s, x) => s + x.value, 0) - stealth);
  // Dưới 14 điểm: căn cứ trông bình thường, không ai tấn công. Từ đó trở lên tăng dần, tối đa 20% mỗi lượt.
  const chance = Math.max(0, Math.min(0.2, (score - 14) * 0.006));
  return { score: Math.round(score), chance, factors: f.sort((a, b) => b.value - a.value) };
}
