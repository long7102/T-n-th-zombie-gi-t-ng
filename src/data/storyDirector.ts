import { Companion, Item, PendingEvent, WeatherForecast, WeatherType } from '../types/game';
import { RANDOM_EVENTS, REALISTIC_SURVIVOR_ROSTER, RandomEvent } from './randomEvents';
import { STORY_MILESTONES } from './storyBranches';
import { ROUTINE_SCENES, RoutineChoice, SceneCtx, SceneStats, WEATHER_FLAVOR } from './routineScenes';
import { buildRadioTransmission, RadioIntel } from './radio';
import { decodeMapAction, NODE_BY_ID, REGION_LABEL } from './worldMap';

// ====================================================================
// STORY DIRECTOR - "đạo diễn" cốt truyện chạy ở server.
// Giải quyết 3 lỗi gốc của bản cũ:
//  1) Lựa chọn lặp lại: mỗi cảnh có bộ lựa chọn riêng + cửa sổ chống lặp.
//  2) Nhảy cảnh vô lý: sự kiện/cột mốc có điều kiện ngày, thời gian chờ (cooldown),
//     câu dẫn nhập (lead-in) và được báo trước qua radio.
//  3) Kết quả lựa chọn sự kiện không được áp dụng: nay được xử lý tất định.
// ====================================================================

type Rng = () => number;

export interface ChosenResolution {
  kind: 'routine' | 'event' | 'milestone' | 'custom' | 'timeout' | 'start';
  outcome: string;
  stats: SceneStats;
  gain: Item[];
  lose: { name: string; quantity: number }[];
  woundChange?: { inflicted?: boolean; healed?: boolean; location?: string } | null;
  newCompanion?: Companion;
  newSkill?: { name: string; description: string; category: any };
  companionUpdates: any[];
  ending?: { is_game_over: boolean; is_victory: boolean; epilogue?: string; cause_of_death?: string };
  failed?: boolean;
  deterministic: boolean;
}

export interface NextScene {
  id: string;
  kind: 'routine' | 'event' | 'milestone';
  situation: string;
  choices: [string, string, string];
  isEmergency: boolean;
  emergencySeconds?: number;
  dangerLevel: number;
  soundCue: string;
}

export interface TurnPlan {
  resolution: ChosenResolution;
  next: NextScene;
  day: number;
  nextDay: number;
  nextTurn: number;
  newDay: boolean;
  weather: WeatherType;
  forecast: WeatherForecast;
  pending: PendingEvent[];
  systemTrigger: string | null;
  radio: string | null;
  systemNote?: string;
  waterCut: boolean;
  blackout: boolean;
  needMap: boolean;
  baseStats: Required<Omit<SceneStats, 'hp' | 'infection'>> & { hp: number; infection: number };
  recentChoices: string[];
}

const WEATHERS: WeatherType[] = ['clear', 'heatwave', 'heavy_rain', 'freezing_cold', 'dense_fog', 'night_dark'];

export const FORECAST_LABELS: Record<WeatherType, string> = {
  clear: 'Có khả năng trời râm mát, tầm nhìn ổn định',
  heatwave: 'Nguy cơ xuất hiện nắng gắt hầm hập (Thực phẩm hỏng nhanh, khát x2)',
  heavy_rain: 'Dự báo bão mưa lớn xối xả (Thể lực tụt nhanh, nguy cơ cảm sốt)',
  freezing_cold: 'Đợt gió mùa buốt giá tê tái tràn về (Thể lực hao mòn)',
  dense_fog: 'Sương mù dày đặc che khuất tầm nhìn (Zombie nhạy với âm thanh)',
  night_dark: 'Mây đen che kín trời, bóng đêm bao trùm sớm',
};

export function makeForecast(current: WeatherType, rng: Rng = Math.random): WeatherForecast {
  const picked = rng() < 0.35 ? current : WEATHERS[Math.floor(rng() * WEATHERS.length)];
  return { weather: picked, label: FORECAST_LABELS[picked], accuracyPercent: 65 };
}

// Thời tiết thực tế của ngày mới: khớp dự báo hôm trước với xác suất 65%.
export function rollActualWeather(forecast: WeatherForecast | undefined, current: WeatherType, rng: Rng = Math.random): WeatherType {
  if (!forecast) return current;
  if (rng() < 0.65) return forecast.weather;
  const others = WEATHERS.filter((w) => w !== forecast.weather);
  return others[Math.floor(rng() * others.length)];
}

// Hiệu ứng thời tiết lên chỉ số: tính một lần duy nhất ở server (bản cũ nhân đôi ở cả hai phía).
export function applyWeatherToStats(stats: SceneStats, weather: WeatherType): SceneStats {
  const s = { ...stats };
  if (weather === 'heatwave' && (s.thirst ?? 0) > 0) s.thirst = Math.round((s.thirst as number) * 2);
  if ((weather === 'heavy_rain' || weather === 'freezing_cold') && (s.stamina ?? 0) < 0) {
    s.stamina = Math.round((s.stamina as number) * 1.2);
  }
  return s;
}

// ---------- Quy tắc sự kiện ----------
const EVENT_RULES: Record<string, { minDay: number; max: number; needsDone?: string; skipIfHas?: string; weatherOnly?: boolean; scheduled?: boolean }> = {
  event_rescue_pharmacist: { minDay: 2, max: 1, skipIfHas: 'Giang' },
  event_rescue_mechanic_shop: { minDay: 3, max: 1, skipIfHas: 'Năm' },
  event_sewer_crawler_ambush: { minDay: 2, max: 3 },
  event_raider_ambush_bridge: { minDay: 8, max: 1, needsDone: 'milestone_2_bloodwolf_raiders' },
  event_acid_rain_superstorm: { minDay: 1, max: 3, weatherOnly: true },
  event_horde_night: { minDay: 4, max: 4, scheduled: true },
  event_supply_drop: { minDay: 3, max: 2, scheduled: true },
};

