// Kiểm thử hệ thống căn cứ bị tấn công: npx tsx scripts/test-raid.ts
import { resolveRaid, defenseScore, exposureOf } from '../src/data/raid.ts';
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';
import { applyBaseDelta } from '../src/utils/baseSystem.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };

const wh = [{ id: 'a', name: 'Đồ hộp', category: 'food', quantity: 10 }, { id: 'b', name: 'Gạo', category: 'food', quantity: 6 }] as any[];
const strong = { base: { fortification: 90, modules: { watchtower: 3, walls: 4, garden: 1 }, warehouse: wh }, companions: [{ name: 'A', hp: 90, assignment: 'guard' }, { name: 'B', hp: 90, assignment: 'guard' }, { name: 'C', hp: 80 }], inventory: [], weaponDamage: 40, flags: ['prep_traps', 'prep_guards'], day: 8 };
const weak = { base: { fortification: 10, modules: { garden: 1, stove: 1 }, warehouse: wh }, companions: [{ name: 'A', hp: 40 }], inventory: [], weaponDamage: 0, flags: [], day: 8 };

const tally = (inp: any, mode: any, type: any) => {
  const t: Record<string, number> = {};
  for (let i = 0; i < 300; i++) { const r = resolveRaid(mode, type, inp); t[r.tier] = (t[r.tier] || 0) + 1; }
  return t;
};
const s = tally(strong, 'hold', 'bandit');
const w = tally(weak, 'hold', 'bandit');
const goodStrong = (s.decisive || 0) + (s.win || 0);
const goodWeak = (w.decisive || 0) + (w.win || 0);
check(goodStrong > 240, 'phòng thủ mạnh phải thắng gần như luôn: ' + JSON.stringify(s));
check(goodWeak < 60 && (w.breach || 0) > 100, 'phòng thủ yếu phải thường xuyên bị chọc thủng: ' + JSON.stringify(w));
check(defenseScore(strong).score > defenseScore(weak).score + 40, 'điểm phòng thủ phải phản ánh khác biệt');

// Rút lui: không ai bị thương, nhưng căn cứ bị cướp và mất kiên cố
const ev = resolveRaid('evacuate', 'zombie', weak);
check(ev.tier === 'evacuated' && ev.baseDelta.fortification < 0 && ev.companionUpdates.length === 0, 'rút lui phải giữ mạng người nhưng mất đồ');

// Chuẩn bị giấu vật tư giảm lượng bị cướp
let stolenHide = 0, stolenNo = 0;
for (let i = 0; i < 300; i++) {
  stolenHide += resolveRaid('evacuate', 'bandit', { ...weak, flags: ['prep_hide'] }).baseDelta.stolen.reduce((a, b) => a + b.quantity, 0);
  stolenNo += resolveRaid('evacuate', 'bandit', weak).baseDelta.stolen.reduce((a, b) => a + b.quantity, 0);
}
check(stolenHide < stolenNo * 0.8, 'giấu vật tư phải giảm đồ bị cướp: ' + stolenHide + ' vs ' + stolenNo);

// Áp hậu quả lên căn cứ
const baseObj: any = { hasBase: true, name: 'X', fortification: 50, modules: { garden: 2 }, warehouse: wh.map((i) => ({ ...i })), facilities: { hasStove: false } };
const after = applyBaseDelta(baseObj, { fortification: -20, moduleLoss: ['garden'], stolen: [{ name: 'Gạo', quantity: 6 }, { name: 'Đồ hộp', quantity: 3 }] });
check(after.fortification === 30 && after.modules!.garden === 1 && !after.warehouse.some((i: any) => i.name === 'Gạo') && after.warehouse.find((i: any) => i.name === 'Đồ hộp')!.quantity === 7, 'applyBaseDelta phải áp đúng');

