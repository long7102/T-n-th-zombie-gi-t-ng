// Kiểm thử kết cục nhiều nhánh: npx tsx scripts/test-endings.ts
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';
let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };
const player = { stats: { hp: 100, maxHp: 100, hunger: 20, thirst: 20, stamina: 90, sanity: 70, infection: 0 }, wound: {}, inventory: [] };
const base = { player, base: { hasBase: true, fortification: 70, name: 'Pháo đài' }, companions: [], history: [], settingId: 'apartment_survivors', zone: 'outside', day: 21, turnCount: 60, weather: 'clear', actionType: 'choice', currentLocation: 'x', doneSceneIds: ['milestone_1_hospital', 'milestone_2_bloodwolf_raiders', 'milestone_3_bunker13_distress', 'milestone_4_mutation_crisis', 'r_a', 'r_b', 'r_c'] };
const offered = (flags: string[]) => planTurn({ ...base, sceneId: 'r_inventory_check', flags } as any).next;
const none = offered([]);
check(none.id === 'milestone_5_final_evacuation' && none.choices.length === 3, 'kết cục cuối phải xuất hiện: ' + none.id);
check(/Huyền Thoại|tử thủ/i.test(none.choices[1]) || /tử thủ/.test(none.choices[1]), 'không đồng minh thì giữ 3 lối cũ');
const rich = offered(['clue_1', 'clue_2', 'clue_3', 'clue_4', 'clue_5', 'clue_6', 'bunker13_heroes', 'rival_allied']);
check(rich.choices.some((c: string) => /đài phát sóng/.test(c)) && rich.choices.some((c: string) => /Bunker 13/.test(c)), 'đủ điều kiện thì lối mới phải xuất hiện: ' + rich.choices);
for (const [flags, re, title] of [[['clue_1','clue_2','clue_3','clue_4','clue_5','clue_6'], /đài phát sóng/, 'TIẾNG NÓI TRONG BÃO'], [['bunker13_heroes'], /Bunker 13/, 'MÁI NHÀ CUỐI CÙNG'], [['rival_allied'], /Đội Cây Cầu/, 'NGƯỜI GÁC PHỐ']] as any) {
  const sc = offered(flags);
  const act = sc.choices.find((c: string) => re.test(c));
  check(!!act, 'thiếu lựa chọn ' + title);
  if (!act) continue;
  const r = renderOfflineTurn({ ...base, sceneId: sc.id, flags, chosenAction: act } as any, planTurn({ ...base, sceneId: sc.id, flags, chosenAction: act } as any)) as any;
  check(!!(r.game_ending || r.ending) && (r.game_ending || r.ending).is_victory && (r.game_ending || r.ending).epilogue.length > 150, title + ': epilogue ' + ((r.game_ending || r.ending) ? (r.game_ending || r.ending).epilogue.length : 'none'));
}
console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