const LEAD_IN: Record<string, string> = {
  event_rescue_pharmacist: 'Trong lúc lần theo con phố cũ để tìm thuốc men, một tiếng đập cửa dồn dập cùng tiếng thét thất thanh kéo bạn dừng bước.',
  event_rescue_mechanic_shop: 'Bạn men theo khu xưởng cũ để tìm đồ nghề, thì nghe tiếng sắt thép va vào nhau cùng tiếng người quát tháo vọng ra từ một xưởng sửa xe.',
  event_sewer_crawler_ambush: 'Bạn băng qua một ngã tư vắng để tìm thêm nước, mắt dán chặt vào những góc khuất, nhưng không để ý đến chiếc nắp cống dưới chân.',
  event_raider_ambush_bridge: 'Tin đồn về nhóm vũ trang quanh cầu vượt không phải là chuyện bịa. Khi bạn cần băng qua đó để tìm vật tư, những bóng người đã chờ sẵn.',
  event_acid_rain_superstorm: 'Đúng như dự báo, bầu trời tối sầm lại, rồi những hạt mưa đầu tiên rơi xuống như hàng nghìn mũi kim.',
  event_horde_night: 'Tin tức trên đài không sai. Một tiếng động trầm đục lan khắp nền nhà, rồi bạn nghe tiếng rên dồn dập từ xa.',
  event_supply_drop: 'Tiếng động cơ nặng nề vang trên bầu trời rồi tắt dần, đúng như bản tin đã báo.',
};

// Lựa chọn yêu cầu vật phẩm: thiếu sẽ thất bại (thay vì "như thể có sẵn" như bản cũ).
const CHOICE_REQUIREMENTS: Record<string, { re: RegExp; label: string }[]> = {
  raider_molotov_counter: [{ re: /molotov/i, label: 'Chai cháy Molotov' }],
  sewer_shotgun_pointblank: [{ re: /súng|colt|shotgun/i, label: 'Súng' }],
  rescue_fire_gas_torch: [{ re: /cồn|xăng/i, label: 'Cồn hoặc xăng' }],
};

// ---------- Hiệu ứng lựa chọn cột mốc ----------
interface MsEffect {
  outcome: string;
  stats?: SceneStats;
  gain?: Partial<Item>[];
  lose?: { name: string; quantity: number }[];
  recruit?: string;
  companionStatus?: { status: any; hpChange?: number; moraleChange?: number; trustChange?: number };
  skill?: { name: string; description: string; category: any };
  ending?: string;
  tag: string;
}

