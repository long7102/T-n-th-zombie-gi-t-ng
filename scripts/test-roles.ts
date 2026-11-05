// Kiểm thử giao nhiều việc cùng lúc và phỏng vấn người được cứu: npx tsx scripts/test-roles.ts
import { offlineChat, roleCapacity, roleAptitude } from '../src/data/companionChat.ts';
import { computeTeamEffects } from '../src/utils/teamEffects.ts';

let problems = 0;
const check = (c: boolean, m: string) => { if (!c) { problems++; console.log('✗', m); } };

const strong: any = { id: 's', name: 'Hùng', gender: 'male', age: 30, hp: 95, maxHp: 100, morale: 85, trust: 70, affection: 20, status: 'healthy', traits: [], skills: ['Sơ cứu', 'Sửa chữa cơ khí', 'Nấu ăn'], role: 'Thợ', intimacyLevel: 'friend', nameKnown: true };
const weak: any = { ...strong, id: 'w', hp: 35, status: 'injured', morale: 30 };
const player: any = { gender: 'female', nameKnown: true };

check(roleCapacity(strong) === 4, 'người khỏe, tinh thần tốt, nhiều kỹ năng gánh được 4 việc, được ' + roleCapacity(strong));
check(roleCapacity(weak) === 1, 'người bị thương chỉ gánh 1 việc');
check(roleCapacity({ ...strong, skills: [] }) === 3, 'ít kỹ năng thì tối đa 3 việc');

const r1: any = offlineChat({ companion: strong, player, text: 'Anh giúp tôi canh gác, nấu ăn và sửa cái cửa luôn nhé' }, () => 0.3);
check((r1.assignments || []).length === 3, 'một câu giao được 3 việc: ' + JSON.stringify(r1.assignments));
const r2: any = offlineChat({ companion: { ...strong, assignments: ['guard', 'cook', 'repair', 'medic'] }, player, text: 'Anh đi kiếm đồ ăn giúp tôi nữa nhé' }, () => 0.3);
check(!(r2.assignments || []).includes('forage'), 'quá số việc thì không nhận thêm: ' + JSON.stringify(r2.assignments));

const fx1 = computeTeamEffects([{ ...strong, assignment: 'repair', assignments: ['repair'] }], true, false, [], () => 0.5);
const fx3 = computeTeamEffects([{ ...strong, assignment: 'repair', assignments: ['repair', 'guard', 'cook'] }], true, false, [], () => 0.5);
check(fx3.fortification <= fx1.fortification, 'ôm 3 việc thì mỗi việc kém đi: ' + fx1.fortification + ' vs ' + fx3.fortification);
check(fx3.hunger < 0 && fx3.sanity > 0, 'cả 3 việc đều được làm (nấu giảm đói, canh gác tăng tinh thần)');
check(roleAptitude('guard', { gender: 'male', age: 30 }) > roleAptitude('guard', { gender: 'male', age: 60 }), 'người cao tuổi làm việc nặng kém hơn');
check(roleAptitude('guard', { gender: 'male', age: 30 }) > roleAptitude('guard', { gender: 'female', age: 30 }), 'việc nặng hợp thể trạng hơn với người khỏe hơn');

// Phỏng vấn người được cứu
const sick: any = { ...strong, incubation: { isInfected: true }, traits: ['greedy'] };
const q1: any = offlineChat({ companion: sick, player, text: 'Bạn có bị cắn hay bị thương chỗ nào không?', context: { interview: true } }, () => 0.2);
check(q1.intent === 'askBitten', 'hỏi về vết cắn được nhận diện: ' + q1.intent);
const q2: any = offlineChat({ companion: strong, player, text: 'Bạn biết làm những gì?', context: { interview: true } }, () => 0.2);
check(q2.intent === 'askSkills' && /sơ cứu/i.test(q2.reply), 'hỏi kỹ năng thì trả lời kỹ năng thật: ' + q2.reply);
const q3: any = offlineChat({ companion: { ...strong, nameKnown: false, realName: 'Hùng', trust: 50 }, player, text: 'Tên bạn là gì?', context: { interview: true } }, () => 0.2);
check(q3.revealName === true, 'đủ tin cậy thì cho biết tên');

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
