// Mô phỏng cốt truyện offline: npx tsx scripts/simulate-story.ts [số lượt]
import { planTurn, renderOfflineTurn } from '../src/data/storyDirector.ts';

const turns = parseInt(process.argv[2] || '90', 10);
let day = 1, turnCount = 1, weather: any = 'dense_fog', forecast: any = undefined;
let pendingEvents: any[] = [], doneSceneIds: string[] = [];
let sceneId = 'r_start';
let choices: string[] = ['a', 'b', 'c'];
const player: any = {
  stats: { hp: 90, hunger: 20, thirst: 20, stamina: 90, sanity: 80, infection: 0 },
  wound: { hasOpenWound: false },
  inventory: [{ name: 'Dao chặt thịt', category: 'weapon', quantity: 1 }, { name: 'Đồ hộp', category: 'food', quantity: 3 }],
};
let companions: any[] = [];
const seenSetOfChoices = new Map<string, number>();
const rows: string[] = [];
const scenes: string[] = [];
let radios = 0;

for (let t = 0; t < turns; t++) {
  const action = choices[Math.floor(Math.random() * 3)].replace(/\s*\[Thiếu:[^\]]*\]$/, '');
  const req: any = {
    player, companions, history: [], chosenAction: action, actionType: 'choice', currentLocation: 'Chung cư Linh Đàm',
    day, turnCount, weather, tomorrowForecast: forecast, pendingEvents, doneSceneIds, sceneId, base: {},
  };
  const plan = planTurn(req);
  const out: any = renderOfflineTurn(req, plan);
  doneSceneIds.push(sceneId);
  const key = out.choices.join('|');
  seenSetOfChoices.set(key, (seenSetOfChoices.get(key) || 0) + 1);
  for (const [k, v] of Object.entries(out.statChanges || {})) {
    if (k in player.stats) player.stats[k] = Math.max(0, Math.min(100, player.stats[k] + (v as number)));
  }
  player.stats.hunger = Math.min(player.stats.hunger, 90);
  player.stats.hp = Math.max(30, player.stats.hp);
  player.stats.sanity = Math.max(30, player.stats.sanity);
  if (out.newCompanion && !companions.some((c) => c.id === out.newCompanion.id)) companions.push(out.newCompanion);
  for (const g of out.itemsGained) player.inventory.push(g);
  if (out.woundChange?.inflicted) player.wound.hasOpenWound = true;
  if (out.woundChange?.healed) player.wound.hasOpenWound = false;
  turnCount = plan.nextTurn; day = plan.nextDay; weather = out.weather; forecast = out.tomorrowForecast;
  pendingEvents = out.pending_events; sceneId = out.scene_id; choices = out.choices;
  if (out.radio_transmission) radios++;
  scenes.push(sceneId);
  rows.push(`T${String(turnCount).padStart(2)} D${String(day).padStart(2)} ${weather.padEnd(13)} ${sceneId}${out.radio_transmission ? '  📻 ' + out.system_trigger : ''}${out.game_ending ? '  END' : ''}`);
  if (out.game_ending) break;
}
console.log(rows.join('\n'));
const dup = [...seenSetOfChoices.values()].filter((v) => v > 1).length;
console.log(`\nSố lượt: ${rows.length} | bản tin radio: ${radios} | bộ lựa chọn xuất hiện >1 lần: ${dup}/${seenSetOfChoices.size}`);
const ids = scenes;
let maxRun = 1, run = 1;
for (let i = 1; i < ids.length; i++) { run = ids[i] === ids[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
console.log(`Chuỗi lặp liên tiếp dài nhất của cùng một cảnh: ${maxRun}`);