const MS_EFFECTS: Record<string, MsEffect> = {
  m1_save_doctor: {
    tag: 'saved_nhauyen', recruit: 'companion_nhauyen', stats: { stamina: -20, hp: -8, sanity: 4 },
    gain: [{ id: 'ms_morphine', name: 'Hộp thuốc kháng sinh Amoxicillin 500mg', category: 'medical', quantity: 2, infectionReduce: 35, healAmount: 10, description: 'Kháng sinh đặc trị nhiễm trùng vết thương hở.', rarity: 'rare' }],
    outcome: 'Bạn lao vào hành lang đầy khói, dùng pháo sáng làm lũ biến dị chùn bước rồi vung gậy mở đường. Nhã Uyên kẹt trong phòng mẫu phẩm, tay còn ôm chặt khay kháng sinh. Cô ấy nắm lấy tay bạn: "Tôi sẽ đi cùng anh, có tôi thì vết thương không còn là án tử."',
  },
  m1_take_supplies_flee: {
    tag: 'abandoned_nhauyen_rich_loot', stats: { sanity: -18, stamina: -10 },
    gain: [
      { id: 'ms_morphine', name: 'Morphine dã chiến', category: 'medical', quantity: 1, healAmount: 40, description: 'Giảm đau mạnh, dùng khi bị thương nặng.', rarity: 'rare' },
      { id: 'ms_abx', name: 'Hộp thuốc kháng sinh Amoxicillin 500mg', category: 'medical', quantity: 3, infectionReduce: 35, healAmount: 10, description: 'Kháng sinh đặc trị nhiễm trùng.', rarity: 'rare' },
      { id: 'sc_gauze', name: 'Băng gạc tiệt trùng y tế', category: 'medical', quantity: 4, healAmount: 20, infectionReduce: 15, description: 'Băng bó cầm máu.', rarity: 'common' },
    ],
    outcome: 'Bạn phá khóa két, vơ sạch thuốc rồi chạy ra cầu thang thoát hiểm. Phía sau, tiếng gọi cứu mạng nhỏ dần cho đến khi tắt hẳn. Ba lô nặng trĩu thuốc men, nhưng lòng bạn còn nặng hơn.',
  },
  m1_firebomb_containment: {
    tag: 'burned_containment_alpha_dead', stats: { stamina: -12, sanity: -6, hp: -5 },
    lose: [{ name: 'Cồn', quantity: 1 }],
    outcome: 'Chai cồn xoay trong không trung rồi vỡ tan trên sàn phòng thí nghiệm. Ngọn lửa xanh liếm lên các giá mẫu vật, tiếng gào của thứ gì đó đang cháy vang vọng. Cột khói đen bốc cao khiến cả khu phố đều có thể nhìn thấy.',
  },
  m2_fight_to_death: {
    tag: 'bloodwolf_nemesis', stats: { hp: -14, stamina: -20, sanity: -3 },
    gain: [{ id: 'looted_shotgun', name: 'Súng hoa cải tự chế cướp được', category: 'weapon', quantity: 1, damage: 45, durability: 80, maxDurability: 100, description: 'Khẩu súng cướp từ tên gác cầu, uy lực ở tầm gần.', rarity: 'uncommon' }],
    outcome: 'Bạn phục kích từ hố gầm cầu, hạ gục tên thủ lĩnh gác cầu bằng một phát duy nhất. Những tên còn lại tản ra, hoảng loạn. Bạn lượm được khẩu súng săn, nhưng từ nay cái tên của bạn đã nằm trên danh sách săn đuổi của Huyết Lang.',
  },
  m2_negotiate_tribute: {
    tag: 'bloodwolf_neutral_tribute', stats: { sanity: -8 },
    lose: [{ name: 'Đồ hộp', quantity: 1 }, { name: 'Nước', quantity: 1 }],
    outcome: 'Bạn nhả ra phế liệu và vài hộp thức ăn, giấu kỹ những thứ quan trọng nhất. Tên thủ lĩnh cười khinh khỉnh rồi vẫy tay cho qua. Bạn sống sót qua cầu, nhưng đồ dự trữ vơi đi trông thấy.',
  },
  m2_infiltrate_subvert: {
    tag: 'bloodwolf_sabotaged', stats: { hp: -10, stamina: -22, sanity: 2 },
    gain: [{ id: 'ms_ammo', name: 'Đạn quân dụng', category: 'ammo', quantity: 8, description: 'Đạn cướp được từ kho của băng cướp.', rarity: 'uncommon' }],
    outcome: 'Bạn giả vờ quy thuận rồi gài bẫy nổ cạnh kho đạn. Tiếng nổ làm rung chuyển cả khu vực. Trong hỗn loạn, bạn lục được ít đạn dược quý giá rồi biến mất vào bóng tối trước khi chúng kịp hiểu chuyện gì xảy ra.',
  },
  m3_breach_and_rescue: {
    tag: 'bunker13_heroes', stats: { hp: -12, stamina: -28, sanity: 5 },
    gain: [{ id: 'ms_bunker_kit', name: 'Hộp cứu thương chấn thương dã chiến nguyên seal', category: 'medical', quantity: 1, healAmount: 50, infectionReduce: 40, description: 'Hộp cứu thương đặc dụng của Bunker 13.', rarity: 'rare' }],
    skill: { name: 'Chỉ Huy Chiến Hào', description: 'Tăng sức bền khi phối hợp với đồng đội trong không gian hẹp.', category: 'combat' },
    outcome: 'Cống ngầm ngập ngụa nước thải, đạn vọng ầm ầm giữa các bức tường bê tông. Bạn cùng người trong hầm chặn bầy zombie ở lớp cửa thép thứ hai cho đến khi chúng tản đi. Họ tặng bạn hộp cứu thương và chỗ ngủ an toàn trong hầm.',
  },
  m3_divert_horde: {
    tag: 'bunker13_diverted_horde', stats: { stamina: -24, sanity: -3 },
    skill: { name: 'Chiến Thuật Nghi Binh', description: 'Tạo âm thanh đánh lạc hướng hiệu quả hơn khi gặp bầy lớn.', category: 'combat' },
    outcome: 'Chiếc xe bán tải gào rú trên mặt đường, loa phóng thanh rền vang cùng pháo sáng đỏ rực. Cả bầy đổi hướng, kéo nhau theo bạn. Bạn lượn vòng, bỏ xe và thoát thân qua mê cung ngõ nhỏ. Bunker 13 an toàn mà không cần ai phải đổ máu bên trong.',
  },
  m3_ignore_and_fortify: {
    tag: 'bunker13_abandoned_looter', stats: { sanity: -14, stamina: -14 },
    gain: [
      { id: 'sc_food', name: 'Đồ hộp thịt lợn hầm (Nguyên seal)', category: 'food', quantity: 3, hungerReduce: 35, isSealed: true, canSpoil: false, description: 'Đồ hộp quân đội nguyên niêm phong.', rarity: 'common' },
      { id: 'sc_gasoline', name: 'Can xăng mini 5 lít', category: 'material', quantity: 2, description: 'Xăng đặc chế tạo chai cháy hoặc chạy máy phát.', rarity: 'rare' },
    ],
    outcome: 'Trong khi tiếng gào thét từ phía sân vận động vọng lại, bạn cùng bầy đàn nhìn thấy cơ hội. Các cửa hàng bỏ trống, kho chứa mở toang. Bạn vét sạch đồ ăn và xăng dầu, nhưng tín hiệu cầu cứu cứ văng vẳng trong đầu suốt đêm.',
  },
  m4_use_prototype_cure: {
    tag: 'companion_cured_super_immune', stats: { stamina: -6, sanity: 6 },
    companionStatus: { status: 'healthy', hpChange: 15, moraleChange: 20, trustChange: 25 },
    outcome: 'Bạn tiêm ống kháng thể cuối cùng vào tĩnh mạch. Các đường gân đen co lại, rồi mờ dần. Sáng hôm sau, đồng đội của bạn mở mắt và nói lời đầu tiên: "Tôi nghe thấy mọi thứ... rõ hơn trước nhiều."',
  },
  m4_battlefield_amputation: {
    tag: 'companion_amputated_scarred', stats: { stamina: -14, sanity: -4 },
    lose: [{ name: 'Cồn', quantity: 1 }],
    companionStatus: { status: 'injured', hpChange: -15, moraleChange: -5, trustChange: 30 },
    outcome: 'Lưỡi dao nung đỏ rạch qua mô hoại tử, tiếng thét xé toạc cả đêm. Bạn dội cồn, băng chặt rồi ôm lấy người bạn đang run rẩy. Khi trời sáng, người đó vẫn còn thở, nhìn bạn bằng ánh mắt không còn chút nghi ngờ.',
  },
  m4_exile_mercy_bullet: {
    tag: 'companion_exiled_or_ended', stats: { sanity: -25 },
    companionStatus: { status: 'deceased', trustChange: -50 },
    outcome: 'Bạn khóa cửa cabin, đặt khẩu súng vào tay cô ấy rồi quay đi. Một phút sau, có tiếng nổ nặng nề. Đội nhóm im lặng cả ngày hôm đó, không ai dám nhìn vào mắt bạn.',
  },
  m5_board_helo_with_cure: {
    tag: 'ending_rebirth_of_hope', ending: 'Cánh quạt trực thăng cuốn tung đám tro tàn. Bạn cùng đồng đội leo lên khi bầy zombie còn chưa kịp đổ vào thang máy đã nổ tung. Thành phố nhỏ dần bên dưới. Ở nơi căn cứ mới, mẫu huyết thanh bạn mang theo trở thành nền tảng của loại thuốc đầu tiên. Kết cục: HI VỌNG TÁI SINH.',
    outcome: 'Bạn mở đường máu lên nóc tháp cùng đồng đội, kích nổ thang máy chặn bầy quái vật và bước lên trực thăng cứu viện.', stats: { hp: -10, stamina: -30 },
  },
  m5_heroic_last_stand: {
    tag: 'ending_heroic_legend', ending: 'Bạn bắn đến viên đạn cuối cùng trên cây cầu sập, mỗi loạt đạn là thêm một giây quý giá cho chiếc trực thăng cất cánh. Người dân trên máy bay nhớ mãi dáng bạn đứng giữa biển lửa. Tên bạn được khắc trên đài tưởng niệm của thế giới mới. Kết cục: HUYỀN THOẠI BẤT TỬ.',
    outcome: 'Bạn ở lại tử thủ tại chân tháp với súng máy để đồng đội và người dân kịp bay đi.', stats: { hp: -20, stamina: -35 },
  },
  m5_rule_the_wasteland: {
    tag: 'ending_wasteland_warlord', ending: 'Cánh quạt trực thăng bốc cháy dưới hỏa lực của bạn, quân đội mất tín hiệu và biến mất khỏi thành phố. Bạn và những người trung thành quay về căn cứ ngầm, dựng nên pháo đài giữa vùng đất chết. Kết cục: BÁ CHỦ HOANG TÀN.',
    outcome: 'Bạn từ chối di tản, kích nổ trực thăng của quân đội và giữ lại căn cứ ngầm cho riêng mình.', stats: { stamina: -20, sanity: -10 },
  },
};

