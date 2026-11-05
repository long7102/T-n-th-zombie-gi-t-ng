// Kiểm thử điểm loot có trạng thái, câu chuyện, điểm động và đệ đi loot: npx tsx scripts/test-sites.ts
import { buildSite, newSiteState, siteProgress, addHiddenContainer, resolveErrand, errandCapacity, STORIES, dynamicSiteFor } from '../src/data/sites.ts';
import { planTurn } from '../src/data/storyDirector.ts';
import { encodeMapAction, WORLD_NODES, getNodeAny, placeDynamicSite, buildDynamicNodes } from '../src/data/worldMap.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };

// 1) Sinh điểm: có hòm, có đồ, ban đầu đã lục 0%
const house = buildSite({ id: 'house:1', name: 'Nhà hoang', kind: 'house', danger: 2 }, Math.random, 6);
check(house.containers.length >= 4 && house.containers.every((c) => c.items.length > 0), 'nhà có nhiều hòm đồ có đồ thật');
let st = newSiteState(house);
check(siteProgress(st).pct === 0 && siteProgress(st).total > 5, 'ban đầu đã lục 0%');

// 2) Lấy đồ thì % tăng, đồ không mọc lại
const c0 = house.containers[0];
st = { ...st, taken: { [c0.id]: c0.items.map((_, i) => i) } };
const p1 = siteProgress(st);
check(p1.pct > 0 && p1.taken === c0.items.length, 'lấy hết một hòm thì % tăng: ' + p1.pct);
const again = JSON.parse(JSON.stringify(st));
check(siteProgress(again).pct === p1.pct && JSON.stringify(again.site) === JSON.stringify(st.site), 'sau lưu/tải đồ không đổi, không tự mọc lại');
const all = { ...st, taken: Object.fromEntries(st.site.containers.map((c) => [c.id, c.items.map((_, i) => i)])) };
check(siteProgress(all).pct === 100 && siteProgress(all).empty, 'vét sạch thì 100%');

// 3) Câu chuyện qua dấu vết
check(STORIES.length >= 12 && STORIES.every((s) => s.scene.length > 40 && s.evidence.length > 40), 'có đủ nhiều câu chuyện, mỗi cái có cảnh và bằng chứng');
const ids = new Set<string>();
for (let i = 0; i < 60; i++) { const h = buildSite({ id: 'h' + i, name: 'n', kind: 'house', danger: 2, usedStories: [] }); if (h.story) ids.add(h.story.id); }
check(ids.size >= 8, 'các nhà hoang kể nhiều chuyện khác nhau: ' + ids.size);
const used = STORIES.map((s) => s.id).filter((id) => id !== 'dog');
const only = buildSite({ id: 'x', name: 'n', kind: 'house', danger: 2, usedStories: used }, () => 0.01);
check(!only.story || only.story.id === 'dog', 'không lặp câu chuyện đã gặp');
check(STORIES.some((s) => s.id === 'suicide_letter') && STORIES.some((s) => s.id === 'family_closet') && STORIES.some((s) => s.id === 'drag_marks'), 'có thư tuyệt mệnh, gia đình trong tủ, vết máu lê lết');

// 4) Hòm khóa cần dụng cụ, ngăn bí mật
const police = buildSite({ id: 'p', name: 'Đồn', kind: 'police_station', danger: 4 });
check(police.containers.some((c) => !!c.needs), 'đồn cảnh sát có hòm khóa cần dụng cụ');
const hidden = addHiddenContainer(newSiteState(house));
check(hidden.site.containers.length === house.containers.length + 1 && addHiddenContainer(hidden).site.containers.length === hidden.site.containers.length, 'lục kỹ thêm một ngăn bí mật, chỉ một lần');

// 5) Chuyến đi không còn loot ngẫu nhiên: mở giao diện hòm đồ
const player = { stats: { hp: 100, maxHp: 100, hunger: 30, thirst: 30, stamina: 90, sanity: 70, infection: 0 }, wound: {}, inventory: [] };
const base: any = { player, base: { hasBase: true, fortification: 30, modules: {}, warehouse: [], facilities: {} }, history: [], doneSceneIds: ['milestone_1_hospital', 'r_a', 'r_b', 'r_c'], settingId: 'apartment_survivors', zone: 'shelter', day: 4, turnCount: 12, clock: 18, weather: 'clear', actionType: 'choice', currentLocation: 'x', flags: [], companions: [], sceneId: 'r_inventory_check' };
const node = WORLD_NODES.find((n) => n.region === 'near' && n.id !== 'home')!;
const trip: any = planTurn({ ...base, chosenAction: encodeMapAction(node.id, 'quick', 1, 0, 'đi loot') });
check(trip.resolution.gain.length === 0 && trip.resolution.siteVisit?.nodeId === node.id, 'chuyến đi mở điểm loot thay vì tự nhặt đồ');

