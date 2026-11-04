// Kiểm thử cứu người chọn nhận hay không, hành động tự nhập, gia cố, sự kiện đúng chỗ: npx tsx scripts/test-realism.ts
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';
import { RANDOM_EVENTS } from '../src/data/randomEvents.ts';
import { fortifyActionsFor } from '../src/utils/baseSystem.ts';
import { exposureOf } from '../src/data/raid.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };
const player = (inv: any[] = []) => ({ stats: { hp: 100, maxHp: 100, hunger: 40, thirst: 40, stamina: 80, sanity: 70, infection: 0 }, wound: {}, inventory: inv });
const base: any = { base: { hasBase: true, fortification: 30, modules: {}, warehouse: [], facilities: {} }, history: [], doneSceneIds: ['milestone_1_hospital', 'r_a', 'r_b', 'r_c', 'r_d'], settingId: 'apartment_survivors', zone: 'shelter', day: 4, turnCount: 12, weather: 'clear', actionType: 'choice', currentLocation: 'x', flags: [], companions: [] };
const run = (o: any) => { const req = { ...base, ...o }; return renderOfflineTurn(req, planTurn(req)) as any; };

// 1) Cứu người: phải hỏi nhận hay không
const ev = RANDOM_EVENTS.find((e) => e.survivorCandidate && e.choices.some((c) => c.rescuesCompanion))!;
const rescue = ev.choices.find((c) => c.rescuesCompanion)!;
const saved = run({ player: player([{ id: 'g', name: 'Băng gạc', category: 'medical', quantity: 3, rarity: 'common', description: '' }, { id: 'f', name: 'Đồ hộp', category: 'food', quantity: 2, hungerReduce: 30, rarity: 'common', description: '' }, { id: 'm', name: 'Cồn', category: 'medical', quantity: 1, rarity: 'common', description: '' }, { id: 'k', name: 'Súng Colt', category: 'weapon', quantity: 1, rarity: 'common', description: '' }, { id: 'mo', name: 'Molotov', category: 'weapon', quantity: 1, rarity: 'common', description: '' }]), sceneId: ev.id, chosenAction: rescue.text });
check(!saved.newCompanion && !!saved.pending_recruit, 'cứu người chưa được tự động nhận vào nhóm, phải chờ quyết định: ' + JSON.stringify(Object.keys(saved)));
const who = saved.pending_recruit;
const decide = planTurn({ ...base, player: player(), sceneId: ev.id, pendingRecruit: who, chosenAction: 'x' } as any);
check(decide.next.id === 'r_recruit_decision' && decide.next.choices.length === 3, 'lượt kế tiếp phải là cảnh quyết định nhận người: ' + decide.next.id);
const accept = run({ player: player(), sceneId: 'r_recruit_decision', pendingRecruit: who, chosenAction: decide.next.choices[0] });
check(!!accept.newCompanion && accept.pending_recruit === null, 'chọn nhận thì người đó vào nhóm và xóa trạng thái chờ');
const decline = run({ player: player(), sceneId: 'r_recruit_decision', pendingRecruit: who, chosenAction: decide.next.choices[2] });
check(!decline.newCompanion && decline.pending_recruit === null, 'từ chối thì không ai vào nhóm');
const full = run({ player: player(), companions: [1, 2, 3].map((n) => ({ id: 'c' + n, name: 'C' + n, status: 'healthy', trust: 50, morale: 50, hp: 80, affection: 10, traits: [], gender: 'male' })), sceneId: 'r_recruit_decision', pendingRecruit: who, chosenAction: decide.next.choices[0] });
check(!full.newCompanion, 'nhóm đủ 3 người thì không nhận thêm');

// 2) Hành động tự nhập được thực thi đúng ý
const kitchen = run({ player: player(), sceneId: 'r_inventory_check', actionType: 'custom', chosenAction: 'Vét sạch tủ bếp, lấy hết mọi nguyên liệu nấu ăn' });
check(kitchen.itemsGained.length >= 8, 'lấy hết nguyên liệu bếp phải ra nhiều món, được ' + kitchen.itemsGained.length);
check(kitchen.itemsGained.some((i: any) => /Gạo/.test(i.name)) && kitchen.itemsGained.some((i: any) => /Muối|Dầu/.test(i.name)), 'có gạo, muối hoặc dầu ăn');
const stairs = run({ player: player(), sceneId: 'r_inventory_check', actionType: 'custom', chosenAction: 'Chặn cầu thang bằng tủ và bàn' });
check((planTurn({ ...base, player: player(), sceneId: 'r_inventory_check', actionType: 'custom', chosenAction: 'Chặn cầu thang bằng tủ và bàn' } as any).resolution.zone || 'shelter') === 'shelter', 'chặn cầu thang không được kéo bạn ra hành lang');
check(!!stairs.base_delta && stairs.base_delta.fortification > 0, 'gia cố phải cộng độ kiên cố cho căn cứ');
const boil = run({ player: player([{ id: 'w', name: 'Nước máy trữ', category: 'food', unit: 'l', quantity: 6, thirstReduce: 55, needsCooking: true, rarity: 'common', description: '' }]), sceneId: 'r_inventory_check', actionType: 'custom', chosenAction: 'Đun sôi nước trên bếp' });
check(boil.itemsGained.some((i: any) => /đun sôi/i.test(i.name) && i.unit === 'l') && boil.itemsLost.length > 0, 'đun nước phải đổi nước chưa đun sang nước đun sôi (lít)');
const odd = run({ player: player(), sceneId: 'r_inventory_check', actionType: 'custom', chosenAction: 'Xếp lại sách trên kệ theo thứ tự' });
check(/Xếp lại sách/i.test(odd.outcome), 'hành động lạ vẫn phải được thực hiện theo lời bạn: ' + odd.outcome.slice(0, 80));

// 3) Bão ở tầng 7: không có chuyện leo tầng 2 để tránh ngập
const storm = planTurn({ ...base, player: player(), weather: 'heavy_rain', day: 5, turnCount: 14, sceneId: 'r_inventory_check', doneSceneIds: base.doneSceneIds } as any).next;
if (storm.id === 'event_acid_rain_superstorm') check(!/tầng 2/.test(storm.choices.join(' ') + storm.situation), 'bão ở tầng 7 không còn nhắc trốn lên tầng 2');
const stormScene = planTurn({ ...base, player: player(), weather: 'heavy_rain', tomorrowForecast: { weather: 'heavy_rain' }, day: 5, turnCount: 14, sceneId: 'r_inventory_check' } as any);
void stormScene;

// 4) Gia cố
const apt = fortifyActionsFor('apartment_survivors').map((a) => a.id);
check(apt.includes('block_stairwell') && !apt.includes('gate_wall'), 'chung cư có chặn cầu thang, không có nâng tường rào');
check(fortifyActionsFor('private_house').some((a) => a.id === 'gate_wall'), 'nhà riêng có nâng tường rào');
const exBase = { base: { fortification: 30, modules: { generator: 1 }, warehouse: [], facilities: { hasGeneratorAndFridge: true } }, flags: [], day: 8, companionCount: 1, hasVehicle: false };
const open = exposureOf(exBase as any).score;
const hidden = exposureOf({ ...exBase, base: { ...exBase.base, fortified: ['dim_light', 'hide_stock'] } } as any).score;
check(hidden < open, 'che giấu giảm điểm lộ diện: ' + open + ' -> ' + hidden);

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