// Tích hợp: cảnh báo xuất hiện, rồi trận tấn công, rồi hậu quả
const req: any = { player: { stats: { hp: 100, maxHp: 100, hunger: 20, thirst: 20, stamina: 90, sanity: 70, infection: 0 }, wound: {}, inventory: [] }, base: { hasBase: true, fortification: 40, modules: {}, warehouse: wh, facilities: {} }, companions: [], history: [], settingId: 'apartment_survivors', zone: 'shelter', weather: 'clear', actionType: 'choice', flags: [], currentLocation: 'x' };
const done = ['milestone_1_hospital', 'milestone_2_bloodwolf_raiders', 'milestone_3_bunker13_distress', 'milestone_4_mutation_crisis', 'r_x', 'r_y', 'r_z', 'r_w', 'r_v'];
// Xác suất: căn cứ bình thường thì không ai tấn công; căn cứ lộ diện mới có xác suất bị nhắm tới
const countWarn = (extra: any) => {
  let n = 0;
  for (let t = 12; t < 612; t++) {
    const p = planTurn({ ...req, ...extra, day: Math.floor(t / 3) + 1, turnCount: t, sceneId: 'r_inventory_check', doneSceneIds: done });
    if (p.next.id === 'r_raid_warning') n++;
  }
  return n;
};
const plain = countWarn({});
check(plain === 0, 'căn cứ trông bình thường thì KHÔNG được bị tấn công, nhưng bị cảnh báo ' + plain + ' lần');
const loud = countWarn({ base: { ...req.base, modules: { generator: 2, stove: 1, biogas: 1 }, facilities: { hasGeneratorAndFridge: true, hasStove: true } }, flags: ['rival_hostile'] });
check(loud > 0 && loud < 400, 'căn cứ lộ diện phải có XÁC SUẤT bị nhắm tới (không chắc chắn, không bao giờ), got ' + loud + '/600');
const mid = countWarn({ base: { ...req.base, facilities: { hasGeneratorAndFridge: true } } });
const exOf = (b: any, f: string[]) => exposureOf({ base: b, flags: f, day: 12, companionCount: 0, hasVehicle: false }).chance;
check(exOf({ ...req.base, facilities: { hasGeneratorAndFridge: true } }, []) < exOf({ ...req.base, modules: { generator: 2, stove: 1, biogas: 1 }, facilities: { hasGeneratorAndFridge: true, hasStove: true } }, ['rival_hostile']), 'ít lộ diện hơn thì xác suất bị tấn công thấp hơn');
void mid;
const w1 = renderOfflineTurn({ ...req, day: 8, turnCount: 22, sceneId: 'r_raid_warning', doneSceneIds: done, chosenAction: 'Giăng bẫy dây, dựng chướng ngại quanh các lối vào' }, planTurn({ ...req, day: 8, turnCount: 22, sceneId: 'r_raid_warning', doneSceneIds: done, chosenAction: 'Giăng bẫy dây, dựng chướng ngại quanh các lối vào' })) as any;
check(w1.flags_add.includes('raid_warned') && w1.flags_add.includes('prep_traps') && w1.flags_add.some((f: string) => f.startsWith('raid_type_')), 'chuẩn bị phải ghi cờ cảnh báo, bẫy, loại kẻ địch: ' + w1.flags_add);
const flags = [...w1.flags_add];
const p2 = planTurn({ ...req, day: 8, turnCount: 23, sceneId: 'r_inventory_check', doneSceneIds: done, flags });
check(p2.next.id === 'r_base_attack', 'sau khi chuẩn bị, lượt kế tiếp phải là trận tấn công, got ' + p2.next.id);
const atk = renderOfflineTurn({ ...req, day: 8, turnCount: 23, sceneId: 'r_base_attack', doneSceneIds: done, flags, chosenAction: 'Giữ vững phòng tuyến, mỗi người một vị trí' }, planTurn({ ...req, day: 8, turnCount: 23, sceneId: 'r_base_attack', doneSceneIds: done, flags, chosenAction: 'Giữ vững phòng tuyến, mỗi người một vị trí' })) as any;
check(atk.base_delta && typeof atk.base_delta.fortification === 'number', 'trận tấn công phải trả base_delta');
check(atk.flags_remove.includes('raid_warned') && atk.flags_add.some((f: string) => f.startsWith('raid_day_')), 'sau trận phải xóa cờ cảnh báo và ghi ngày bị tấn công');
check(/Sức phòng thủ/.test(atk.outcome), 'kết quả phải giải thích sức phòng thủ vs tấn công');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