const MS_LEAD_IN: Record<string, string> = {
  milestone_1_hospital: 'Trong lúc tìm kiếm vật tư y tế, bạn buộc phải đi vào khu bệnh viện cũ.',
  milestone_2_bloodwolf_raiders: 'Đúng như tin trên đài, bạn bị buộc phải băng qua khu cầu vượt phía tây để tìm nước và đồ hộp.',
  milestone_3_bunker13_distress: 'Chiếc bộ đàm bạn nhặt được hôm qua bỗng sáng đèn, rè rè rồi bật ra một giọng nói.',
  milestone_4_mutation_crisis: 'Sau một trận chạm trán ở hành lang, một tiếng ngã nặng nề khiến bạn quay phắt lại.',
  milestone_5_final_evacuation: 'Sau từng ấy ngày sống sót, tín hiệu cuối cùng vang lên từ phía trung tâm thành phố.',
};

const MS_MIN_DAY = [2, 4, 6, 9, 20];
const MS_VIA_PENDING = new Set(['milestone_2_bloodwolf_raiders']);

const COMPANION_LINES = [
  'Em nghe có tiếng lạ ở tầng dưới... hay chỉ là gió thôi?',
  'Anh đã ăn gì chưa? Em còn nửa hộp, anh ăn đi.',
  'Em cứ mơ thấy phố xá đông người, tỉnh dậy lại càng sợ hơn.',
  'Nếu mình giữ vững thêm vài ngày, biết đâu sẽ có tin tốt.',
  'Cửa này chắc chắn chưa? Em không dám ngủ sâu.',
  'Em đã kiểm tra đồ rồi, nước còn ít, mình phải tính kỹ.',
];

