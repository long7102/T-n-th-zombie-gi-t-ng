// Kiểm thử đơn vị kg/lít, thể lực và khởi đầu một mình: npx tsx scripts/test-units.ts
import { planTurn, renderOfflineTurn, staminaDrift } from '../src/data/storyDirector.ts';
import { fmtQty, servingOf } from '../src/data/units.ts';
import { STARTING_SCENARIOS } from '../src/data/startingScenarios.ts';
import { rollLoot } from '../src/data/lootTables.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };

const rice: any = { id: 'r', name: 'Gạo tẻ', category: 'food', unit: 'kg', quantity: 2, hungerReduce: 350, needsCooking: true, rarity: 'common', description: '' };
const water: any = { id: 'w', name: 'Nước máy trữ', category: 'food', unit: 'l', quantity: 6, thirstReduce: 55, rarity: 'common', description: '' };
check(fmtQty(rice) === '2 kg' && fmtQty({ ...rice, quantity: 0.4 }) === '400 g' && fmtQty(water) === '6 L', 'định dạng kg/L: ' + fmtQty(rice) + ' | ' + fmtQty({ ...rice, quantity: 0.4 }) + ' | ' + fmtQty(water));
check(fmtQty({ name: 'x', quantity: 3, thirstReduce: 45 } as any) === 'x3 chai', 'nước đếm theo chai');
check(servingOf(rice, 1).used === 0.1 && servingOf(rice, 3).used === 0.3, 'mỗi người một bữa 100 g gạo, không phải 5 kg');
check(servingOf(water).used === 0.5, 'uống từ can: 0,5 lít một lần');

const player = (inv: any[]) => ({ stats: { hp: 100, maxHp: 100, hunger: 70, thirst: 70, stamina: 80, sanity: 70, infection: 0 }, wound: {}, inventory: inv });
const base = { base: {}, history: [], doneSceneIds: ['r_a', 'r_b', 'r_c', 'r_d', 'r_e'], settingId: 'apartment_survivors', zone: 'shelter', day: 3, turnCount: 8, weather: 'clear', actionType: 'choice', currentLocation: 'x', flags: [] };
const comp = (n: string) => ({ id: n, name: n, gender: 'female', age: 28, hp: 80, maxHp: 100, morale: 60, trust: 50, affection: 30, status: 'healthy', traits: [], intimacyLevel: 'friend' });
const run = (o: any) => renderOfflineTurn({ ...base, ...o }, planTurn({ ...base, ...o })) as any;
const solo = run({ player: player([rice]), companions: [], sceneId: 'r_cook_big', chosenAction: 'Nấu một nồi cháo hoặc cơm đặc, ăn thật no' });
const lost1 = (solo.itemsLost || []).find((l: any) => /gạo/i.test(l.name));
check(!!lost1 && lost1.quantity <= 0.2, 'một mình chỉ tốn ~100-140 g gạo mỗi bữa: ' + JSON.stringify(solo.itemsLost));
const trio = run({ player: player([rice]), companions: [comp('A'), comp('B')], sceneId: 'r_cook_big', chosenAction: 'Nấu một nồi cháo hoặc cơm đặc, ăn thật no' });
const lost3 = (trio.itemsLost || []).find((l: any) => /gạo/i.test(l.name));
check(!!lost3 && lost3.quantity > lost1.quantity * 2.5 && lost3.quantity < 0.6, 'ba người ăn nhiều gạo hơn theo đầu người: ' + (lost3 && lost3.quantity));
const drink = run({ player: player([water]), companions: [], sceneId: 'r_water_need', chosenAction: 'drink' });
void drink;

// Khởi đầu một mình trong chung cư
const apt = STARTING_SCENARIOS.find((s) => s.id === 'apartment_survivors')!;
check(!/người hàng xóm|người đàn ông|3 người|Cùng Những Người/.test(apt.title + apt.description + apt.openingNarrative), 'chung cư khởi đầu một mình, không có ai bên cạnh');
check(apt.initialItems.some((i) => i.unit === 'kg') && apt.initialItems.some((i) => i.unit === 'l'), 'khởi đầu có gạo theo kg và nước theo lít');

// Loot gạo theo kg
const bag = rollLoot('warehouse', 40).filter((i) => /Gạo/.test(i.name));
check(bag.every((i) => i.unit === 'kg'), 'gạo loot được tính theo kg');

// Thể lực: ở chỗ trú đủ ăn uống thì không tụt, ra ngoài thì hao vừa phải
const calm = { hasBase: true, hunger: 30, thirst: 30 };
check(staminaDrift('shelter', calm, false) >= 0, 'ở yên trong chỗ trú không được mất thể lực: ' + staminaDrift('shelter', calm, false));
check(staminaDrift('outside', calm, false) >= -6 && staminaDrift('outside', calm, false) < 0, 'ra ngoài hao vừa phải');
check(staminaDrift('shelter', { ...calm, hunger: 90 }, false) < staminaDrift('shelter', calm, false), 'đói nặng thì kiệt nhanh hơn');
check(staminaDrift('shelter', calm, true) >= 12, 'qua đêm ở chỗ trú hồi sức');

// Mô phỏng 10 lượt đầu: thể lực không được cạn
let st = 85;
for (let t = 0; t < 10; t++) {
  const z = t % 3 === 2 ? 'near' : 'shelter';
  st = Math.max(0, Math.min(100, st + staminaDrift(z as any, { hasBase: true, hunger: 20 + t * 3, thirst: 25 + t * 3 }, t % 3 === 0 && t > 0) - 3));
}
check(st >= 55, '10 lượt đầu không được hết thể lực, còn ' + st);

// Cảnh trữ nước xuất hiện ở ngày đầu
let seen = false;
for (let i = 0; i < 80 && !seen; i++) {
  const p = planTurn({ ...base, doneSceneIds: ['milestone_1_hospital', 'r_a', 'r_b', 'r_c'], day: 1, turnCount: 3, player: player([]), companions: [], sceneId: 'r_inventory_check' } as any);
  if (p.next.id === 'r_fill_water') seen = true;
}
check(seen, 'ngày đầu phải có cảnh xả nước trữ');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
