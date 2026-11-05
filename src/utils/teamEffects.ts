import { Companion, Item } from '../types/game';
import { ROLES, RoleId, roleFit, rolesOf, roleAptitude } from '../data/companionChat';
import { rollLoot } from '../data/lootTables';
import { fmtNamed } from '../data/units';

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
    const roles = rolesOf(c);
    if (!roles.length || c.status === 'deceased' || c.status === 'unconscious') continue;
    const name = c.name;
    if (c.hp < 25 || c.morale < 20) {
      out.log.push(`${name} quá kiệt sức nên không làm nổi việc được giao (${roles.map((r) => ROLES[r].label).join(', ')}).`);
      continue;
    }
    // Ôm nhiều việc thì mỗi việc làm kém đi và người đó mệt hơn
    const load = 1 / (1 + 0.28 * (roles.length - 1));
    const resting = roles.includes('rest');
    out.companionDelta[c.id] = { morale: resting ? 4 : -1 - Math.max(0, roles.length - 1), hp: resting ? 8 : 0 };
    if (roles.length > 1 && !resting) out.log.push(`${name} đang gánh ${roles.length} việc cùng lúc nên làm việc nào cũng chỉ được một phần sức.`);

    for (const role of roles) {
      const fit = roleFit(role, c);
      const k = (fit === 'great' ? 1.5 : fit === 'poor' ? 0.6 : 1) * roleAptitude(role, c as any) * load;
      switch (role) {
        case 'guard':
          out.sanity += Math.max(0, Math.round(1 * k));
          out.log.push(`${name} canh gác cẩn thận, cả nhóm ngủ yên tâm hơn.`);
          break;
        case 'cook':
          out.hunger -= Math.max(1, Math.round(3 * k));
          out.sanity += 1;
          out.log.push(`${name} lo bữa ăn chung, mọi người no hơn chút ít.`);
          break;
        case 'scout':
          if (rng() < 0.3 * k) {
            const got = rollLoot('household', 1, rng);
            out.loot.push(...got);
            out.log.push(`${name} đi trinh sát và mang về ${got.map((g) => fmtNamed(g)).join(', ')}.`);
          } else out.log.push(`${name} đi thăm dò quanh khu vực nhưng chưa thấy gì đáng giá.`);
          break;
        case 'repair':
          if (hasBase) {
            const add = Math.max(1, Math.round(2 * k));
            out.fortification += add;
            out.log.push(`${name} gia cố thêm các điểm yếu, căn cứ kiên cố thêm ${add}%.`);
          } else out.log.push(`${name} muốn gia cố nhưng nhóm chưa có căn cứ cố định.`);
          break;
        case 'medic':
          out.infection -= Math.max(1, Math.round((hasWound ? 4 : 2) * k));
          out.log.push(`${name} chăm sóc vết thương và theo dõi dấu hiệu nhiễm trùng cho cả nhóm.`);
          break;
        case 'forage':
          if (rng() < 0.35 * k) {
            const got = rollLoot(rng() < 0.5 ? 'forage' : 'pond', 1, rng);
            out.loot.push(...got);
            out.log.push(`${name} đi kiếm ăn và mang về ${got.map((g) => fmtNamed(g)).join(', ')}.`);
          } else out.log.push(`${name} đi kiếm đồ ăn nhưng về tay không.`);
          break;
        case 'rest':
          out.log.push(`${name} nghỉ ngơi dưỡng sức.`);
          break;
      }
    }
  }
  return out;
}