// ---------- Tiện ích ----------
const uid = (s: string) => `${s}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const norm = (t: string) => t.replace(/\s*\[Thiếu:[^\]]*\]\s*$/, '').trim();
const hasItem = (inv: any[], re: RegExp) => inv.some((i) => re.test(i.name || '') && (i.quantity ?? 1) > 0);

const blankRes = (kind: ChosenResolution['kind'], outcome: string): ChosenResolution => ({
  kind, outcome, stats: {}, gain: [], lose: [], companionUpdates: [], deterministic: false,
});

function toItems(parts?: Partial<Item>[]): Item[] {
  return (parts || []).map((p) => ({ description: '', rarity: 'common', quantity: 1, ...p, id: uid(p.id || 'item') } as Item));
}

function failMissing(kind: ChosenResolution['kind'], label: string): ChosenResolution {
  const r = blankRes(kind, `[THẤT BẠI - THIẾU TRANG BỊ] Bạn đưa tay vào ba lô nhưng không có ${label}! Khoảnh khắc chần chừ đó khiến tình huống xoay chiều: bạn phải lùi lại trong hoảng loạn, hứng một đòn vào người.`);
  r.stats = { hp: -10, sanity: -6, stamina: -10 };
  r.failed = true;
  r.deterministic = true;
  return r;
}

function eventById(id: string): RandomEvent | undefined {
  return RANDOM_EVENTS.find((e) => e.id === id);
}

function milestoneById(id: string) {
  return STORY_MILESTONES.find((m) => m.id === id);
}

// ---------- Xử lý hành động của người chơi ----------
function resolveAction(req: any, rng: Rng): ChosenResolution {
  const mapTrip = decodeMapAction(req.chosenAction || '');
  if (mapTrip) return resolveMapTravel(mapTrip, req, rng);
  const action = norm(req.chosenAction || '');
  const inv: any[] = req.player?.inventory || [];
  const sceneId: string = req.sceneId || '';
  const comps: any[] = req.companions || [];

  if (req.actionType === 'emergency_timeout') {
    const r = blankRes('timeout', 'Cơ thể bạn đông cứng vì sợ hãi. Khi tỉnh lại, khoảnh khắc quyết định đã trôi qua và hậu quả ập xuống: bạn bị thương và mất bình tĩnh, còn cơ hội cứu người hoặc đoạt đồ đã vuột khỏi tầm tay.');
    r.stats = { hp: -12, sanity: -8, stamina: -10 };
    r.deterministic = true;
    return r;
  }

  const routine = ROUTINE_SCENES.find((s) => s.id === sceneId);
  if (routine) {
    const ch = routine.choices.find((c) => c.text === action);
    if (ch) return fromRoutineChoice(ch, inv);
  }

  const ev = eventById(sceneId);
  if (ev) {
    const ch = ev.choices.find((c) => c.text === action);
    if (ch) {
      const reqs = CHOICE_REQUIREMENTS[ch.id] || [];
      const miss = reqs.find((q) => !hasItem(inv, q.re));
      if (miss) return failMissing('event', miss.label);
      const r = blankRes('event', ch.outcomeNarrative);
      r.stats = { ...(ch.statImpact || {}) };
      r.gain = toItems(ch.itemsGained as any);
      r.lose = (ch.itemsLost || []).filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
      if (ch.newSkillAwarded) r.newSkill = ch.newSkillAwarded;
      if (ch.rescuesCompanion && ev.survivorCandidate && !comps.some((c) => c.id === ev.survivorCandidate!.id)) {
        r.newCompanion = {
          ...ev.survivorCandidate,
          trust: Math.min(100, ev.survivorCandidate.trust + (ch.companionImpact?.trustChange || 0)),
          lastComment: ch.companionImpact?.comment || ev.survivorCandidate.lastComment,
          hasBeenRescued: true,
        };
      }
      if (ch.id === 'sewer_dodge_and_retreat') r.woundChange = { inflicted: true, location: 'Vết cào ở mắt cá chân' };
      if (ch.id === 'drop_rush_crate') r.woundChange = { inflicted: true, location: 'Vết cào rách ở cánh tay' };
      r.deterministic = true;
      return r;
    }
  }

  const ms = milestoneById(sceneId);
  if (ms) {
    const mc = ms.majorChoices.find((c) => c.label === action);
    const fx = mc && MS_EFFECTS[mc.id];
    if (mc && fx) {
      const r = blankRes('milestone', fx.outcome);
      r.stats = { ...(fx.stats || {}) };
      r.gain = toItems(fx.gain);
      r.lose = (fx.lose || []).filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
      if (fx.skill) r.newSkill = fx.skill;
      if (fx.recruit) {
        const cand = REALISTIC_SURVIVOR_ROSTER.find((c) => c.id === fx.recruit);
        if (cand && !comps.some((c) => c.id === cand.id)) {
          r.newCompanion = { ...cand, trust: Math.min(100, cand.trust + 30), hasBeenRescued: true };
        }
      }
      if (fx.companionStatus && comps[0]) {
        r.companionUpdates.push({
          name: comps[0].name,
          statusChange: fx.companionStatus.status,
          hpChange: fx.companionStatus.hpChange,
          moraleChange: fx.companionStatus.moraleChange,
          trustChange: fx.companionStatus.trustChange,
          dialogue: fx.companionStatus.status === 'deceased' ? undefined : 'Em sẽ không quên chuyện này đâu.',
        });
      }
      if (fx.ending) {
        r.ending = { is_game_over: false, is_victory: true, epilogue: fx.ending };
      }
      r.deterministic = true;
      return r;
    }
  }

  return resolveCustom(action, inv, rng);
}


// ---------- Di chuyển trên bản đồ: tất định theo quãng đường, độ nguy hiểm và số lần đã ghé ----------
function resolveMapTravel(mt: { nodeId: string; style: 'quick' | 'thorough'; hops: number; visits: number; text: string }, req: any, rng: Rng): ChosenResolution {
  const node = NODE_BY_ID[mt.nodeId];
  if (!node) return resolveCustom(mt.text, req.player?.inventory || [], rng);
  const weather: WeatherType = req.weather || 'clear';
  const thorough = mt.style === 'thorough';
  const hops = Math.max(1, mt.hops);
  const r = blankRes('custom', '');
  r.deterministic = true;

  let stamina = -(6 * hops + (thorough ? 9 : 3));
  if (weather === 'heavy_rain' || weather === 'freezing_cold') stamina = Math.round(stamina * 1.2);
  const stats: SceneStats = { stamina, hunger: 2 * hops, thirst: 2 * hops, hp: 0, sanity: 0 };

  const lines: string[] = [];
  lines.push(hops === 1
    ? `Bạn lách qua những con ngõ quen thuộc để tới ${node.name} (${REGION_LABEL[node.region]}).`
    : `Bạn băng qua ${hops} chặng đường, tránh các ổ zombie để tiến sâu vào ${REGION_LABEL[node.region].toLowerCase()}: ${node.name}.`);

  // Mỗi chặng có thể chạm trán; càng xa và càng nguy hiểm càng dễ gặp.
  const encounterChance = 0.08 + node.danger * 0.04 + (thorough ? 0.08 : 0);
  let hit = 0;
  for (let i = 0; i < hops; i++) if (rng() < encounterChance) hit++;
  if (hit) {
    stats.hp = (stats.hp || 0) - hit * (3 + node.danger * 2);
    stats.sanity = (stats.sanity || 0) - hit * 4;
    lines.push(hit === 1 ? 'Giữa đường, một con zombie lao ra từ khe xe bỏ hoang, bạn kịp đẩy nó ngã nhưng bị cào xước.' : 'Trên đường đi, bạn bị chặn hai lần liên tiếp, phải chạy loạn xạ và nhận vài vết thương.');
    if (rng() < 0.4) r.woundChange = { inflicted: true, location: 'Vết cào rách trên cẳng tay' };
  }

  // Lục soát: ghé lại nhiều lần thì vật tư cạn dần.
  const depletion = 1 / (1 + mt.visits);
  const gained: Partial<Item>[] = [];
  for (const it of node.loot.common) {
    const q = Math.max(0, Math.round((it.quantity || 1) * depletion * (thorough ? 1.2 : 1)));
    if (q >= 1 || rng() < depletion) gained.push({ ...it, quantity: Math.max(1, q) });
  }
  if (thorough && node.loot.rare && rng() < 0.55 * Math.max(0.35, depletion)) {
    gained.push(pickFrom(node.loot.rare, rng));
    lines.push('Bạn dành thêm thời gian phá khóa, cạy tủ và lật từng ngăn kéo; tiếng động lớn nhưng món đồ giá trị nằm sâu bên trong đã nằm gọn trong tay bạn.');
    if (rng() < 0.15 + node.danger * 0.05) {
      stats.hp = (stats.hp || 0) - (2 + node.danger * 2);
      stats.sanity = (stats.sanity || 0) - 3;
      lines.push('Nhưng tiếng ồn khiến vài bóng đen lảo đảo kéo tới, bạn phải rút lui trong thế bị rượt.');
    }
  } else if (thorough) {
    lines.push('Bạn lục soát cẩn thận hơn nhưng không tìm thêm gì quý giá.');
  } else {
    lines.push('Bạn lục soát nhanh, nhặt những thứ dễ lấy nhất rồi rút lui trong im lặng.');
  }
  if (!gained.length) lines.push('Nơi này gần như đã bị vét sạch từ những lần ghé trước, bạn quay về tay không.');
  else if (mt.visits > 0) lines.push('Vật tư ở đây đã vơi đi nhiều sau những lần ghé trước.');

  r.gain = toItems(gained);
  r.stats = stats;
  r.outcome = lines.join(' ');
  return r;
}

function fromRoutineChoice(ch: RoutineChoice, inv: any[]): ChosenResolution {
  const miss = (ch.requires || []).find((q) => !hasItem(inv, q.re));
  if (miss) return failMissing('routine', miss.label);
  const r = blankRes('routine', ch.outcome);
  r.stats = { ...(ch.stats || {}) };
  r.gain = toItems(ch.gain);
  r.lose = (ch.lose || []).filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
  if (ch.healWound) r.woundChange = { healed: true };
  if (ch.inflictWound) r.woundChange = { inflicted: true, location: ch.inflictWound };
  r.deterministic = true;
  return r;
}

// Hành động người chơi tự nhập: kiểm tra chéo vật phẩm, nếu thiếu thì thất bại.
const ITEM_KEYWORDS: { act: RegExp; have: RegExp; label: string }[] = [
  { act: /\b(bắn|bóp cò|nổ súng)\b|súng|colt|shotgun|\bak\b/i, have: /súng|colt|shotgun|\bak\b/i, label: 'khẩu súng' },
  { act: /molotov|chai cháy/i, have: /molotov/i, label: 'chai cháy Molotov' },
  { act: /băng bó|băng gạc|cầm máu/i, have: /băng|gạc/i, label: 'băng gạc' },
  { act: /kháng sinh|tiêm thuốc/i, have: /kháng sinh|amoxicillin/i, label: 'thuốc kháng sinh' },
  { act: /sát trùng|cồn/i, have: /cồn|povidone/i, label: 'cồn sát trùng' },
];

function resolveCustom(action: string, inv: any[], rng: Rng): ChosenResolution {
  const a = action.toLowerCase();
  for (const k of ITEM_KEYWORDS) {
    if (k.act.test(a) && !hasItem(inv, k.have)) return failMissing('custom', k.label);
  }
  const r = blankRes('custom', '');
  if (/phá khóa|loot kỹ|lục soát|tìm kiếm|vật liệu|thu gom/.test(a)) {
    if (rng() < 0.55) {
      r.outcome = `Bạn thực hiện: "${action}". Sau một hồi mò mẫm cẩn thận trong đống đổ nát, bạn tìm được vài thứ còn dùng được. Tiếng động đủ nhỏ để không ai chú ý.`;
      r.gain = toItems([{ id: 'cu_food', name: 'Đồ hộp thịt lợn hầm (Nguyên seal)', category: 'food', quantity: 1, hungerReduce: 35, isSealed: true, canSpoil: false, rarity: 'common', description: 'Đồ hộp quân đội nguyên niêm phong.' }]);
      r.stats = { stamina: -6 };
    } else {
      r.outcome = `Bạn thực hiện: "${action}". Cả khu vực đã bị vét sạch từ trước, bạn chỉ mất công và thể lực mà không thu được gì đáng kể.`;
      r.stats = { stamina: -8, sanity: -2 };
    }
  } else if (/nấu|bếp|lửa|ăn/.test(a)) {
    r.outcome = `Bạn thực hiện: "${action}". Hơi ấm của thức ăn chín lan trong người, tinh thần dịu xuống phần nào dù mùi thơm có thể bay xa.`;
    r.stats = { hunger: -12, sanity: 3 };
  } else if (/nghỉ|ngủ|chợp mắt/.test(a)) {
    r.outcome = `Bạn thực hiện: "${action}". Cơ thể dần thả lỏng, dù tai vẫn luôn căng ra nghe ngóng mọi tiếng động.`;
    r.stats = { stamina: 14, sanity: 2 };
  } else if (/né|lách|trốn|chạy/.test(a)) {
    r.outcome = `Bạn thực hiện: "${action}". Bạn di chuyển nhanh và gọn, tránh được rắc rối trước mắt nhưng thể lực tụt đi nhiều.`;
    r.stats = { stamina: -10 };
  } else {
    r.outcome = `Bạn thực hiện: "${action}". Bạn tính toán từng bước thật thận trọng và tiết kiệm sức, không gây thêm động tĩnh.`;
    r.stats = { stamina: -3 };
  }
  r.deterministic = false;
  return r;
}

// ---------- Chọn cảnh kế tiếp ----------
function buildCtx(req: any, nextDay: number, weather: WeatherType): SceneCtx {
  const comps: any[] = req.companions || [];
  const loc = req.currentLocation || 'Khu nhà bỏ hoang';
  const baseType = req.base?.base_type || (loc.toLowerCase().includes('quân sự') ? 'Military Base' : 'Apartment');
  return {
    day: nextDay, weather, location: loc,
    waterCut: nextDay >= 7, blackout: nextDay >= 10,
    hasCompanion: comps.length > 0, companionName: comps[0]?.name || 'Đồng đội',
    baseType,
    thirst: req.player?.stats?.thirst ?? 0,
    hunger: req.player?.stats?.hunger ?? 0,
    stamina: req.player?.stats?.stamina ?? 100,
    hasWound: !!req.player?.wound?.hasOpenWound,
  };
}

const pickFrom = <T,>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

function eventScene(ev: RandomEvent, inv: any[], leadIn: string): NextScene {
  const choices = ev.choices.map((c) => {
    const miss = (CHOICE_REQUIREMENTS[c.id] || []).filter((q) => !hasItem(inv, q.re));
    return miss.length ? `${c.text} [Thiếu: ${miss.map((m) => m.label).join(', ')}]` : c.text;
  }) as [string, string, string];
  return {
    id: ev.id, kind: 'event',
    situation: `${ev.isEmergency ? '[TÌNH HUỐNG KHẨN CẤP THỜI GIAN THỰC]\n\n' : ''}${ev.title}\n\n${leadIn ? leadIn + ' ' : ''}${ev.description}`,
    choices,
    isEmergency: ev.isEmergency,
    emergencySeconds: ev.emergencySeconds,
    dangerLevel: ev.dangerLevel,
    soundCue: ev.soundCue,
  };
}

function milestoneScene(id: string): NextScene {
  const m = milestoneById(id)!;
  return {
    id, kind: 'milestone',
    situation: `${m.title}\n\n${MS_LEAD_IN[id] || ''} ${m.description}\n\n${m.contextPrompt}`,
    choices: m.majorChoices.map((c) => c.label) as [string, string, string],
    isEmergency: false,
    dangerLevel: 4,
    soundCue: 'heartbeat',
  };
}

// Xác suất mỗi lượt xảy ra một sự kiện ngẫu nhiên (chưa tính các sự kiện đã lên lịch/cột mốc).
// Căn cứ quân sự nguy hiểm gấp 2.5 lần chung cư, ván càng về sau càng căng,
// và càng lâu không có biến cố thì xác suất càng nhích lên (nhịp căng - nghỉ).
function randomEventChance(day: number, baseType: string, sinceSpecial: number): number {
  const base = 0.15;
  const dayBonus = Math.min(0.1, day * 0.005);
  const quietBonus = Math.min(0.1, Math.max(0, sinceSpecial - 2) * 0.03);
  const baseMultiplier = baseType === 'Military Base' ? 2.5 : 1;
  return Math.min(0.6, (base + dayBonus + quietBonus) * baseMultiplier);
}

export function planTurn(req: any, rng: Rng = Math.random): TurnPlan {
  const day = req.day || 1;
  const turn = req.turnCount || 1;
  const nextTurn = turn + 1;
  const nextDay = Math.floor(nextTurn / 3) + 1;
  const newDay = nextDay > day;
  const inv: any[] = req.player?.inventory || [];
  const comps: any[] = req.companions || [];

  const done: string[] = [...(req.doneSceneIds || [])];
  if (req.sceneId) done.push(req.sceneId);
  const count = (id: string) => done.filter((d) => d === id).length;
  let sinceSpecial = 0;
  for (let i = done.length - 1; i >= 0; i--) {
    if (!done[i].startsWith('r_')) break;
    sinceSpecial++;
  }
  const hadSpecialEver = done.some((d) => !d.startsWith('r_'));
  if (!hadSpecialEver) sinceSpecial = done.length;
  const specialAllowed = nextTurn >= 4 && sinceSpecial >= 2;

  const resolution = resolveAction(req, rng);

  // Thời tiết & dự báo: chỉ đổi khi sang ngày mới, và bám dự báo hôm trước (65%).
  let weather: WeatherType = req.weather || 'clear';
  let forecast: WeatherForecast = req.tomorrowForecast;
  if (newDay) {
    weather = rollActualWeather(forecast, weather, rng);
    forecast = makeForecast(weather, rng);
  } else if (!forecast) {
    forecast = makeForecast(weather, rng);
  }

  const ctx = buildCtx(req, nextDay, weather);

  // Lên lịch sự kiện (báo trước qua radio, xảy ra vào ngày hôm sau).
  let pending: PendingEvent[] = (req.pendingEvents || []).map((p: PendingEvent) => ({ ...p }));
  const intel: RadioIntel[] = [];
  const triggers: string[] = [];

  if (newDay) {
    intel.push({ kind: 'weather', weather: forecast.weather });
    triggers.push(`Forecast: ${forecast.weather}`);

    if (!pending.length) {
      const m1Done = done.includes('milestone_1_hospital');
      const m2Done = done.includes('milestone_2_bloodwolf_raiders');
      const options: string[] = [];
      if (nextDay >= 4 && count('event_horde_night') < EVENT_RULES.event_horde_night.max) options.push('event_horde_night');
      if (nextDay >= 3 && count('event_supply_drop') < EVENT_RULES.event_supply_drop.max) options.push('event_supply_drop');
      if (m1Done && !m2Done && nextDay >= 3) {
        pending.push({ id: 'milestone_2_bloodwolf_raiders', dueDay: Math.max(nextDay + 1, MS_MIN_DAY[1]) });
      } else if (options.length && rng() < 0.45) {
        pending.push({ id: pickFrom(options, rng), dueDay: nextDay + 1 });
      }
      const fresh = pending[pending.length - 1];
      if (fresh && fresh.dueDay > nextDay) {
        const kind = fresh.id === 'event_horde_night' ? 'horde' : fresh.id === 'event_supply_drop' ? 'supply' : 'bandit';
        intel.push({ kind, dueDay: fresh.dueDay });
        const label = kind === 'horde' ? 'Horde Attack' : kind === 'supply' ? 'Supply Drop' : 'Bandit Activity';
        triggers.push(`Upcoming: ${label} | day ${fresh.dueDay}`);
      }
    }
  }

  // Chọn cảnh kế tiếp theo thứ tự ưu tiên.
  let next: NextScene | null = null;
  let consumedPending: string | null = null;
  const finalDay = nextDay >= 30;

  if (specialAllowed && !finalDay) {
    // 1) Cột mốc theo ngày (cột mốc 2 đi qua lịch có báo radio).
    for (let i = 0; i < STORY_MILESTONES.length; i++) {
      const m = STORY_MILESTONES[i];
      if (done.includes(m.id)) continue;
      if (m.id === 'milestone_4_mutation_crisis' && comps.length === 0) continue; // không có đồng đội thì bỏ qua
      // Cột mốc đầu tiên chưa xong là cột mốc duy nhất được xét; cột mốc 2 chờ lịch phát sóng radio.
      if (!MS_VIA_PENDING.has(m.id) && nextDay >= MS_MIN_DAY[i]) next = milestoneScene(m.id);
      break;
    }
    // 2) Sự kiện đã lên lịch đến hạn.
    if (!next) {
      const due = pending.find((p) => p.dueDay <= nextDay);
      if (due) {
        consumedPending = due.id;
        next = due.id.startsWith('milestone_') ? milestoneScene(due.id) : eventScene(eventById(due.id)!, inv, LEAD_IN[due.id] || '');
      }
    }
    // 3) Bão do dự báo ứng nghiệm.
    if (!next && newDay && weather === 'heavy_rain' && count('event_acid_rain_superstorm') < 3) {
      next = eventScene(eventById('event_acid_rain_superstorm')!, inv, LEAD_IN.event_acid_rain_superstorm);
    }
    // 4) Sự kiện ngẫu nhiên có điều kiện (không còn bốc thăm 28% mỗi lượt như trước).
    if (!next && nextDay >= 2 && rng() < randomEventChance(nextDay, ctx.baseType, sinceSpecial)) {
      const pool = RANDOM_EVENTS.filter((e) => {
        const rule = EVENT_RULES[e.id];
        if (!rule || rule.weatherOnly || rule.scheduled) return false;
        if (nextDay < rule.minDay || count(e.id) >= rule.max) return false;
        if (rule.needsDone && !done.includes(rule.needsDone)) return false;
        if (rule.skipIfHas && comps.some((c) => (c.name || '').includes(rule.skipIfHas!))) return false;
        return true;
      });
      if (pool.length) {
        const ev = pickFrom(pool, rng);
        next = eventScene(ev, inv, LEAD_IN[ev.id] || '');
      }
    }
  }

  if (consumedPending) pending = pending.filter((p) => p.id !== consumedPending);

  // 5) Cảnh thường theo nhu cầu / ngẫu nhiên, có cửa sổ chống lặp.
  if (!next) {
    const recent = done.slice(-5);
    const needRecent = done.slice(-4);
    const eligible = ROUTINE_SCENES.filter((s) => !s.when || s.when(ctx));
    const urgent = eligible.filter((s) => s.need && s.need(ctx) && !needRecent.includes(s.id));
    const fresh = eligible.filter((s) => !recent.includes(s.id));
    const scene = urgent.length ? pickFrom(urgent, rng) : fresh.length ? pickFrom(fresh, rng) : pickFrom(eligible.filter((s) => s.id !== done[done.length - 1]), rng);
    const flavor = pickFrom(WEATHER_FLAVOR[weather], rng);
    const extra = ctx.blackout ? ' Cả thành phố chìm trong bóng tối đen đặc.' : ctx.waterCut ? ' Không khí khô ngột ngạt và đường ống nước đã cạn.' : '';
    next = {
      id: scene.id, kind: 'routine',
      situation: `Ngày ${nextDay} - ${ctx.location}.${extra}\n\n${flavor}\n\n${scene.situation(ctx)}`,
      choices: scene.choices.map((c) => {
        const miss = (c.requires || []).filter((q) => !hasItem(inv, q.re));
        return miss.length ? `${c.text} [Thiếu: ${miss.map((m) => m.label).join(', ')}]` : c.text;
      }) as [string, string, string],
      isEmergency: false,
      dangerLevel: Math.min(5, 2 + (ctx.blackout ? 1 : 0) + (weather === 'night_dark' ? 1 : 0)),
      soundCue: scene.id === 'r_noise_next_room' ? 'zombie_growl' : 'loot',
    };
  }

  // Cột mốc môi trường: chỉ công bố ĐÚNG MỘT LẦN khi sang ngày 7 / 10 (bản cũ lặp lại 3 lần).
  let systemNote: string | undefined;
  if (newDay && nextDay === 7) {
    next.situation = `[CỘT MỐC SINH TỬ NGÀY 7 - MẤT NƯỚC TOÀN ĐÔ THỊ]\nBạn mở van vòi nước trong góc nhà, chỉ nghe tiếng rít khô khốc của không khí và vài giọt cặn gỉ sét đỏ quạch. Nhà máy cấp nước thành phố đã ngừng hoạt động. Từ hôm nay, nước đóng chai và nước mưa là nguồn sống duy nhất.\n\n${next.situation}`;
    systemNote = '⚠️ CỘT MỐC NGÀY 7: Hệ thống cấp nước toàn đô thị đã sụp đổ! Tốc độ khát nước tăng +50%.';
  } else if (newDay && nextDay === 10) {
    next.situation = `[CỘT MỐC SINH TỬ NGÀY 10 - LƯỚI ĐIỆN QUỐC GIA SỤP ĐỔ]\nMột tiếng nổ trầm đục vang lên từ trạm biến áp xa xa, kéo theo ánh chớp xanh rồi tắt hẳn. Đèn đường, quạt thông gió, mọi thứ chìm vào bóng tối. Thực phẩm tươi trong tủ lạnh dân sự sẽ thối rữa rất nhanh nếu bạn không có máy phát điện.\n\n${next.situation}`;
    systemNote = '⚠️ CỘT MỐC NGÀY 10: Lưới điện quốc gia đã sụp đổ vĩnh viễn! Kỷ nguyên đêm tối và hư hỏng thực phẩm bắt đầu.';
  } else if (next.isEmergency) {
    systemNote = 'CẢNH BÁO THỜI GIAN THỰC: Hành động khẩn cấp cần được quyết định ngay trước khi cạn giờ!';
  }

  // Nếu sự kiện đến hạn xảy ra ngay lượt này, trigger tức thời; nếu không là trigger tương lai.
  let systemTrigger: string | null = triggers.length ? triggers.join(' || ') : null;
  const immediate = consumedPending === 'event_horde_night' ? 'Event: Horde Attack' : next.id === 'event_acid_rain_superstorm' ? 'Weather: Heavy Storm' : null;
  if (immediate) systemTrigger = [immediate, ...triggers].join(' || ');

  const radio = intel.length ? buildRadioTransmission(intel, { baseType: ctx.baseType, day: nextDay }, rng) : null;

  const baseStats = {
    hp: 0, infection: 0,
    hunger: 6,
    thirst: ctx.waterCut ? 12 : 8,
    stamina: -9,
    sanity: ctx.blackout ? -3 : -2,
  };

  const recentChoices = (req.history || []).slice(-3).flatMap((h: any) => h.choices || []);

  return {
    resolution, next, day, nextDay, nextTurn, newDay, weather, forecast, pending,
    systemTrigger, radio, systemNote,
    waterCut: ctx.waterCut, blackout: ctx.blackout,
    needMap: newDay && !inv.some((i) => /băng|gạc|thuốc/i.test(i.name || '')),
    baseStats, recentChoices,
  };
}

export function mergeStats(base: SceneStats, extra: SceneStats, weather: WeatherType): SceneStats {
  const total: SceneStats = {};
  (['hp', 'hunger', 'thirst', 'infection', 'sanity', 'stamina'] as const).forEach((k) => {
    total[k] = (base[k] ?? 0) + (extra[k] ?? 0);
  });
  // Hao hụt cơ bản chịu ảnh hưởng thời tiết, phần thưởng/hồi phục từ hành động thì không.
  const weathered = applyWeatherToStats(base, weather);
  total.thirst = (weathered.thirst ?? 0) + (extra.thirst ?? 0);
  total.stamina = (weathered.stamina ?? 0) + (extra.stamina ?? 0);
  return total;
}

export function companionUpdatesFor(req: any, plan: TurnPlan, rng: Rng = Math.random): any[] {
  const comps: any[] = req.companions || [];
  const updates = [...plan.resolution.companionUpdates];
  if (!comps.length || updates.length) return updates;
  const c = comps[Math.floor(rng() * comps.length)];
  if (c.status === 'deceased') return updates;
  updates.push({ name: c.name, trustChange: 1, dialogue: pickFrom(COMPANION_LINES, rng) });
  return updates;
}

// ---------- Kết xuất phản hồi offline (không có Gemini) ----------
export function renderOfflineTurn(req: any, plan: TurnPlan, rng: Rng = Math.random) {
  const r = plan.resolution;
  const total = mergeStats(plan.baseStats, r.stats, plan.weather);
  const victory = plan.nextDay >= 30 || r.ending?.is_victory;
  return {
    outcome: r.outcome,
    situation: plan.next.situation,
    choices: plan.next.choices,
    scene_id: plan.next.id,
    customChoiceAllowed: true,
    dangerLevel: plan.next.dangerLevel,
    location: req.currentLocation || 'Khu nhà bỏ hoang',
    weather: plan.weather,
    tomorrowForecast: plan.forecast,
    isEmergency: plan.next.isEmergency,
    emergencySeconds: plan.next.emergencySeconds,
    cityWaterCutoff: plan.waterCut,
    cityPowerBlackout: plan.blackout,
    system_trigger: plan.systemTrigger,
    radio_transmission: plan.radio,
    pending_events: plan.pending,
    statChanges: total,
    weatherApplied: true,
    woundChange: r.woundChange || null,
    itemsGained: r.gain,
    itemsLost: r.lose,
    loot_notification: r.gain.map((g) => `${g.name} x${g.quantity}`),
    system_note: plan.systemNote,
    companionUpdates: companionUpdatesFor(req, plan, rng),
    newCompanion: r.newCompanion,
    newSkill: r.newSkill,
    game_ending: victory
      ? {
          is_game_over: false,
          is_victory: true,
          epilogue: r.ending?.epilogue || `Bạn đã sống sót qua ${plan.nextDay} ngày khốc liệt. Căn cứ nhỏ của bạn vẫn đứng vững giữa thành phố chết, và những người còn lại cùng bạn đón ánh bình minh đầu tiên không còn tiếng rên của lũ quái vật.`,
        }
      : undefined,
    soundCue: plan.next.soundCue,
    _needMap: plan.needMap,
  };
}
