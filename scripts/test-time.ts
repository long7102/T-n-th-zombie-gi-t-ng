// Kiểm thử thời gian đi loot và chuyển căn cứ: npx tsx scripts/test-time.ts
import { planTurn } from '../src/data/storyDirector.ts';
import { encodeMapAction, WORLD_NODES, settingForKind, baseInfoOf, OUTPOST_TEMPLATES } from '../src/data/worldMap.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };
const player = { stats: { hp: 100, maxHp: 100, hunger: 30, thirst: 30, stamina: 90, sanity: 70, infection: 0 }, wound: {}, inventory: [] };
const base: any = { player, base: { hasBase: true, fortification: 30, modules: {}, warehouse: [], facilities: {} }, history: [], doneSceneIds: ['milestone_1_hospital', 'r_a', 'r_b', 'r_c'], settingId: 'apartment_survivors', zone: 'shelter', day: 2, turnCount: 6, clock: 6, weather: 'clear', actionType: 'choice', currentLocation: 'x', flags: [], companions: [], sceneId: 'r_inventory_check' };

const near = WORLD_NODES.find((n) => n.region === 'near' && n.id !== 'home')!;
const far = WORLD_NODES.find((n) => n.region === 'far') || WORLD_NODES.find((n) => n.region === 'mid')!;
const trip = (n: any) => planTurn({ ...base, chosenAction: encodeMapAction(n.id, 'quick', 1, 0, 'đi loot') } as any);

const pn = trip(near), pf = trip(far);
check(pn.resolution.timeCost === 3 && pn.clock === 9, 'loot gần mất nửa ngày (3 nhịp): ' + pn.resolution.timeCost + ' clock ' + pn.clock);
check(pf.resolution.timeCost === 6 && pf.clock === 12 && pf.nextDay === 3, 'loot xa mất cả ngày (6 nhịp), sang ngày mới: ' + pf.resolution.timeCost + ' day ' + pf.nextDay);
const normal = planTurn({ ...base, chosenAction: 'Quan sát xung quanh', actionType: 'custom' } as any);
check(normal.clock === 8 && normal.nextDay === 2, 'hành động thường tốn 2 nhịp: ' + normal.clock);
check(pf.resolution.stats.hunger! > pn.resolution.stats.hunger!, 'đi xa thì đói khát nhiều hơn');
const legacy = planTurn({ ...base, clock: undefined, chosenAction: 'x', actionType: 'custom' } as any);
check(legacy.clock === 14, 'save cũ không có clock vẫn chạy: ' + legacy.clock);

check(settingForKind('hospital') === 'clinic_containment' && settingForKind('farm') === 'private_house' && settingForKind('bridge') === 'highway_traffic_breakdown', 'đổi căn cứ đổi môi trường theo loại điểm');
check(!!baseInfoOf(WORLD_NODES.find((n) => n.id === 'home')!), 'có thể quay lại chỗ ở cũ');
check(OUTPOST_TEMPLATES.length >= 8, 'đủ cứ điểm ngẫu nhiên');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