// 6) Cảnh nhà hoang xuất hiện và mở điểm loot
let sawHouse = false, houseVisit = false;
for (let i = 0; i < 600 && !sawHouse; i++) {
  const p: any = planTurn({ ...base, zone: 'near', sceneId: 'r_x', doneSceneIds: [...base.doneSceneIds, 'milestone_2_bloodwolf_raiders', 'milestone_3_bunker13_distress', 'milestone_4_mutation_crisis', 'r_y', 'r_z'] });
  if (p.next.id === 'r_abandoned_house') { sawHouse = true; const q: any = planTurn({ ...base, zone: 'near', sceneId: 'r_abandoned_house', chosenAction: p.next.choices[0] }); houseVisit = q.resolution.siteVisit?.kind === 'house'; }
}
check(sawHouse && houseVisit, 'cảnh nhà hoang xuất hiện và dẫn tới giao diện hòm đồ');

// 7) Điểm động
const kinds = new Set<string>();
for (let i = 0; i < 800; i++) {
  const rain = i % 2 === 1;
  const p: any = planTurn({ ...base, day: 3, clock: 16, turnCount: 8, weather: 'clear', tomorrowForecast: { weather: rain ? 'heavy_rain' : 'clear' }, dynamicSites: [] });
  if (p.dynamicSite) kinds.add(p.dynamicSite.kind);
}
check(kinds.has('truck') && kinds.has('flood'), 'xe tải cướp và thùng trôi dạt (khi bão) xuất hiện: ' + [...kinds].join(','));
const spec = dynamicSiteFor('crash', 5, 1);
const inst = placeDynamicSite(spec, 5, []);
check(buildDynamicNodes([inst], 6).length === 1 && buildDynamicNodes([inst], 9).length === 0, 'điểm động hết hạn thì biến mất');
check(getNodeAny(inst.id)?.kind === 'crash', 'server hiểu id điểm động');
const crash = buildSite({ id: inst.id, name: spec.name, kind: 'crash', danger: 3 });
check(crash.containers.some((c) => /y tế/i.test(c.name)) && siteProgress(newSiteState(crash)).total >= 10, 'máy bay rơi có nhiều thùng hàng và hộp y tế');
const flood = dynamicSiteFor('flood', 5, 2);
check(flood.expiresDay === 6 && buildSite({ id: flood.id, name: flood.name, kind: 'flood', danger: 2 }).containers.length >= 3, 'thùng trôi dạt có nhiều kiện hàng, hết hạn nhanh');

// 8) Đệ đi loot hộ
const helper: any = { name: 'Minh', hp: 90, age: 28, gender: 'male', skills: ['Trinh sát'], role: 'Thợ', traits: [] };
check(errandCapacity(helper) >= 5 && errandCapacity({ hp: 40, age: 62, gender: 'female', skills: [], role: 'Hưu trí' }) <= 3, 'khuân được nhiều hay ít tùy sức, tuổi, kỹ năng');
const site0 = newSiteState(buildSite({ id: 'e1', name: 'Chợ', kind: 'market', danger: 2 }));
const r1 = resolveErrand(site0, helper, () => 0.9);
check(r1.items.length > 0 && siteProgress(r1.st).taken === r1.items.length, 'đệ mang về đồ và trừ khỏi điểm loot');
const r2 = resolveErrand(r1.st, helper, () => 0.9);
check(r2.items.every((i) => !r1.items.some((j) => j.id === i.id)), 'lần sau đệ không mang lại món đã lấy');
const hard = newSiteState(buildSite({ id: 'e2', name: 'Đồn', kind: 'police_station', danger: 4 }));
let lost = 0;
for (let i = 0; i < 400; i++) if (resolveErrand(hard, helper, Math.random).lost) lost++;
check(lost > 0 && lost < 80, 'nơi nguy hiểm thì đệ đôi khi không về, nhưng hiếm: ' + lost + '/400');
const lockedIds = hard.site.containers.filter((c) => c.needs).flatMap((c) => c.items.map((i) => i.id));
const rr = resolveErrand(hard, helper, () => 0.5);
check(rr.items.every((i) => !lockedIds.includes(i.id)), 'đệ không mở được hòm khóa');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
