// Kiểm thử cảnh đồng đội: npx tsx scripts/test-team.ts
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };
const comp = (o: any) => ({ id: o.name, name: o.name, gender: 'female', age: 28, hp: 80, maxHp: 100, morale: 60, trust: 50, affection: 30, status: 'healthy', traits: [], intimacyLevel: 'friend', ...o });
const player = { stats: { hp: 100, maxHp: 100, hunger: 60, thirst: 20, stamina: 80, sanity: 70, infection: 0 }, wound: {}, inventory: [{ name: 'Đồ hộp', category: 'food', quantity: 3, hungerReduce: 30 }, { name: 'Gạo', category: 'food', quantity: 1, hungerReduce: 50 }] };
const base = { player, base: {}, history: [], doneSceneIds: ['r_a', 'r_b', 'r_c', 'r_d', 'r_e'], settingId: 'apartment_survivors', zone: 'shelter', day: 7, turnCount: 20, weather: 'clear', actionType: 'choice', currentLocation: 'x' };
const run = (o: any) => renderOfflineTurn({ ...base, ...o }, planTurn({ ...base, ...o })) as any;

// 1) Phản bội: người tham lam tin cậy thấp
let o = run({ sceneId: 'r_betrayal', flags: [], companions: [comp({ name: 'Hắn', traits: ['greedy'], trust: 20 }), comp({ name: 'Cô ấy', traits: ['kind'] })], chosenAction: 'Bật đèn, chặn cửa và vạch mặt ngay tại chỗ' });
check(o.companionUpdates.some((u: any) => u.name === 'Hắn' && u.leave), 'phản bội: người tham lam phải rời nhóm');
check(!o.companionUpdates.some((u: any) => u.name === 'Cô ấy' && u.leave), 'phản bội: người khác không được rời');
check(o.flags_add.includes('companion_betrayed'), 'phản bội: phải ghi cờ companion_betrayed');
o = run({ sceneId: 'r_betrayal', flags: [], companions: [comp({ name: 'Hắn', traits: ['greedy'], trust: 20 })], chosenAction: 'Gọi tên người đó khẽ, hỏi tại sao và đưa phần của họ để ở lại' });
check(o.companionUpdates.some((u: any) => u.name === 'Hắn' && u.trustChange >= 10 && !u.leave), 'phản bội: tha thứ phải tăng tin cậy mạnh và giữ người ở lại');

// 2) Hy sinh: người trung thành, tin cậy cao
o = run({ sceneId: 'r_sacrifice', flags: [], companions: [comp({ name: 'Lan', traits: ['loyal'], trust: 80 }), comp({ name: 'Minh' })], chosenAction: 'Chấp nhận. Họ ở lại giữ cửa để cả nhóm kịp thoát' });
check(o.companionUpdates.some((u: any) => u.name === 'Lan' && u.statusChange === 'deceased'), 'hy sinh: người trung thành phải hy sinh');
check(o.flags_add.includes('companion_sacrificed'), 'hy sinh: phải ghi cờ');
o = run({ sceneId: 'r_sacrifice', flags: [], companions: [comp({ name: 'Lan', traits: ['loyal'], trust: 80 })], chosenAction: 'Từ chối. Ở lại chiến đấu bên cạnh nhau tới cùng' });
check(!o.companionUpdates.some((u: any) => u.statusChange === 'deceased') && o.statChanges.hp < 0, 'hy sinh: từ chối thì không ai chết nhưng bị thương');

// 3) Ghen tuông: người yêu + người thứ hai thân thiết
o = run({ sceneId: 'r_jealousy', flags: [], companions: [comp({ name: 'Người yêu', intimacyLevel: 'romantic', affection: 90 }), comp({ name: 'Bạn thân', affection: 55 })], chosenAction: 'Nắm tay, nói rằng người bạn chọn là họ và không ai khác' });
check(o.companionUpdates.some((u: any) => u.name === 'Người yêu' && u.affectionChange > 0) && o.companionUpdates.some((u: any) => u.name === 'Bạn thân' && u.affectionChange < 0), 'ghen tuông: người yêu +, người kia -');

// 4) Cảnh phải thực sự xuất hiện khi đủ điều kiện
const appear = (extra: any, id: string) => {
  let hit = 0;
  for (let i = 0; i < 400; i++) {
    const p = planTurn({ ...base, sceneId: 'r_inventory_check', flags: [], ...extra, doneSceneIds: ['milestone_1_hospital', 'milestone_2_bloodwolf_raiders', 'milestone_3_bunker13_distress', 'milestone_4_mutation_crisis', 'r_x', 'r_y', 'r_z', 'r_w', 'r_v'] });
    if (p.next.id === id) hit++;
  }
  return hit;
};
check(appear({ companions: [comp({ name: 'A', trust: 30 }), comp({ name: 'B', trust: 70 })] }, 'r_ration_dispute') > 0, 'tranh cãi khẩu phần phải xuất hiện khi 2 người và đói');
check(appear({ companions: [comp({ name: 'A', morale: 10 })] }, 'r_morale_crisis') > 0, 'khủng hoảng tinh thần phải xuất hiện khi tinh thần thấp');
check(appear({ companions: [comp({ name: 'A', traits: ['greedy'], trust: 20 })] }, 'r_betrayal') > 0, 'phản bội phải xuất hiện');
check(appear({ companions: [comp({ name: 'A', traits: ['loyal'], trust: 80 })] }, 'r_sacrifice') > 0, 'hy sinh phải xuất hiện');
check(appear({ companions: [comp({ name: 'A', trust: 75 })] }, 'r_personal_story') > 0, 'câu chuyện cá nhân phải xuất hiện khi tin cậy cao');
check(appear({ companions: [], zone: 'near' }, 'r_stray_dog') > 0, 'chú chó hoang phải xuất hiện');
check(appear({ companions: [], zone: 'near', flags: ['pet_dog'] }, 'r_stray_dog') === 0, 'đã nuôi chó thì không gặp chó hoang nữa');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
