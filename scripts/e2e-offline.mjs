// Kiểm thử đầu-cuối chế độ offline qua HTTP: node scripts/e2e-offline.mjs [cổng]
// Cần chạy server trước (PORT=3100 npx tsx server.ts).
const base = `http://127.0.0.1:${process.argv[2] || 3100}`;
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

const player = {
  name: 'Tester', backgroundTitle: 'Dân thường',
  stats: { hp: 100, maxHp: 100, hunger: 20, thirst: 20, stamina: 100, sanity: 80, infection: 0 },
  wound: { hasOpenWound: false },
  inventory: [{ name: 'Dao chặt thịt nhà bếp', category: 'weapon', quantity: 1 }, { name: 'Hộp cá', category: 'food', quantity: 4, hungerReduce: 30, isSealed: true }],
};

const start = await post('/api/story/start', { player, scenarioId: 'apartment_survivors' });
let state = { settingId: start.settingId, zone: start.zone, awayTurns: 0, day: 1, turnCount: 1, weather: start.weather, forecast: start.tomorrowForecast, pending: [], done: [], sceneId: start.scene_id, choices: start.choices };
let problems = 0;
const check = (cond, msg) => { if (!cond) { problems++; console.log('✗', msg); } };
let radios = 0;
const seq = [];

async function turn(action) {
  const out = await post('/api/story/turn', {
    player, base: {}, companions: [], history: [], doneSceneIds: state.done, sceneId: state.sceneId,
    turnCount: state.turnCount, tomorrowForecast: state.forecast, pendingEvents: state.pending,
    settingId: state.settingId, zone: state.zone, awayTurns: state.awayTurns, chosenAction: action, actionType: 'choice', currentLocation: 'Chung cư', day: state.day, weather: state.weather,
  });
  state.done.push(state.sceneId);
  state.turnCount += 1;
  state.day = Math.floor(state.turnCount / 3) + 1;
  state.weather = out.weather; state.forecast = out.tomorrowForecast; state.pending = out.pending_events || [];
  state.sceneId = out.scene_id; state.choices = out.choices; state.zone = out.zone; state.awayTurns = out.awayTurns;
  if (out.radio_transmission) radios++;
  for (const k of ['hp', 'hunger', 'thirst', 'stamina', 'sanity']) player.stats[k] = Math.max(0, Math.min(100, player.stats[k] + (out.statChanges?.[k] ?? 0)));
  player.stats.hp = Math.max(40, player.stats.hp); player.stats.sanity = Math.max(40, player.stats.sanity);
  player.stats.hunger = Math.min(player.stats.hunger, 70); player.stats.thirst = Math.min(player.stats.thirst, 70);
  (out.itemsGained || []).forEach((g) => player.inventory.push(g));
  return out;
}

for (let i = 0; i < 40; i++) {
  const out = await turn(state.choices[Math.floor(Math.random() * 3)]);
  seq.push(out.scene_id);
  check(Array.isArray(out.choices) && out.choices.length === 3, 'phải có đúng 3 lựa chọn');
  check(!/MAP_TRAVEL/.test(JSON.stringify(out)), 'không để lộ mã MAP_TRAVEL');
  if (out.game_ending) break;
}
console.log('Cảnh:', seq.join(' > '));

// 0) Hành động tự nhập phải được phân tích: xuống tầng trệt từ tầng 7 phải đi qua cầu thang, không dịch chuyển tức thời
state.zone = 'shelter';
const down = await turn('Tôi xuống tầng 1 tìm đồ ăn ngoài đường');
check(/cầu thang/.test(down.outcome), 'xuống tầng trệt phải mô tả đi qua cầu thang');
check(down.zone === 'outside' || !down.scene_id.startsWith('r_'), 'sau khi xuống phải ở ngoài đường (hoặc một sự kiện đặc biệt kéo về), got ' + down.zone + ' / ' + down.scene_id);
const eatRice = await turn('Tôi nấu gạo ăn');
check(/nấu|gạo|thức ăn|THẤT BẠI/.test(eatRice.outcome), 'ăn/nấu phải được xử lý');
check(!/Ngày \d+ - .*tầng 7/.test(down.situation) || down.zone === 'shelter', 'không được ở tầng 7 khi đã xuống đường');

// 1) Dùng súng khi không có: phải thất bại
player.inventory = player.inventory.filter((i) => !/súng|colt|shotgun/i.test(i.name));
const noGun = await turn('Tôi bắn vào đầu con zombie bằng súng lục');
check(/THẤT BẠI/.test(noGun.outcome), 'dùng súng khi không có phải thất bại');

// 2) Di chuyển trên bản đồ tới nơi gần và nơi xa
const near = await turn('[MAP_TRAVEL] node=pharmacy style=quick hops=1 visits=0 :: Đi quầy thuốc');
check(/quầy thuốc|Quầy Thuốc/i.test(near.outcome), 'kết quả di chuyển phải nhắc tên địa điểm');
const far = await turn('[MAP_TRAVEL] node=tower style=thorough hops=2 visits=0 :: Đi tòa tháp');
check(/trọn một ngày/.test(far.outcome) && /nửa ngày/.test(near.outcome), 'đi xa mất cả ngày, đi gần mất nửa ngày');

// 3) Hạng mục radio hợp lệ
check(radios > 5, 'phải có nhiều bản tin radio qua các ngày');
console.log(problems ? `\n${problems} vấn đề` : '\nTất cả kiểm tra đều đạt');
process.exit(problems ? 1 : 0);
