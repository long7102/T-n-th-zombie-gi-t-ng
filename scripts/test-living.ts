// Kiểm thử đói/khát tự bổ sung, trái cây theo mùa, trang bị nhiều ô, căn cứ ở mọi điểm, cảnh ấm áp: npx tsx scripts/test-living.ts
import { pickFood, pickWater } from '../src/utils/needs.ts';
import { rollLoot } from '../src/data/lootTables.ts';
import { slotOf, damageReduction, totalDefense } from '../src/data/equipment.ts';
import { WORLD_NODES, baseInfoOf } from '../src/data/worldMap.ts';
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };
const f = (o: any): any => ({ id: o.name, category: 'food', quantity: 1, rarity: 'common', description: '', ...o });

// 1) Thứ tự ưu tiên khi đói
const cooked = f({ name: 'Cơm nấu chín', hungerReduce: 40, isCooked: true, canSpoil: true, freshness: 80 });
const dried = f({ name: 'Thịt khô', hungerReduce: 30, isDried: true });
const canned = f({ name: 'Đồ hộp cá', hungerReduce: 35, isSealed: true });
const fruit = f({ name: 'Chuối tiêu', hungerReduce: 18, canSpoil: true, freshness: 60 });
const rawRice = f({ name: 'Gạo tẻ', unit: 'kg', hungerReduce: 350, needsCooking: true });
check(pickFood([canned, dried, fruit, cooked]).item?.name === 'Cơm nấu chín', 'ưu tiên đồ đã nấu chín trước');
check(pickFood([canned, dried, fruit]).item?.name === 'Thịt khô', 'rồi tới đồ bảo quản lâu');
check(pickFood([canned, fruit]).item?.name === 'Đồ hộp cá', 'rồi tới đồ hộp (vĩnh cửu)');
check(pickFood([fruit]).item?.name === 'Chuối tiêu', 'còn lại mới tới đồ tươi');
check(pickFood([rawRice]).item === null && pickFood([rawRice]).tier === 'raw', 'chỉ còn đồ sống thì không tự ăn, nhắc nấu');
check(pickFood([f({ name: 'Cơm ôi', hungerReduce: 40, isCooked: true, canSpoil: true, freshness: 10 }), canned]).item?.name === 'Đồ hộp cá', 'đồ ôi thiu bị bỏ qua');
const cleanW = f({ name: 'Chai nước khoáng', thirstReduce: 45, isSealed: true });
const tapW = f({ name: 'Nước máy trữ', unit: 'l', quantity: 5, thirstReduce: 55, needsCooking: true });
check(pickWater([tapW, cleanW]).item?.name === 'Chai nước khoáng', 'uống nước sạch trước, không tự uống nước chưa đun');
check(pickWater([tapW]).tier === 'raw' && pickWater([tapW]).item === null, 'chỉ còn nước chưa đun thì nhắc đun');

// 2) Trái cây theo mùa
const names = (m: number) => new Set(Array.from({ length: 60 }, () => rollLoot('forage', 6, Math.random, m)).flat().map((i) => i.name));
const summer = names(6), winter = names(12);
check(summer.has('Vải thiều') && !winter.has('Vải thiều'), 'vải thiều chỉ có mùa hè');
check(winter.has('Quýt') && !summer.has('Quýt'), 'quýt chỉ có mùa đông');

// 3) Trang bị nhiều ô
check(slotOf({ name: 'Ủng cao su' }) === 'feet' && slotOf({ name: 'Quần jean dày' }) === 'legs' && slotOf({ name: 'Áo khoác da dày' }) === 'body' && slotOf({ name: 'Mũ bảo hiểm xe máy' }) === 'head' && slotOf({ name: 'Găng da' }) === 'hands', 'nhận ra đúng ô trang bị theo tên');
const eq: any = { body: { defense: 6 }, legs: { defense: 3 }, feet: { defense: 5 }, head: { defense: 5 } };
check(totalDefense(eq) === 19 && damageReduction(eq) > 0.3, 'phòng thủ cộng dồn các ô: ' + totalDefense(eq));
const base: any = { player: { stats: { hp: 100, maxHp: 100, hunger: 30, thirst: 30, stamina: 80, sanity: 70, infection: 0 }, wound: {}, inventory: [{ id: 'k', name: 'Dao', category: 'weapon', quantity: 1, rarity: 'common', description: '' }] }, base: {}, history: [], doneSceneIds: ['milestone_1_hospital', 'r_a', 'r_b', 'r_c'], settingId: 'apartment_survivors', zone: 'shelter', day: 4, turnCount: 12, weather: 'clear', actionType: 'custom', currentLocation: 'x', flags: [], companions: [], sceneId: 'r_inventory_check', chosenAction: 'Tấn công con zombie' };
let hpNo = 0, hpYes = 0;
for (let i = 0; i < 40; i++) {
  hpNo += (renderOfflineTurn(base, planTurn(base)) as any).statChanges.hp;
  const w = { ...base, player: { ...base.player, equipment: eq } };
  hpYes += (renderOfflineTurn(w, planTurn(w)) as any).statChanges.hp;
}
check(hpYes > hpNo, 'mặc đủ trang bị thì mất ít máu hơn: ' + hpNo + ' vs ' + hpYes);

// 4) Lập căn cứ ở mọi điểm
const hosp = WORLD_NODES.find((n) => n.kind === 'hospital')!;
check(!!baseInfoOf(hosp) && baseInfoOf(hosp)!.baseScore > 0, 'bệnh viện lập căn cứ được dù không phải cứ điểm ngẫu nhiên');
check(WORLD_NODES.filter((n) => n.id !== 'home').every((n) => !!baseInfoOf(n)), 'mọi điểm trên bản đồ đều có thông tin căn cứ');
check(baseInfoOf(WORLD_NODES.find((n) => n.id === 'home')!) === null, 'chỗ ở hiện tại không tính là điểm để chuyển');

// 5) Cảnh ấm áp xuất hiện khi có đồng đội
const comp = (n: string, trust = 60, morale = 50) => ({ id: n, name: n, gender: 'female', age: 28, hp: 80, maxHp: 100, morale, trust, affection: 40, status: 'healthy', traits: [], intimacyLevel: 'friend' });
const warm = new Set<string>();
for (let i = 0; i < 500; i++) {
  const req = { ...base, actionType: 'choice', chosenAction: 'x', weather: 'night_dark', day: 6, turnCount: 20, companions: [comp('A', 70, 45), comp('B', 40, 55)], doneSceneIds: ['milestone_1_hospital', 'milestone_2_bloodwolf_raiders', 'milestone_3_bunker13_distress', 'milestone_4_mutation_crisis', 'r_x', 'r_y', 'r_z', 'r_w', 'r_v'] };
  const id = planTurn(req).next.id;
  if (/^r_(cook_together|card_night|teach_skill|birthday|nightmare|story_circle|mend_clothes|makeup|first_laugh)$/.test(id)) warm.add(id);
}
check(warm.size >= 4, 'nhiều kiểu cảnh sinh hoạt chung xuất hiện: ' + [...warm].join(', '));

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
