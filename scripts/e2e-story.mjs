// Kiểm thử tầng cốt truyện, xe cộ, trạm y tế, nhà riêng: node scripts/e2e-story.mjs [cổng]
const base = `http://127.0.0.1:${process.argv[2] || 3100}`;
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
let problems = 0;
const check = (c, m) => { if (!c) { problems++; console.log('✗', m); } };
const mkPlayer = (inv = []) => ({ stats: { hp: 100, maxHp: 100, hunger: 20, thirst: 20, stamina: 100, sanity: 80, infection: 0 }, wound: { hasOpenWound: false }, inventory: inv });
const turn = (o) => post('/api/story/turn', { base: {}, companions: [], history: [], doneSceneIds: ['r_a', 'r_b', 'r_c', 'r_d', 'r_e'], day: 5, turnCount: 13, weather: 'clear', actionType: 'choice', currentLocation: 'x', ...o });

// 1) Chuyến đi bằng xe: nhẹ sức hơn đi bộ, tốn xăng, trả vehicle_delta
const walk = await turn({ player: mkPlayer(), sceneId: 'r_inventory_check', settingId: 'apartment_survivors', zone: 'shelter',
  chosenAction: '[MAP_TRAVEL] node=hospital style=quick hops=2 visits=0 :: Đi bệnh viện' });
const ride = await turn({ player: mkPlayer(), sceneId: 'r_inventory_check', settingId: 'apartment_survivors', zone: 'shelter',
  chosenAction: '[MAP_TRAVEL] node=hospital style=quick hops=2 visits=0 vehicle=car vcond=90 vfuel=20 crew=1 :: Đi bệnh viện' });
check(ride.vehicle_delta && ride.vehicle_delta.fuel < 0, 'đi xe phải tốn xăng (vehicle_delta.fuel < 0)');
check(ride.statChanges.stamina > walk.statChanges.stamina - 0 || ride.statChanges.stamina >= walk.statChanges.stamina, 'đi xe phải nhẹ sức hơn đi bộ: ' + ride.statChanges.stamina + ' vs ' + walk.statChanges.stamina);
const noFuel = await turn({ player: mkPlayer(), sceneId: 'r_inventory_check', settingId: 'apartment_survivors', zone: 'shelter',
  chosenAction: '[MAP_TRAVEL] node=hospital style=quick hops=2 visits=0 vehicle=car vcond=90 vfuel=1 crew=0 :: Đi bệnh viện' });
check(/hết nhiên liệu|không đủ nhiên liệu|đi bộ/i.test(noFuel.outcome), 'thiếu xăng phải phải đi bộ');
const far = await turn({ player: mkPlayer(), sceneId: 'r_inventory_check', settingId: 'apartment_survivors', zone: 'shelter',
  chosenAction: '[MAP_TRAVEL] node=op_farmhouse style=thorough hops=4 visits=0 vehicle=pickup vcond=100 vfuel=40 crew=2 :: Đi nhà vườn' });
check(/nhà vườn|Nhà Vườn/i.test(far.outcome), 'đi cứ điểm xa bằng xe phải nhắc tên địa điểm');

// 2) Trạm y tế: chưa phá cổng thì không ra ngoài được
const clinic = await turn({ player: mkPlayer(), sceneId: 'r_decide_outing_nr', settingId: 'clinic_containment', zone: 'shelter', flags: [],
  chosenAction: 'Đi thẳng ra {outside} tìm vật tư dù phải đi một quãng xa'.replace('{outside}', 'sân và đường phố ngoài trạm') });
check(clinic.zone !== 'outside', 'trạm y tế chưa phá cổng thì không được ra ngoài, zone=' + clinic.zone);
const clinicCustom = await turn({ player: mkPlayer(), sceneId: 'r_inventory_check', settingId: 'clinic_containment', zone: 'shelter', flags: [],
  chosenAction: 'Tôi đi ra ngoài đường tìm thức ăn' });
check(/chặn kín/.test(clinicCustom.outcome) && clinicCustom.zone !== 'outside', 'hành động tự nhập ra ngoài phải bị chặn ở trạm y tế');

// 3) Chung cư: quét tầng từ trên xuống, đủ 5 tầng thì làm chủ cả tòa nhà
let flags = [];
for (let i = 0; i < 5; i++) {
  const r = await turn({ player: mkPlayer(), sceneId: 'r_floor_sweep', settingId: 'apartment_survivors', zone: 'near', flags,
    chosenAction: 'Gõ cửa từng căn, thương lượng với người còn sống và lục những nhà đã bỏ trống' });
  flags = [...flags, ...(r.flags_add || [])];
}
check(flags.filter((f) => /^floor_\d$/.test(f)).length === 5, 'phải quét đủ 5 tầng: ' + flags.join(','));
check(flags.includes('building_secured'), 'quét đủ tầng phải làm chủ tòa nhà');

// 4) Nhà riêng: trèo qua từng nhà hàng xóm
const start = await post('/api/story/start', { player: { name: 'x' }, scenarioId: 'private_house' });
check(start.settingId === 'private_house' && /nhà bạn/.test(start.location), 'nhà riêng phải có bối cảnh riêng: ' + start.location);
const house = await turn({ player: mkPlayer(), sceneId: 'r_neighbor_house', settingId: 'private_house', zone: 'near', flags: [],
  chosenAction: 'Trèo qua mái hoặc ban công, vào nhà bằng cửa sổ tầng trên' });
check((house.flags_add || []).includes('house_1'), 'lục nhà hàng xóm phải ghi cờ house_1');

// 5) Manh mối + kết cục tính từ trạng thái
const clue = await turn({ player: mkPlayer(), sceneId: 'r_clue_1', settingId: 'apartment_survivors', zone: 'near', flags: [],
  chosenAction: 'Đọc thật kỹ từng dòng và ghi nhớ nội dung' });
check((clue.flags_add || []).includes('clue_1'), 'đọc manh mối phải ghi cờ clue_1');
const end = await turn({ player: mkPlayer(), sceneId: 'milestone_5_final_evacuation', settingId: 'apartment_survivors', zone: 'outside', day: 21, turnCount: 62,
  flags: ['clue_1', 'clue_2', 'clue_3', 'clue_4', 'clue_5', 'bunker13_heroes', 'abandoned_stranger'],
  companions: [{ name: 'Người phụ nữ lạ (y tá)', realName: 'Lan', nameKnown: false, status: 'healthy', intimacyLevel: 'romantic' }, { name: 'Hùng', status: 'deceased' }],
  base: { hasBase: true, fortification: 70, name: 'Căn cứ A' },
  chosenAction: 'Mở đường máu lên nóc tháp cùng đồng đội và bàn giao mẫu huyết thanh' });
const epi = end.game_ending && end.game_ending.epilogue || '';
check(/ném bom/.test(epi) && /Hùng/.test(epi) && /Bunker 13/.test(epi), 'kết cục phải tính từ manh mối, người đã mất và đồng minh: ' + epi.slice(0, 120));

console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
