import { Companion, Item } from '../types/game';
import { ROLES, RoleId, roleFit } from '../data/companionChat';
import { rollLoot } from '../data/lootTables';

// Hiệu ứng mỗi lượt của việc đã phân công cho đồng đội. Người làm đúng sở trường cho kết quả tốt hơn;
// người kiệt sức, bị thương nặng hoặc tinh thần thấp sẽ không làm việc.
export interface TeamResult {
  sanity: number;
  hunger: number;
  infection: number;
  fortification: number;
  loot: Item[];
  log: string[];
  companionDelta: Record<string, { morale?: number; hp?: number }>;
}

export function computeTeamEffects(companions: Companion[], hasBase: boolean, hasWound: boolean, flags: string[] = [], rng: () => number = Math.random): TeamResult {
  const out: TeamResult = { sanity: 0, hunger: 0, infection: 0, fortification: 0, loot: [], log: [], companionDelta: {} };
  if (flags.includes('pet_dog')) {
    out.sanity += 1;
    out.log.push(rng() < 0.4 ? 'Con chó hoang sủa gắt về phía cầu thang rồi im bặt: nó vừa báo động một thứ gì đó lảng vảng ngoài kia.' : 'Con chó nằm cuộn dưới chân cửa, tai vẫn vểnh lên canh gác.');
  }
  for (const c of companions) {
    const role = (c.assignment || 'none') as RoleId;
    if (role === 'none' || c.status === 'deceased' || c.status === 'unconscious') continue;
    const name = c.name;
    if (c.hp < 25 || c.morale < 20) {
      out.log.push(`${name} quá kiệt sức nên không làm nổi việc được giao (${ROLES[role].label}).`);
      continue;
    }
    const fit = roleFit(role, c);
    const k = fit === 'great' ? 1.5 : fit === 'poor' ? 0.6 : 1;
    const tired = { morale: role === 'rest' ? 4 : -1, hp: role === 'rest' ? 8 : 0 };
    out.companionDelta[c.id] = tired;

    switch (role) {
      case 'guard':
        out.sanity += Math.round(1 * k);
        out.log.push(`${name} canh gác cẩn thận, cả nhóm ngủ yên tâm hơn.`);
        break;
      case 'cook':
        out.hunger -= Math.round(3 * k);
        out.sanity += 1;
        out.log.push(`${name} lo bữa ăn chung, mọi người no hơn chút ít.`);
        break;
      case 'scout':
        if (rng() < 0.3 * k) {
          const got = rollLoot('household', 1, rng);
          out.loot.push(...got);
          out.log.push(`${name} đi trinh sát và mang về ${got.map((g) => `${g.name} x${g.quantity}`).join(', ')}.`);
        } else out.log.push(`${name} đi thăm dò quanh khu vực nhưng chưa thấy gì đáng giá.`);
        break;
      case 'repair':
        if (hasBase) {
          const add = Math.round(2 * k);
          out.fortification += add;
          out.log.push(`${name} gia cố thêm các điểm yếu, căn cứ kiên cố thêm ${add}%.`);
        } else out.log.push(`${name} muốn gia cố nhưng nhóm chưa có căn cứ cố định.`);
        break;
      case 'medic':
        out.infection -= Math.round((hasWound ? 4 : 2) * k);
        out.log.push(`${name} chăm sóc vết thương và theo dõi dấu hiệu nhiễm trùng cho cả nhóm.`);
        break;
      case 'forage':
        if (rng() < 0.35 * k) {
          const got = rollLoot(rng() < 0.5 ? 'forage' : 'pond', 1, rng);
          out.loot.push(...got);
          out.log.push(`${name} đi kiếm ăn và mang về ${got.map((g) => `${g.name} x${g.quantity}`).join(', ')}.`);
        } else out.log.push(`${name} đi kiếm đồ ăn nhưng về tay không.`);
        break;
      case 'rest':
        out.log.push(`${name} nghỉ ngơi dưỡng sức.`);
        break;
    }
  }
  return out;
}
