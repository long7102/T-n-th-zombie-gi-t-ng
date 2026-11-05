import { Companion, Item, PendingEvent, WeatherForecast, WeatherType } from '../types/game';
import { RANDOM_EVENTS, REALISTIC_SURVIVOR_ROSTER, RandomEvent } from './randomEvents';
import { STORY_MILESTONES } from './storyBranches';
import { OPENING_SETS, ROUTINE_SCENES, RoutineChoice, RoutineScene, SceneCtx, SceneStats, WEATHER_FLAVOR, CompView, TeamOp, selectCompanions } from './scenes';
import { fill, getSetting, locationText, moveText, Setting, Zone } from './settings';
import { LootTableId, rollLoot } from './lootTables';
import { parseStrangerId, resolveStranger, rollStranger, strangerScene, strangerZones, StrangerSpec } from './strangers';
import { buildRadioTransmission, RadioIntel } from './radio';
import { composeEnding, EndingInput } from './storyArc';
import { servingOf, fmtNamed } from './units';
import { damageReduction } from './equipment';
import { resolveRaid, raidTypeFor, raidDayOf, exposureOf, RaidType } from './raid';
import { decodeMapAction, getNodeAny, REGION_LABEL } from './worldMap';
import { VEHICLES, ROAD_EVENTS, SAFE_ROAD_LINES, fuelNeededRoundTrip, VehicleKind } from './vehicles';

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
  pendingRecruit?: Companion;   // người vừa được cứu, đang chờ người chơi quyết định nhận hay không
  clearRecruit?: boolean;
  newSkill?: { name: string; description: string; category: any };
  companionUpdates: any[];
  ending?: { is_game_over: boolean; is_victory: boolean; epilogue?: string; cause_of_death?: string };
  failed?: boolean;
  zone?: Zone;
  flags?: string[];
  flagsRemove?: string[];
  baseDelta?: { fortification: number; moduleLoss: string[]; stolen: { name: string; quantity: number }[] };
  vehicleDelta?: { condition: number; fuel: number };
  deterministic: boolean;
}

export interface NextScene {
  id: string;
  kind: 'routine' | 'event' | 'milestone';
  zone: Zone;
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
  zone: Zone;
  settingId: string;
  location: string;
  awayTurns: number;
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
  m5_broadcast_truth: {
    tag: 'ending_voice_in_storm', ending: 'Bạn chiếm đài phát sóng trên tháp và đọc cho cả thành phố nghe điều bạn đã ghép được. Không ai biết bao nhiêu người nghe thấy. Kết cục: TIẾNG NÓI TRONG BÃO.',
    outcome: 'Bạn chiếm đài phát sóng trên nóc tháp, mở máy và bắt đầu nói.', stats: { hp: -8, stamina: -25, sanity: 6 },
  },
  m5_bunker_refuge: {
    tag: 'ending_last_home', ending: 'Bạn bỏ lại trực thăng. Cả nhóm chui qua đường hầm cũ, theo tín hiệu mà bạn từng cứu. Kết cục: MÁI NHÀ CUỐI CÙNG.',
    outcome: 'Bạn bỏ chuyến bay, dẫn cả nhóm xuyên đường hầm tối về phía Bunker 13.', stats: { stamina: -22, sanity: 8 },
  },
  m5_hold_the_street: {
    tag: 'ending_street_keeper', ending: 'Bạn ở lại cùng Đội Cây Cầu, chặn lối vào phố bằng chính xe cộ đổ nát. Kết cục: NGƯỜI GÁC PHỐ.',
    outcome: 'Bạn từ chối lên máy bay, cùng Đội Cây Cầu chặn đầu phố trước đợt xác sống cuối cùng.', stats: { hp: -12, stamina: -28 },
  },
};

type MajorChoice = (typeof STORY_MILESTONES)[number]['majorChoices'][number];
// Các kết cục chỉ mở khi người chơi đã làm đủ việc: manh mối, đồng minh, quan hệ với phe khác.
const EXTRA_ENDINGS: { choice: MajorChoice; when: (flags: string[]) => boolean }[] = [
  { when: (f) => f.filter((x) => /^clue_\d$/.test(x)).length >= 5, choice: { id: 'm5_broadcast_truth', label: 'Chiếm đài phát sóng trên tháp và đọc cho cả thành phố nghe sự thật bạn đã ghép được', shortDescription: 'Dùng giây phút cuối để nói ra điều bị giấu.', consequenceTag: 'ending_voice_in_storm', worldImpact: 'Kết Cục: "TIẾNG NÓI TRONG BÃO"', karmaChange: 25 } },
  { when: (f) => f.includes('bunker13_heroes') || f.includes('bunker13_diverted_horde'), choice: { id: 'm5_bunker_refuge', label: 'Bỏ trực thăng, dẫn cả nhóm chui đường hầm về Bunker 13 mà bạn từng cứu', shortDescription: 'Về nơi có người nợ bạn một mái nhà.', consequenceTag: 'ending_last_home', worldImpact: 'Kết Cục: "MÁI NHÀ CUỐI CÙNG"', karmaChange: 20 } },
  { when: (f) => f.includes('rival_allied'), choice: { id: 'm5_hold_the_street', label: 'Ở lại cùng Đội Cây Cầu chặn đầu phố, biến khu phố thành thành trì', shortDescription: 'Giữ lời hứa với những người đã tin bạn.', consequenceTag: 'ending_street_keeper', worldImpact: 'Kết Cục: "NGƯỜI GÁC PHỐ"', karmaChange: 20 } },
];

// Ba lựa chọn cuối cùng thay đổi theo những gì người chơi đã làm: càng nhiều mối quan hệ, càng nhiều lối thoát.
function finalChoices(ms: (typeof STORY_MILESTONES)[number], flags: string[]): MajorChoice[] {
  const [helo, stand, waste] = ms.majorChoices;
  const extras = EXTRA_ENDINGS.filter((e) => e.when(flags)).map((e) => e.choice);
  return [helo, ...extras, stand, waste].slice(0, 3);
}

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
const hasItem = (inv: any[], re: RegExp, cat?: string) =>
  inv.some((i) => re.test(i.name || '') && (i.quantity ?? 1) > 0 && (!cat || i.category === cat));
const pickFrom = <T,>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];
const realNameOf = (c: any): string => c.realName || c.name || '';

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

// Nhân vật mới luôn chưa biết tên: dùng biệt danh theo ngoại hình/nghề cho đến khi họ cho bạn biết.
function anonymize(c: Companion, turn: number): Companion {
  if (c.nameKnown === false) return c;
  const alias = `${c.gender === 'female' ? 'Người phụ nữ lạ' : 'Người đàn ông lạ'} (${(c.role || 'người sống sót').toLowerCase()})`;
  return { ...c, realName: c.realName || c.name, name: alias, nameKnown: false, joinedTurn: turn };
}

function eventById(id: string): RandomEvent | undefined {
  return RANDOM_EVENTS.find((e) => e.id === id);
}
function milestoneById(id: string) {
  return STORY_MILESTONES.find((m) => m.id === id);
}

// Ăn thật: chọn món theo sở thích (ready = ăn liền, cook = món cần nấu), tính độ no, đồ sống/ôi gây hại.
function applyEating(r: ChosenResolution, inv: any[], mode: 'ready' | 'cook' | 'any', mult: number, preferred?: any, people = 1) {
  const foods = inv.filter((i) => i.category === 'food' && (i.hungerReduce ?? 0) > 0 && (i.quantity ?? 1) > 0);
  const byFresh = (a: any, b: any) => (a.freshness ?? 999) - (b.freshness ?? 999);
  let pool = foods;
  if (mode === 'cook') pool = foods.filter((f) => f.needsCooking && !f.isCooked);
  if (mode === 'ready') pool = foods.filter((f) => !f.needsCooking || f.isCooked);
  if (!pool.length) pool = foods;
  const food = preferred || [...pool].sort(byFresh)[0];
  if (!food) return false;
  const rawEaten = food.needsCooking && !food.isCooked && mode !== 'cook';
  const spoiled = food.freshness !== undefined && food.freshness < 30;
  // Gạo tính theo kg: mỗi người một bữa ~100 g, cả nhóm cùng ăn. Đồ đếm theo cái thì ăn 1 cái.
  const sv = servingOf(food, people, mult);
  const relief = Math.round((food.unit === 'kg' ? sv.hunger : food.hungerReduce * mult) * (spoiled ? 0.5 : 1) * (rawEaten ? 0.55 : 1));
  r.stats.hunger = (r.stats.hunger ?? 0) - relief;
  r.lose.push({ name: food.name, quantity: sv.used });
  r.outcome += ` (Đã dùng: ${sv.label}.)`;
  if (rawEaten) {
    r.stats.infection = (r.stats.infection ?? 0) + 8;
    r.stats.stamina = (r.stats.stamina ?? 0) - 4;
    r.outcome += ' Ăn sống thứ này khiến bụng bạn cồn cào khó chịu: lẽ ra nên nấu chín trước.';
  }
  if (spoiled) {
    r.stats.infection = (r.stats.infection ?? 0) + 6;
    r.outcome += ' Thức ăn đã ôi, bụng bạn quặn lên ngay sau đó.';
  }
  return true;
}

function applyDrinking(r: ChosenResolution, inv: any[], preferred?: any) {
  const waters = inv.filter((i) => (i.thirstReduce ?? 0) > 0 && (i.quantity ?? 1) > 0);
  const w = preferred || [...waters].sort((a, b) => Number(!!a.needsCooking) - Number(!!b.needsCooking))[0];
  if (!w) return false;
  const sv = servingOf(w);
  r.stats.thirst = (r.stats.thirst ?? 0) - sv.thirst;
  r.lose.push({ name: w.name, quantity: sv.used });
  r.outcome += ` (Đã uống: ${sv.label}.)`;
  if (w.needsCooking && !w.isCooked) {
    r.stats.infection = (r.stats.infection ?? 0) + 7;
    r.outcome += ' Nước chưa đun sôi khiến bụng bạn đau quặn: nhớ đun sôi lần sau.';
  }
  return true;
}

function withMove(r: ChosenResolution, setting: Setting, from: Zone, to: Zone) {
  if (from === to) return r;
  const mv = moveText(setting, from, to);
  r.outcome = `${r.outcome}${r.outcome && !/\s$/.test(r.outcome) ? ' ' : ''}${mv}`.trim();
  r.zone = to;
  return r;
}

// ---------- Xử lý hành động của người chơi ----------
const RECRUIT_CHOICES = [
  'Cho họ ở lại cùng, chia phần ăn và chỗ ngủ',
  'Đưa ít nước và đồ ăn, để họ tự tìm chỗ khác',
  'Từ chối: bạn không thể nuôi thêm ai',
];

function recruitScene(who: any, zone: Zone, setting: Setting): NextScene {
  return {
    id: 'r_recruit_decision', kind: 'event', zone,
    situation: `${who.name} đứng trước mặt bạn, người run run vì đói và sợ. Cứu được người đã khó, giữ họ lại còn khó hơn: thêm một miệng ăn, thêm một người bạn phải tin hoặc phải đề phòng. Bạn có muốn nhận họ vào nhóm không?`,
    choices: RECRUIT_CHOICES as unknown as [string, string, string],
    isEmergency: false, dangerLevel: 2, soundCue: 'heartbeat',
  };
}

function resolveAction(req: any, rng: Rng, setting: Setting, zone: Zone, turn: number): ChosenResolution {
  const comps: any[] = req.companions || [];
  const inv: any[] = req.player?.inventory || [];

  const mapTrip = decodeMapAction(req.chosenAction || '');
  if (mapTrip) return resolveMapTravel(mapTrip, req, rng, setting, zone);

  const action = norm(req.chosenAction || '');
  const sceneId: string = req.sceneId || '';

  // Người vừa được cứu: bạn quyết định nhận họ vào nhóm hay không
  if (sceneId === 'r_recruit_decision' && req.pendingRecruit) {
    const who = req.pendingRecruit;
    let idx = RECRUIT_CHOICES.findIndex((c) => norm(c) === action);
    // Tự gõ quyết định: nhận ra ý nhận / cho đồ rồi để đi / từ chối; câu khác thì vẫn giữ người đó đứng chờ
    if (idx < 0) {
      if (W('từ chối|không nhận|đuổi|không thể nuôi|cút').test(action.toLowerCase())) idx = 2;
      else if (W('nhận|cho ở lại|đi cùng|ở lại cùng|đồng ý|vào nhóm|theo tôi').test(action.toLowerCase())) idx = 0;
      else if (W('đưa|cho (họ|người)|để họ (đi|tự)|chỉ đường|tự tìm').test(action.toLowerCase())) idx = 1;
    }
    if (idx < 0) {
      const talk = resolveCustom(req.chosenAction || '', inv, comps, rng, setting, zone, turn, req);
      talk.pendingRecruit = who;
      return talk;
    }
    const r = blankRes('event', '');
    r.clearRecruit = true;
    r.deterministic = true;
    if (idx === 0) {
      if (comps.filter((c) => c.status !== 'deceased').length >= 3) {
        r.outcome = 'Bạn muốn nhận người này, nhưng nhóm đã đủ đông và chỗ trú không đủ phần ăn. Bạn nói thật, và người đó gật đầu hiểu chuyện rồi đi tìm nơi khác.';
        r.stats = { sanity: -2 };
      } else {
        r.outcome = `Bạn gật đầu. ${who.name} thở ra nhẹ nhõm, nhận lấy phần nước bạn đưa. Từ giờ người đó đi cùng bạn, chia phần ăn và phiên canh.`;
        r.stats = { sanity: 2 };
        r.newCompanion = who;
        r.flags = ['saved_stranger'];
      }
    } else if (idx === 1) {
      const food = inv.find((i) => i.category === 'food' && (i.hungerReduce ?? 0) > 0 && (i.quantity ?? 1) > 0 && i.unit !== 'kg');
      const water = inv.find((i) => (i.thirstReduce ?? 0) > 0 && (i.quantity ?? 1) > 0 && i.unit !== 'l');
      if (food) r.lose.push({ name: food.name, quantity: 1 });
      if (water) r.lose.push({ name: water.name, quantity: 1 });
      r.outcome = `Bạn đưa ${who.name} ${food || water ? 'chút đồ ăn thức uống' : 'lời chỉ đường'} và chỉ hướng nơi có thể trú tạm. Người đó cúi đầu cảm ơn rồi đi, không ngoái lại.`;
      r.stats = { sanity: -1 };
    } else {
      r.outcome = `Bạn lắc đầu: bạn không thể nuôi thêm ai. ${who.name} nhìn bạn rất lâu rồi quay đi. Cánh cửa khép lại, và có gì đó trong bạn cũng nặng hơn.`;
      r.stats = { sanity: -4 };
      r.flags = ['abandoned_survivor'];
    }
    return r;
  }

  if (req.actionType === 'emergency_timeout') {
    const r = blankRes('timeout', 'Cơ thể bạn đông cứng vì sợ hãi. Khi tỉnh lại, khoảnh khắc quyết định đã trôi qua và hậu quả ập xuống: bạn bị thương và mất bình tĩnh, còn cơ hội cứu người hoặc đoạt đồ đã vuột khỏi tầm tay.');
    r.stats = { hp: -12, sanity: -8, stamina: -10 };
    r.deterministic = true;
    return r;
  }

  // Mở đầu
  if (sceneId.startsWith('r_start')) {
    const n = parseInt(sceneId.split(':')[1] || '', 10);
    const ch = Number.isNaN(n) ? undefined : OPENING_SETS[n % OPENING_SETS.length].find((c) => fill(c.text, setting) === action);
    if (ch) return fromRoutineChoice(ch, inv, comps, '', rng, setting, zone, req.flags || [], req);
  }

  // Cảnh thường
  const routine = ROUTINE_SCENES.find((s) => s.id === sceneId);
  if (routine) {
    const ch = routine.choices.find((c) => fill(c.text, setting) === action);
    if (ch) return fromRoutineChoice(ch, inv, comps, sceneId, rng, setting, zone, req.flags || [], req);
  }

  // Người lạ ngẫu nhiên
  const spec = parseStrangerId(sceneId);
  if (spec) {
    const sc = strangerScene(spec, setting);
    const idx = sc.choices.findIndex((c) => c === action);
    if (idx >= 0) {
      const sr = resolveStranger(spec, idx, turn, rng);
      if (sr.requires && !hasItem(inv, sr.requires.re)) return failMissing('event', sr.requires.label);
      const r = blankRes('event', sr.outcome);
      r.stats = { ...sr.stats };
      r.gain = sr.gain;
      r.lose = sr.lose.filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
      if (sr.recruit) {
        if (comps.length >= 3) r.outcome += ' Nhóm của bạn đã đủ đông, người đó đành tìm đường riêng.';
        else { r.pendingRecruit = sr.recruit; r.outcome += ' Người đó đứng chờ câu trả lời của bạn: có cho đi cùng hay không là quyết định của bạn.'; }
      } else if (sr.abandon) r.flags = ['abandoned_stranger'];
      r.deterministic = true;
      return r;
    }
  }

  // Sự kiện có sẵn
  const ev = eventById(sceneId);
  if (ev) {
    const ch = localizedEvent(ev, setting).choices.find((c) => norm(c.text) === action);
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
        if (comps.length >= 3) r.outcome += ' Nhóm của bạn đã đủ đông, người đó đành tìm đường riêng.';
        else {
          r.outcome += ' Người đó đứng chờ câu trả lời của bạn: có cho đi cùng hay không là quyết định của bạn.';
          r.pendingRecruit = anonymize({
            ...ev.survivorCandidate,
            trust: Math.min(100, ev.survivorCandidate.trust + (ch.companionImpact?.trustChange || 0)),
            lastComment: ch.companionImpact?.comment || ev.survivorCandidate.lastComment,
            hasBeenRescued: true,
          }, turn);
        }
      }
      if (ev.survivorCandidate && !ch.rescuesCompanion) r.flags = ['abandoned_survivor'];
      if (ch.id === 'raider_molotov_counter') r.flags = ['killed_raiders'];
      if (ev.id === 'event_horde_night' && req.base?.hasBase) {
        const fort = req.base.fortification || 0;
        const f = Math.min(0.5, fort / 200);
        (['stamina', 'sanity'] as const).forEach((k) => {
          if ((r.stats[k] ?? 0) < 0) r.stats[k] = Math.round((r.stats[k] as number) * (1 - f));
        });
        if (req.base.facilities?.hasTripwireAlarms) r.stats.sanity = (r.stats.sanity ?? 0) + 3;
        r.outcome += ` Căn cứ được gia cố ${fort}% giúp bạn chịu đựng dễ hơn hẳn.${req.base.facilities?.hasTripwireAlarms ? ' Chuông báo động giăng quanh cửa cho bạn kịp phản ứng.' : ''}`;
      }
      if (ch.id === 'sewer_dodge_and_retreat') r.woundChange = { inflicted: true, location: 'Vết cào ở mắt cá chân' };
      if (ch.id === 'drop_rush_crate') r.woundChange = { inflicted: true, location: 'Vết cào rách ở cánh tay' };
      r.deterministic = true;
      return r;
    }
  }

  // Cột mốc
  const ms = milestoneById(sceneId);
  if (ms) {
    const mc = (ms.id === 'milestone_5_final_evacuation' ? [...ms.majorChoices, ...EXTRA_ENDINGS.map((e) => e.choice)] : ms.majorChoices).find((c) => c.label === action);
    const fx = mc && MS_EFFECTS[mc.id];
    if (mc && fx) {
      const r = blankRes('milestone', fx.outcome);
      r.stats = { ...(fx.stats || {}) };
      r.gain = toItems(fx.gain);
      r.lose = (fx.lose || []).filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
      if (fx.skill) r.newSkill = fx.skill;
      if (fx.recruit) {
        const cand = REALISTIC_SURVIVOR_ROSTER.find((c) => c.id === fx.recruit);
        if (cand && !comps.some((c) => c.id === cand.id) && comps.length < 3) {
          r.outcome += ' Người đó đứng chờ câu trả lời của bạn: có cho đi cùng hay không là quyết định của bạn.';
          r.pendingRecruit = anonymize({ ...cand, trust: Math.min(100, cand.trust + 30), hasBeenRescued: true }, turn);
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
      r.flags = [fx.tag];
      if (fx.ending) {
        const choice = ({ m5_board_helo_with_cure: 'helo', m5_heroic_last_stand: 'last_stand', m5_broadcast_truth: 'broadcast', m5_bunker_refuge: 'bunker', m5_hold_the_street: 'street' } as Record<string, EndingInput['choice']>)[mc.id] || 'wasteland';
        const epilogue = composeEnding({ choice, flags: req.flags || [], companions: comps, base: req.base || {} });
        r.ending = { is_game_over: false, is_victory: true, epilogue };
      }
      r.deterministic = true;
      return r;
    }
  }

  // Còn lại: hành động người chơi tự nhập (hoặc cảnh do AI tạo) -> phân tích ý định
  return resolveCustom(action, inv, comps, rng, setting, zone, turn, req);
}

// ---------- Di chuyển trên bản đồ: tất định theo quãng đường, độ nguy hiểm và số lần đã ghé ----------
const NODE_TABLE: Record<string, LootTableId> = {
  hardware: 'hardware', pharmacy: 'pharmacy', market: 'market', grocer: 'warehouse', hospital: 'pharmacy',
  bridge: 'vehicle', industrial: 'hardware', tower: 'office', stadium: 'warehouse',
};

function resolveMapTravel(mt: { nodeId: string; style: 'quick' | 'thorough'; hops: number; visits: number; text: string; vehicle?: string; vcond: number; vfuel: number; crew: number }, req: any, rng: Rng, setting: Setting, zone: Zone): ChosenResolution {
  const node = getNodeAny(mt.nodeId);
  if (!node) return resolveCustom(mt.text, req.player?.inventory || [], req.companions || [], rng, setting, zone, req.turnCount || 1, req);
  const weather: WeatherType = req.weather || 'clear';
  const thorough = mt.style === 'thorough';
  const hops = Math.max(1, mt.hops);
  const r = blankRes('custom', '');
  r.deterministic = true;

  // Xe cộ: đi nhanh, nhẹ sức, nhưng tốn xăng và gặp sự cố. Hết xăng thì phải đi bộ.
  const vdef = mt.vehicle && VEHICLES[mt.vehicle as VehicleKind] ? VEHICLES[mt.vehicle as VehicleKind] : undefined;
  const needFuel = vdef ? fuelNeededRoundTrip(vdef.kind, hops) : 0;
  const useVehicle = !!vdef && mt.vfuel >= needFuel && mt.vcond > 0;
  const crew = Math.max(0, Math.min(mt.crew || 0, vdef ? vdef.crew : 0));
  const speed = useVehicle && vdef ? vdef.speed : 1;
  let stamina = -(6 * hops + (thorough ? 9 : 3)) * speed;
  if (weather === 'heavy_rain' || weather === 'freezing_cold') stamina = stamina * 1.2;
  stamina = Math.round(stamina);
  const stats: SceneStats = { stamina, hunger: Math.round(2 * hops * speed) + crew, thirst: Math.round(2 * hops * speed) + crew, hp: 0, sanity: 0 };
  let vCond = 0;
  let vFuel = 0;

  const lines: string[] = [];
  if (zone !== 'shelter') lines.push(moveText(setting, zone, 'shelter'));
  lines.push(`Bạn chuẩn bị đồ rồi rời ${setting.labels.shelter} đi một chuyến dài.`);
  if (vdef && !useVehicle) lines.push(mt.vcond <= 0 ? `${vdef.name} đã hỏng nặng nên bạn phải đi bộ.` : `${vdef.name} không đủ nhiên liệu cho cả đi lẫn về nên bạn phải bỏ xe lại, đi bộ.`);
  if (useVehicle && vdef) {
    lines.push(`Bạn khởi động ${vdef.name.toLowerCase()}${crew ? ` chở thêm ${crew} người` : ''}, tiếng máy xé toang cái im lặng của khu phố rồi lao về phía ${node.name} (${REGION_LABEL[node.region]}).`);
    vFuel -= needFuel;
    if (vdef.noise >= 3) stats.sanity = (stats.sanity || 0) - 1;
  } else {
    lines.push(hops === 1
      ? `Bạn lách qua những con ngõ quen thuộc để tới ${node.name} (${REGION_LABEL[node.region]}).`
      : `Bạn băng qua ${hops} chặng đường, tránh các ổ zombie để tiến sâu vào ${REGION_LABEL[node.region].toLowerCase()}: ${node.name}.`);
  }

  if (useVehicle && vdef) {
    // Mỗi chặng có thể gặp sự cố; xe ồn dễ thu hút bầy, đồng đội đi cùng giúp giảm thiệt hại, giáp xe cũng vậy
    const shield = Math.max(0.35, 1 - 0.18 * vdef.armor - 0.2 * crew);
    let anyRoad = false;
    for (let i = 0; i < hops; i++) {
      if (rng() < 0.3 + vdef.noise * 0.06 + node.danger * 0.03) {
        const ev = pickFrom(ROAD_EVENTS, rng);
        anyRoad = true;
        lines.push(ev.text);
        stats.hp = (stats.hp || 0) + Math.round((ev.hp || 0) * shield);
        stats.sanity = (stats.sanity || 0) + (ev.sanity || 0);
        stats.stamina = (stats.stamina || 0) + (ev.stamina || 0);
        vCond += Math.round((ev.condition || 0) * shield);
        vFuel += ev.fuel || 0;
        if (ev.loseFood) r.lose.push({ name: 'Đồ hộp', quantity: ev.loseFood });
      }
    }
    if (!anyRoad) lines.push(pickFrom(SAFE_ROAD_LINES, rng));
    vCond -= 2 * hops; // hao mòn tự nhiên
    r.vehicleDelta = { condition: vCond, fuel: vFuel };
  }
  const encounterChance = (useVehicle ? 0.03 : 0.08) + node.danger * 0.04 + (thorough ? 0.08 : 0);
  let hit = 0;
  for (let i = 0; i < hops; i++) if (rng() < encounterChance) hit++;
  if (hit) {
    stats.hp = (stats.hp || 0) - hit * (3 + node.danger * 2);
    stats.sanity = (stats.sanity || 0) - hit * 4;
    lines.push(hit === 1 ? 'Giữa đường, một con zombie lao ra từ khe xe bỏ hoang, bạn kịp đẩy nó ngã nhưng bị cào xước.' : 'Trên đường đi, bạn bị chặn hai lần liên tiếp, phải chạy loạn xạ và nhận vài vết thương.');
    if (rng() < 0.4) r.woundChange = { inflicted: true, location: 'Vết cào rách trên cẳng tay' };
  }

  const depletion = 1 / (1 + mt.visits);
  let gained: Partial<Item>[] = [];
  const table = node.table || NODE_TABLE[node.id];
  if (table) {
    const n = Math.max(1, Math.round((thorough ? 4 : 2) * Math.max(0.4, depletion)));
    gained = rollLoot(table, n, rng);
  } else {
    for (const it of node.loot.common) {
      const q = Math.max(0, Math.round((it.quantity || 1) * depletion * (thorough ? 1.2 : 1)));
      if (q >= 1 || rng() < depletion) gained.push({ ...it, quantity: Math.max(1, q) });
    }
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
  if (crew > 0 && table) {
    gained.push(...rollLoot(table, crew, rng));
    lines.push(`Có ${crew} người đi cùng nên bạn mang về được nhiều hơn.`);
  }
  if (!gained.length) lines.push('Nơi này gần như đã bị vét sạch từ những lần ghé trước, bạn quay về tay không.');
  else if (mt.visits > 0) lines.push('Vật tư ở đây đã vơi đi nhiều sau những lần ghé trước.');
  lines.push(`Cuối cùng bạn quay trở về ${setting.labels.shelter}, mệt lả.`);

  r.gain = toItems(gained);
  r.stats = stats;
  r.outcome = lines.join(' ');
  r.zone = 'shelter';
  return r;
}

function fromRoutineChoice(ch: RoutineChoice, inv: any[], comps: any[], sceneId: string, rng: Rng, setting: Setting, zone: Zone, flags: string[] = [], req: any = {}): ChosenResolution {
  const medic = sceneId === 'r_wound_care' ? comps.find((c) => /Uyên|Giang|y tá|dược sĩ|sinh viên y/i.test(`${realNameOf(c)} ${c.role || ''}`) && c.status !== 'deceased') : undefined;
  const miss = medic ? undefined : (ch.requires || []).find((q) => !hasItem(inv, q.re));
  if (miss) return failMissing('routine', miss.label);
  const r = blankRes('routine', fill(ch.outcome, setting));
  r.stats = { ...(ch.stats || {}) };
  r.gain = [...toItems(ch.gain)];
  const rolls = ch.roll ? (Array.isArray(ch.roll) ? ch.roll : [ch.roll]) : [];
  // Trạm y tế bị cô lập: nguồn lực khan hiếm hơn hẳn
  const scarcity = setting.id === 'clinic_containment' ? 0.75 : 1;
  for (const ro of rolls) if (rng() < (ro.chance ?? 1) * scarcity) r.gain.push(...rollLoot(ro.table, ro.n, rng));
  if (ch.flags) r.flags = [...ch.flags];
  if (ch.flagsRemove) r.flagsRemove = [...ch.flagsRemove];
  // Cờ động cho hệ thống tấn công căn cứ
  if (ch.dynFlags === 'raidType') r.flags = [...(r.flags || []), 'raid_type_' + raidTypeFor(flags, req.day || 1)];
  if (ch.dynFlags === 'raidDay') r.flags = [...(r.flags || []), 'raid_day_' + (req.day || 1)];
  if (ch.raid) {
    const type = (flags.find((f) => f.startsWith('raid_type_'))?.slice(10) as RaidType) || raidTypeFor(flags, req.day || 1);
    const res = resolveRaid(ch.raid, type, {
      base: req.base || {},
      companions: comps.map((c: any) => ({ name: c.name, hp: c.hp ?? 100, status: c.status, assignment: c.assignment, assignments: c.assignments, traits: c.traits, role: c.role, skills: c.skills })),
      inventory: inv,
      weaponDamage: req.player?.equippedWeapon?.damage || 0,
      flags, day: req.day || 1,
    }, rng);
    r.outcome = res.outcome;
    r.stats = { ...r.stats, ...res.stats };
    r.gain.push(...res.gain);
    r.companionUpdates.push(...res.companionUpdates);
    r.baseDelta = res.baseDelta;
    r.flags = [...(r.flags || []), ...res.flags];
    if (res.gain.length) r.outcome += ' Bạn thu được: ' + res.gain.map((g) => g.name + ' x' + g.quantity).join(', ') + '.';
    if (res.baseDelta.stolen.length) r.outcome += ' Bị cướp mất: ' + res.baseDelta.stolen.map((s) => s.name + ' x' + s.quantity).join(', ') + '.';
    if (res.baseDelta.moduleLoss.length) r.outcome += ' Công trình bị hư hại: ' + res.baseDelta.moduleLoss.join(', ') + ' (giảm 1 cấp).';
    r.deterministic = true;
    return r;
  }
  // Cờ động: quét tầng chung cư / lục nhà hàng xóm theo thứ tự thực tế
  if (ch.dynFlags === 'floor') {
    const isHouse = setting.id === 'private_house';
    const prefix = isHouse ? 'house_' : 'floor_';
    const done = flags.filter((f) => f.startsWith(prefix)).length;
    const idx = isHouse ? done + 1 : Math.max(1, 6 - done);
    r.flags = [...(r.flags || []), prefix + idx];
    if (!isHouse && done + 1 >= 5) {
      r.flags.push('building_secured');
      r.outcome += ' Tầng cuối cùng đã sạch: cả tòa chung cư giờ nằm trong tay bạn.';
    }
    if (isHouse && done + 1 >= 4 && !flags.includes('neighborhood_known')) {
      r.flags.push('neighborhood_known');
      r.outcome += ' Bạn đã nắm rõ cả dãy nhà quanh ngõ: lối trèo, nhà nào an toàn, nhà nào có người.';
    }
  }
  r.lose = (ch.lose || []).filter((l) => hasItem(inv, new RegExp(l.name, 'i')));
  if (ch.healWound) r.woundChange = { healed: true };
  if (ch.inflictWound) r.woundChange = { inflicted: true, location: ch.inflictWound };

  if (r.gain.length) r.outcome += ` Bạn nhặt được: ${r.gain.map((g) => `${fmtNamed(g)}`).join(', ')}.`;
  else if (rolls.length) r.outcome += ' Nhưng lần này bạn không tìm được gì đáng kể.';

  if (medic) {
    r.outcome += ` ${medic.name} nhanh tay làm sạch và băng lại giúp bạn, thao tác thành thục hơn hẳn việc tự xử lý.`;
    r.stats.sanity = (r.stats.sanity ?? 0) + 2;
    r.stats.infection = (r.stats.infection ?? 0) - 5;
  }
  // Tác động lên đồng đội được chọn theo tiêu chí (ghen tuông, phản bội, hy sinh, tâm sự...)
  const ops: TeamOp[] = ch.team ? (Array.isArray(ch.team) ? ch.team : [ch.team]) : [];
  const views = comps.map(toView);
  for (const op of ops) {
    for (const tgt of selectCompanions(views, op.who)) {
      r.companionUpdates.push({
        name: tgt.name, trustChange: op.trust, affectionChange: op.affection, moraleChange: op.morale,
        statusChange: op.die ? 'deceased' : undefined, leave: op.leave, dialogue: op.dialogue,
      });
    }
  }
  if (ch.consumeFood && !applyEating(r, inv, ch.consumeFood, ch.foodMult ?? 1, undefined, 1 + comps.filter((c: any) => c.status !== 'deceased').length)) return failMissing('routine', 'thức ăn');
  if (ch.drink && !applyDrinking(r, inv)) r.outcome += ' Nhưng bình nước đã trống trơn.';
  if (ch.go === 'outside' && setting.id === 'clinic_containment' && !flags.includes('clinic_breach')) {
    r.outcome += ' Nhưng cổng phụ của trạm bị chặn kín bởi rào cách ly và xác xe: bạn chưa thể ra ngoài được.';
    withMove(r, setting, zone, 'near');
  } else if (ch.go) withMove(r, setting, zone, ch.go);
  r.deterministic = true;
  return r;
}

// ---------- Hành động tự nhập: phân tích ý định rồi tạo diễn biến mới ----------
const ITEM_KEYWORDS: { act: RegExp; have: RegExp; label: string }[] = [
  { act: /\b(bắn|bóp cò|nổ súng)\b|súng|colt|shotgun|\bak\b/i, have: /súng|colt|shotgun|\bak\b/i, label: 'khẩu súng' },
  { act: /molotov|chai cháy/i, have: /molotov/i, label: 'chai cháy Molotov' },
  { act: /băng bó|băng gạc|cầm máu/i, have: /băng|gạc/i, label: 'băng gạc' },
  { act: /kháng sinh|tiêm thuốc/i, have: /kháng sinh|amoxicillin/i, label: 'thuốc kháng sinh' },
  { act: /sát trùng|cồn/i, have: /cồn|povidone/i, label: 'cồn sát trùng' },
];

const PLACE_HINTS: { re: RegExp; table: LootTableId; zone: Zone; label: string }[] = [
  { re: /(?<![\p{L}])bếp(?![\p{L}])|tủ bếp|nguyên liệu|gia vị|đồ khô|kho khô|thùng gạo|hũ gạo/u, table: 'pantry', zone: 'shelter', label: 'tủ bếp và kho đồ khô' },
  { re: /tủ lạnh|tủ đông/, table: 'fridge', zone: 'shelter', label: 'tủ lạnh' },
  { re: /hiệu thuốc|quầy thuốc|nhà thuốc|tủ thuốc|thuốc men/, table: 'pharmacy', zone: 'outside', label: 'một quầy thuốc' },
  { re: /(?<![\p{L}])(chợ|sạp)(?![\p{L}])/u, table: 'market', zone: 'outside', label: 'khu chợ bỏ hoang' },
  { re: /vườn|rau dại|hái (quả|trái|rau)|ổi|chuối/, table: 'forage', zone: 'outside', label: 'một mảnh vườn bỏ hoang' },
  { re: /(?<![\p{L}])(ao|hồ)(?![\p{L}])|câu cá|bắt cá|bắt tôm/u, table: 'pond', zone: 'outside', label: 'bờ ao gần đó' },
  { re: /(?<![\p{L}])xe(?![\p{L}])|ô tô|cốp xe/u, table: 'vehicle', zone: 'outside', label: 'một chiếc xe bỏ hoang' },
  { re: /kim khí|đồ nghề|ốc vít|dụng cụ/, table: 'hardware', zone: 'outside', label: 'một tiệm kim khí' },
  { re: /nhà kho|(?<![\p{L}])kho(?![\p{L}])|kho hàng/u, table: 'warehouse', zone: 'outside', label: 'một nhà kho' },
  { re: /hứng nước|nước mưa|bồn nước|thùng nước/, table: 'water_raw', zone: 'roof', label: 'chỗ có nước mưa' },
];

// Ranh giới từ theo Unicode: \b của JS không hiểu tiếng Việt ("xuống" chứa "uống", "đồ ăn" chứa "ăn"...).
const W = (alt: string) => new RegExp('(?<![\\p{L}])(?:' + alt + ')(?![\\p{L}])', 'u');

function detectDestination(a: string, hasRoof: boolean): Zone | null {
  if (/sân thượng|lên mái|lên nóc|leo lên (mái|nóc)/.test(a)) return hasRoof ? 'roof' : null;
  if (/quay (về|lại|vào)|trở (về|lại)|về (phòng|chỗ|nhà|căn hộ|kho|cabin|xe|toa)|vào trong|trốn (vào|trong)/.test(a)) return 'shelter';
  if (/(xuống|ra) (đường|phố|ngoài đường)|tầng trệt|tầng 1\b|sảnh|ra khỏi (tòa|nhà|siêu thị|trạm|toa)|ra đường|đi ra ngoài|ra ngoài/.test(a)) return 'outside';
  if (/chặn|gia cố|chèn|khóa|rào|nẹp|dựng|đặt bẫy|giăng/.test(a)) return null; // đang gia cố cầu thang/cửa thì vẫn ở trong chỗ trú
  if (/hành lang|cầu thang|ra khỏi phòng|mở cửa|sang phòng|phòng bên cạnh/.test(a)) return 'near';
  return null;
}

function matchInvItem(inv: any[], a: string, pred: (i: any) => boolean): any | undefined {
  let best: any; let bestScore = 0;
  for (const it of inv) {
    if (!pred(it) || (it.quantity ?? 1) <= 0) continue;
    const words = String(it.name || '').toLowerCase().split(/[\s()/,]+/).filter((w) => w.length >= 2 && !/^(đồ|hộp|gói|chai|túi|bình|con|quả|củ|bó|lon|của|và|có)$/.test(w));
    const score = words.filter((w) => a.includes(w)).length;
    if (score > bestScore) { best = it; bestScore = score; }
  }
  return best;
}

function resolveCustom(action: string, inv: any[], comps: any[], rng: Rng, setting: Setting, zone: Zone, turn: number, req: any): ChosenResolution {
  const a = action.toLowerCase();
  for (const k of ITEM_KEYWORDS) {
    if (k.act.test(a) && !hasItem(inv, k.have)) return failMissing('custom', k.label);
  }
  const r = blankRes('custom', `Bạn quyết định: "${action}".`);
  r.stats = { stamina: -3 };
  const parts: string[] = [];

  // 1) Điểm đến: hướng đi nêu rõ, hoặc suy ra từ nơi cần tới (hiệu thuốc, chợ, vườn...)
  const place = PLACE_HINTS.find((p) => p.re.test(a));
  let dest = detectDestination(a, setting.hasRoof);
  if (!dest && place && !(place.zone === 'roof' && !setting.hasRoof)) dest = place.zone;
  if (dest === 'outside' && setting.id === 'clinic_containment' && !(req?.flags || []).includes('clinic_breach')) {
    parts.push('Cổng trạm y tế bị chặn kín bởi rào cách ly và xác xe, bạn chưa thể ra ngoài được. Phải tìm cách phá cổng trước.');
    dest = 'near';
  }
  let at: Zone = zone;
  if (dest && dest !== zone) {
    parts.push(moveText(setting, zone, dest));
    at = dest;
    r.zone = dest;
    r.stats.stamina = (r.stats.stamina ?? 0) - (Math.abs(['shelter', 'near', 'outside'].indexOf(dest) - ['shelter', 'near', 'outside'].indexOf(zone)) || 1) * 3;
  } else if (!dest && /sân thượng|lên mái/.test(a) && !setting.hasRoof) {
    parts.push(`Ở ${setting.place} không có chỗ nào để lên cao hơn như vậy, bạn đành bỏ ý định.`);
  }

  // 2) Ý định chính
  const isCook = W('nấu|luộc|chiên|rang|nướng|đun|hầm').test(a);
  const isBoil = W('đun sôi|đun nước|nấu nước|lọc nước').test(a);
  const isEat = !isBoil && W('ăn|nhai|dùng bữa|nấu|luộc|chiên|nướng|hầm').test(a) && !W('tìm|kiếm|lục|nhặt|vét|lấy|gom|thu gom|mang|hái|moi|lật').test(a.replace(/đồ ăn|thức ăn|thực phẩm|nấu ăn/g, ''));
  const isDrink = W('uống|nhấp nước|giải khát').test(a);
  const isSearch = W('lục|tìm|kiếm|nhặt|moi|mò|lật|lấy|hái|câu|bắt|vơ|thu gom').test(a);

  if (W('tên (anh|chị|cô|chú|bác|bạn|người|của)|hỏi tên|tên là gì|tên gì').test(a) && comps.some((c) => c.nameKnown === false)) {
    const c = comps.find((x) => x.nameKnown === false);
    r.stats.sanity = 2;
    r.companionUpdates.push({ name: c.name, revealName: true, trustChange: 4, dialogue: `Tôi tên là ${realNameOf(c)}. Cảm ơn anh vì đã hỏi.` });
    parts.push(`Bạn chậm rãi hỏi tên người đồng hành. Sau một lúc ngập ngừng, người đó cho bạn biết: "${realNameOf(c)}".`);
  } else if (isEat) {
    const preferred = matchInvItem(inv, a, (i) => i.category === 'food' && (i.hungerReduce ?? 0) > 0);
    const tmp = blankRes('custom', '');
    const ok = applyEating(tmp, inv, isCook ? 'cook' : 'ready', isCook ? 1.3 : 1, preferred, 1 + comps.filter((c: any) => c.status !== 'deceased').length);
    if (!ok) return failMissing('custom', 'thức ăn');
    parts.push(isCook ? 'Bạn nhóm bếp, nấu chín rồi ăn từ từ trong hơi ấm hiếm hoi.' : 'Bạn ăn nhanh, nhai kỹ để dạ dày không bị sốc.');
    parts.push(tmp.outcome.trim());
    r.stats.hunger = tmp.stats.hunger; r.stats.infection = tmp.stats.infection; r.stats.stamina = (r.stats.stamina ?? 0) + (tmp.stats.stamina ?? 0) + (isCook ? 4 : 1);
    r.lose.push(...tmp.lose);
  } else if (isDrink) {
    const preferred = matchInvItem(inv, a, (i) => (i.thirstReduce ?? 0) > 0);
    const tmp = blankRes('custom', '');
    if (!applyDrinking(tmp, inv, preferred)) return failMissing('custom', 'nước uống');
    parts.push('Bạn uống từng ngụm nhỏ, để nước thấm xuống cổ họng khô rát.');
    parts.push(tmp.outcome.trim());
    r.stats.thirst = tmp.stats.thirst; r.stats.infection = tmp.stats.infection; r.lose.push(...tmp.lose);
  } else if (isSearch || (place && !isBoil && !W('chặn|gia cố|chèn|khóa|đặt bẫy|giăng').test(a))) {
    let table: LootTableId | undefined = place?.table;
    if (!table) {
      table = at === 'shelter' ? 'household' : at === 'near' ? 'household' : at === 'roof' ? 'water_raw' : pickFrom<LootTableId>(['vehicle', 'market', 'forage', 'household'], rng);
    }
    // "Lấy hết / vét sạch": mang đi toàn bộ những gì có ở chỗ đó, tốn nhiều sức hơn nhưng không bỏ sót thứ nào
    const takeAll = W('hết|toàn bộ|sạch|tất cả|vét|không chừa').test(a);
    const chance = takeAll ? 1 : at === 'shelter' ? 0.5 : 0.72;
    const found = rng() < chance ? rollLoot(table, takeAll ? 40 : at === 'shelter' ? 1 : 2, rng) : [];
    r.stats.stamina = (r.stats.stamina ?? 0) - (takeAll ? 9 : 5);
    if (found.length) {
      r.gain = found;
      parts.push(`Bạn lục tìm ${place ? place.label : 'khắp nơi'} thật cẩn thận và nhặt được: ${found.map((f) => `${fmtNamed(f)}`).join(', ')}.`);
    } else {
      parts.push(`Bạn lục tìm ${place ? place.label : 'khắp xung quanh'} một hồi lâu nhưng nơi này gần như đã bị vét sạch, bạn không thu được gì.`);
      r.stats.sanity = (r.stats.sanity ?? 0) - 2;
    }
  } else if (W('nghỉ|ngủ|chợp mắt|nằm|thư giãn').test(a)) {
    if (at === 'shelter') { r.stats.stamina = 16; r.stats.sanity = 3; parts.push('Bạn nằm xuống giữa chỗ trú quen thuộc, hơi thở dần đều lại, cơ thể dần thả lỏng dù tai vẫn ngóng mọi tiếng động.'); }
    else { r.stats.stamina = 6; r.stats.sanity = -3; parts.push(`Bạn dựa lưng vào góc khuất ở ${setting.labels[at]} chợp mắt chốc lát. Không có gì chắc chắn, nên mỗi tiếng động đều khiến bạn giật mình.`); }
  } else if (W('đun sôi|đun nước|nấu nước|lọc nước').test(a)) {
    const rawW = inv.find((i: any) => (i.thirstReduce ?? 0) > 0 && i.needsCooking && !i.isCooked && (i.quantity ?? 1) > 0);
    if (!rawW) { parts.push('Bạn không có nước chưa đun nào để xử lý.'); }
    else {
      const litres = rawW.unit === 'l';
      const n = litres ? Math.min(rawW.quantity, 4) : Math.min(rawW.quantity, 2);
      r.lose.push({ name: rawW.name, quantity: n });
      r.gain = [{ id: uid('boiled'), name: litres ? 'Nước đun sôi' : 'Chai nước đun sôi', category: 'food', quantity: n, ...(litres ? { unit: 'l' as const } : {}), thirstReduce: litres ? 55 : 40, canSpoil: false, rarity: 'common', description: litres ? 'Tính theo lít. Đã đun sôi, an toàn.' : 'Nước đun sôi để nguội, an toàn.' } as Item];
      r.stats.stamina = (r.stats.stamina ?? 0) - 2;
      parts.push(`Bạn đun sôi ${litres ? n + ' lít' : n + ' chai'} nước trên bếp dã chiến rồi để nguội. Từ giờ uống không còn lo đau bụng.`);
    }
  } else if (W('chặn|gia cố|chèn|rào|khóa|đóng cửa|dựng|nẹp|cầu thang|cửa chính').test(a)) {
    r.stats.stamina = (r.stats.stamina ?? 0) - 6; r.stats.sanity = 3;
    if (req?.base?.hasBase && at === 'shelter') {
      const want = W('cầu thang|cửa chính|cửa').test(a) ? 4 : 3;
      r.baseDelta = { fortification: want, moduleLoss: [], stolen: [] };
      parts.push(`Bạn dồn sức gia cố đúng chỗ bạn nghĩ tới, chèn đồ nặng và siết chặt từng điểm yếu. Căn cứ kiên cố thêm ${want}%.`);
    } else parts.push('Bạn dồn sức gia cố, chèn thêm đồ nặng và siết chặt từng điểm yếu. Không tuyệt đối an toàn nhưng chắc chắn hơn trước.');
  } else if (W('bẫy|giăng dây|đặt bẫy').test(a)) {
    const wire = inv.find((i: any) => /dây|đinh|kẽm|thanh sắt/i.test(i.name || '') && (i.quantity ?? 1) > 0);
    r.stats.stamina = (r.stats.stamina ?? 0) - 4;
    if (!wire) parts.push('Bạn nhìn quanh nhưng không có dây, đinh hay sắt nào đủ dùng làm bẫy. Bạn đành dùng đồ đạc kê tạm: chỉ đủ báo động khi có tiếng đổ.');
    else { r.lose.push({ name: wire.name, quantity: 1 }); if (req?.base?.hasBase) r.baseDelta = { fortification: 3, moduleLoss: [], stolen: [] }; parts.push(`Bạn giăng bẫy bằng ${wire.name} ở lối vào. Ai bước vào mà không để ý sẽ phải trả giá.`); }
  } else if (W('dọn dẹp|dọn|lau|quét|giặt|tắm|rửa').test(a)) {
    r.stats.stamina = (r.stats.stamina ?? 0) - 3; r.stats.sanity = 3; r.stats.infection = -2;
    parts.push('Bạn dọn dẹp và rửa ráy. Nơi trú bớt hôi, người bớt dính bẩn, và đầu óc cũng gọn hơn một chút.');
  } else if (W('viết|nhật ký|cầu nguyện|thiền|hồi tưởng|ngồi lặng').test(a)) {
    r.stats.stamina = (r.stats.stamina ?? 0) - 1; r.stats.sanity = 5;
    parts.push('Bạn ngồi lặng, viết vài dòng hoặc thầm nhớ về những người đã mất. Không giải quyết được gì, nhưng bạn thở dễ hơn.');
  } else if (W('sửa|vá|hàn|siết ốc|bảo dưỡng').test(a)) {
    const toolI = inv.find((i: any) => /kìm|búa|cờ lê|tua vít|dụng cụ|xà beng/i.test(i.name || ''));
    r.stats.stamina = (r.stats.stamina ?? 0) - (toolI ? 4 : 7); r.stats.sanity = 1;
    parts.push(toolI ? `Bạn dùng ${toolI.name} sửa lại chỗ hỏng, từng việc nhỏ làm chỗ trú vững hơn.` : 'Không có dụng cụ đàng hoàng, bạn xoay xở bằng tay và những thứ nhặt được. Mất nhiều sức hơn và chỉ vá tạm.');
  } else if (W('băng bó|băng|sát trùng|rửa vết|chữa|xử lý vết').test(a) && req?.player?.wound?.hasOpenWound) {
    const gauze = matchInvItem(inv, 'băng gạc cồn muối', (i) => i.category === 'medical');
    if (!gauze) return failMissing('custom', 'vật tư y tế');
    r.lose.push({ name: gauze.name, quantity: 1 }); r.woundChange = { healed: true }; r.stats.sanity = 2;
    parts.push(`Bạn rửa vết thương rồi dùng ${gauze.name} xử lý cẩn thận. Cơn nóng rát dịu đi.`);
  } else if (W('chế|ghép|lắp|làm (cái|bẫy|vũ khí)').test(a)) {
    r.stats.stamina = (r.stats.stamina ?? 0) - 3; r.stats.sanity = 1;
    parts.push('Bạn thử tháo lắp, ghép nối vật liệu trong tay. Muốn chế thứ gì chắc chắn, hãy dùng bàn Chế Tạo trong ba lô.');
  } else if (W('nói|trò chuyện|hỏi|bắt chuyện|an ủi|chia sẻ|tâm sự').test(a) && comps.length) {
    const c = comps[Math.floor(rng() * comps.length)];
    r.stats.sanity = 4; r.companionUpdates.push({ name: c.name, trustChange: 3, dialogue: pickFrom(COMPANION_LINES, rng) });
    parts.push(`Bạn ngồi xuống nói chuyện với ${c.name}. Cả hai bớt cô đơn đi đôi chút giữa tận thế.`);
  } else if (W('quan sát|nhìn|nghe ngóng|canh|theo dõi|trinh sát|do thám').test(a)) {
    r.stats.sanity = 1; r.stats.stamina = (r.stats.stamina ?? 0) - 1;
    parts.push(`Bạn quan sát kỹ ${setting.labels[at]}. ${pickFrom(['Không có gì khác thường, chỉ có gió và tiếng kêu xa xa.', 'Có bóng người lê bước ở xa, chưa thấy dấu hiệu họ biết bạn ở đây.', 'Bạn nhận ra một vệt máu mới trên tường, nghĩa là mới có chuyện xảy ra không lâu.', 'Bạn nghe thấy tiếng gõ nhịp đều từ xa, có thể là người đang cầu cứu hoặc chỉ là gió làm đổ vật gì đó.'], rng)}`);
  } else if (W('đánh|giết|tấn công|chém|đập|hạ gục').test(a)) {
    const weapon = inv.find((i) => i.category === 'weapon');
    const dmg = weapon ? 4 + Math.floor(rng() * 6) : 12 + Math.floor(rng() * 8);
    r.stats.hp = -dmg; r.stats.stamina = (r.stats.stamina ?? 0) - 8; r.stats.sanity = -3;
    parts.push(weapon ? `Bạn vung ${weapon.name} dứt khoát và hạ được kẻ địch, nhưng bị cào xước ở cánh tay.` : 'Không có vũ khí trong tay, bạn đánh trả bằng tay không và chịu thiệt hại đáng kể.');
  } else if (W('trốn|nấp|ẩn|im lặng').test(a)) {
    r.stats.sanity = 1; parts.push('Bạn nép vào chỗ khuất, nín thở và giữ im lặng tuyệt đối cho đến khi cảm giác nguy hiểm qua đi.');
  } else if (W('chạy|vọt|lao|phi').test(a)) {
    r.stats.stamina = (r.stats.stamina ?? 0) - 7; parts.push('Bạn chạy nhanh, bước chân dội lên nền gạch. Khoảng cách được rút ngắn, nhưng hơi thở thì đã gấp gáp.');
  } else if (!dest) {
    // Không khớp ý định nào: vẫn thực hiện theo lời bạn, dùng đồ bạn nhắc tới nếu có, và chịu rủi ro hợp lý
    const used = matchInvItem(inv, a, () => true);
    const risky = W('liều|lao vào|đột nhập|phá|đốt|nhảy|leo|trèo|mạo hiểm').test(a);
    const calm = W('chậm|từ từ|cẩn thận|lặng lẽ|im lặng|nhẹ nhàng').test(a);
    r.stats.stamina = (r.stats.stamina ?? 0) - (risky ? 8 : calm ? 2 : 4);
    if (risky) { r.stats.hp = (r.stats.hp ?? 0) - (2 + Math.floor(rng() * 5)); r.stats.sanity = (r.stats.sanity ?? 0) - 2; }
    parts.push(`Bạn bắt tay vào việc: ${action.replace(/[.!]+$/, '')}.${used ? ` Bạn dùng ${used.name} trong ba lô để làm việc đó.` : ''} ${risky ? 'Việc này liều lĩnh hơn bạn tưởng và bạn phải trả giá bằng vài vết xước.' : calm ? 'Bạn làm thật chậm, thật khẽ, không gây động tĩnh nào.' : 'Mọi việc diễn ra tạm ổn, dù không có gì thay đổi lớn ngay lập tức.'}`);
  }

  // 3) Ra ngoài mà hành động tự do thì có thể gặp rủi ro
  if (at === 'outside' && rng() < 0.22) {
    r.stats.hp = (r.stats.hp ?? 0) - (3 + Math.floor(rng() * 5)); r.stats.sanity = (r.stats.sanity ?? 0) - 3;
    parts.push('Giữa chừng, một bóng đen lảo đảo bỗng xuất hiện từ khe tường. Bạn kịp né nhưng bị cào xước.');
  }
  r.outcome = `${r.outcome} ${parts.join(' ')}`.trim();
  r.deterministic = false;
  return r;
}

// ---------- Chọn cảnh kế tiếp ----------
const toView = (c: any): CompView => ({ id: c.id, name: c.name, trust: c.trust ?? 0, affection: c.affection ?? 0, morale: c.morale ?? 50, hp: c.hp ?? 100, traits: c.traits || [], intimacy: c.intimacyLevel || 'stranger', gender: c.gender || 'male', status: c.status || 'healthy' });

function buildCtx(req: any, nextDay: number, weather: WeatherType, zone: Zone, setting: Setting): SceneCtx {
  const comps: any[] = req.companions || [];
  const loc = req.currentLocation || setting.place;
  const baseType = req.base?.base_type || (loc.toLowerCase().includes('quân sự') ? 'Military Base' : 'Apartment');
  const inv: any[] = req.player?.inventory || [];
  return {
    turn: req.turnCount || 1,
    hasBase: !!req.base?.hasBase,
    comps: comps.map(toView),
    day: nextDay, weather, zone, setting,
    waterCut: nextDay >= 7, blackout: nextDay >= 10,
    hasCompanion: comps.length > 0, companionName: comps[0]?.name || 'Đồng đội',
    baseType,
    thirst: req.player?.stats?.thirst ?? 0,
    hunger: req.player?.stats?.hunger ?? 0,
    stamina: req.player?.stats?.stamina ?? 100,
    hasWound: !!req.player?.wound?.hasOpenWound,
    hasRawFood: inv.some((i) => i.category === 'food' && i.needsCooking && !i.isCooked && (i.quantity ?? 1) > 0),
    night: weather === 'night_dark',
    flags: req.flags || [],
  };
}

function weightedPick<T>(items: { v: T; w: number }[], rng: Rng): T {
  const total = items.reduce((s, x) => s + Math.max(0.01, x.w), 0);
  let p = rng() * total;
  for (const x of items) {
    p -= Math.max(0.01, x.w);
    if (p <= 0) return x.v;
  }
  return items[items.length - 1].v;
}

// Cho phép sự kiện/cột mốc xảy ra ở một số vùng; nếu đang đứng ngoài vùng đó thì phải di chuyển (có mô tả).
const SCENE_ZONES: Record<string, Zone[]> = {
  event_rescue_pharmacist: ['outside'], event_rescue_mechanic_shop: ['outside'], event_sewer_crawler_ambush: ['outside'],
  event_raider_ambush_bridge: ['outside'], event_acid_rain_superstorm: ['shelter', 'near', 'outside', 'roof'],
  event_horde_night: ['shelter', 'near', 'roof'], event_supply_drop: ['near', 'roof', 'outside'],
  milestone_1_hospital: ['outside'], milestone_2_bloodwolf_raiders: ['outside'], milestone_3_bunker13_distress: ['shelter', 'near', 'roof'],
  milestone_4_mutation_crisis: ['shelter', 'near'], milestone_5_final_evacuation: ['outside'],
};

function transition(id: string, zone: Zone, setting: Setting, lock = false): { zone: Zone; lead: string } {
  const allowed = SCENE_ZONES[id];
  if (!allowed || allowed.includes(zone)) return { zone, lead: '' };
  // Trạm y tế bị phong tỏa: không sự kiện nào được kéo bạn ra ngoài khi chưa phá cổng
  const options = lock ? allowed.filter((z) => z !== 'outside') : allowed;
  if (!options.length) return { zone, lead: '' };
  const target = options[0];
  return { zone: target, lead: moveText(setting, zone, target) };
}

// Sự kiện chung được viết lại cho đúng chỗ người chơi đang ở: ở tầng 7 thì không lo nước ngập tầng 2.
const EVENT_LOCAL: Record<string, Record<string, { description?: string; choices?: Record<string, { text?: string; outcomeNarrative?: string }> }>> = {
  event_acid_rain_superstorm: {
    apartment_survivors: {
      description: 'Tiếng sấm rền vang và mưa xối xả đổ xuống thành phố. Dưới kia các ngõ trũng đã ngập đến đầu gối, nhưng ở tầng 7 nước không lên tới được. Điều đáng lo là mưa tạt qua khung cửa sổ vỡ, mái dột, đường điện chập chờn và nước lạnh thấm vào đồ đạc.',
      choices: {
        storm_search_sealed_bunker: { text: 'Chặn các khe cửa sổ, kê xô chậu dưới chỗ dột và dọn đồ ra khỏi vùng ướt', outcomeNarrative: 'Bạn chạy khắp căn hộ nhét chăn vào khe cửa, kê xô dưới từng chỗ dột và kéo đồ khô vào giữa phòng. Cơn mưa gầm rú ngoài kia, nhưng trong này chỉ còn tiếng nước nhỏ giọt và hơi thở của chính bạn.' },
        storm_brave_elements_scavenge: { text: 'Chờ mưa thưa dần rồi xuống đường lội nước lục soát chiếc xe cứu thương trôi dạt giữa ngã tư' },
      },
    },
  },
};

function localizedEvent(ev: RandomEvent, setting: Setting): RandomEvent {
  const loc = EVENT_LOCAL[ev.id]?.[setting.id];
  if (!loc) return ev;
  return { ...ev, description: loc.description || ev.description, choices: ev.choices.map((c) => { const o = loc.choices?.[c.id]; return o ? { ...c, text: o.text || c.text, outcomeNarrative: o.outcomeNarrative || c.outcomeNarrative } : c; }) as typeof ev.choices };
}

function eventScene(rawEv: RandomEvent, inv: any[], leadIn: string, zone: Zone, setting: Setting, lock = false): NextScene {
  const ev = localizedEvent(rawEv, setting);
  const t = transition(ev.id, zone, setting, lock);
  const choices = ev.choices.map((c) => {
    const miss = (CHOICE_REQUIREMENTS[c.id] || []).filter((q) => !hasItem(inv, q.re));
    return miss.length ? `${c.text} [Thiếu: ${miss.map((m) => m.label).join(', ')}]` : c.text;
  }) as [string, string, string];
  return {
    id: ev.id, kind: 'event', zone: t.zone,
    situation: `${ev.isEmergency ? '[TÌNH HUỐNG KHẨN CẤP THỜI GIAN THỰC]\n\n' : ''}${ev.title}\n\n${t.lead ? t.lead + ' ' : ''}${leadIn ? leadIn + ' ' : ''}${ev.description}`,
    choices, isEmergency: ev.isEmergency, emergencySeconds: ev.emergencySeconds,
    dangerLevel: ev.dangerLevel, soundCue: ev.soundCue,
  };
}

function milestoneScene(id: string, zone: Zone, setting: Setting, lock = false, flags: string[] = []): NextScene {
  const m = milestoneById(id)!;
  const options = id === 'milestone_5_final_evacuation' ? finalChoices(m, flags) : m.majorChoices;
  const t = transition(id, zone, setting, lock);
  return {
    id, kind: 'milestone', zone: t.zone,
    situation: `${m.title}\n\n${t.lead ? t.lead + ' ' : ''}${MS_LEAD_IN[id] || ''} ${m.description}\n\n${m.contextPrompt}`,
    choices: options.map((c) => c.label) as [string, string, string],
    isEmergency: false, dangerLevel: 4, soundCue: 'heartbeat',
  };
}

function strangerNextScene(spec: StrangerSpec, zone: Zone, setting: Setting, lock = false): NextScene {
  const sc = strangerScene(spec, setting);
  const zones = lock ? strangerZones(spec).filter((z) => z !== 'outside') : strangerZones(spec);
  if (!zones.length) zones.push('near');
  let z: Zone = zone;
  let lead = '';
  if (!zones.includes(zone)) { z = zones[0]; lead = moveText(setting, zone, z); }
  return {
    id: sc.id, kind: 'event', zone: z,
    situation: `${sc.title}\n\n${lead ? lead + ' ' : ''}${sc.situation}`,
    choices: sc.choices as [string, string, string],
    isEmergency: false, dangerLevel: 3, soundCue: 'heartbeat',
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
  const setting = getSetting(req.settingId);
  const day = req.day || 1;
  const turn = req.turnCount || 1;
  const nextTurn = turn + 1;
  const nextDay = Math.floor(nextTurn / 3) + 1;
  const newDay = nextDay > day;
  const inv: any[] = req.player?.inventory || [];
  const comps: any[] = req.companions || [];
  const seenBefore: Record<string, number> = req.seenBefore || {};
  const awayTurns: number = req.awayTurns || 0;
  const seenW = (id: string) => 1 / (1 + 0.7 * (seenBefore[id] || 0));

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

  let zone: Zone = (req.zone as Zone) || 'shelter';
  const resolution = resolveAction(req, rng, setting, zone, turn);
  zone = resolution.zone ?? zone;

  // Thời tiết & dự báo: chỉ đổi khi sang ngày mới, và bám dự báo hôm trước (65%).
  let weather: WeatherType = req.weather || 'clear';
  let forecast: WeatherForecast = req.tomorrowForecast;
  if (newDay) {
    weather = rollActualWeather(forecast, weather, rng);
    forecast = makeForecast(weather, rng);
  } else if (!forecast) {
    forecast = makeForecast(weather, rng);
  }

  const ctx = buildCtx(req, nextDay, weather, zone, setting);

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

  const lockOutside = setting.id === 'clinic_containment' && !(req.flags || []).includes('clinic_breach');
  let next: NextScene | null = null;
  let consumedPending: string | null = null;
  const finalDay = nextDay >= 30;

  // Đã chuẩn bị cho trận tấn công thì trận đó phải đến ngay, không để sự kiện ngẫu nhiên chen ngang.
  const raidImminent = !!req.base?.hasBase && zone === 'shelter' && (req.flags || []).includes('raid_warned');

  // Người vừa cứu đang chờ quyết định: cảnh này phải đến ngay, trước mọi sự kiện khác.
  if (req.pendingRecruit) next = recruitScene(req.pendingRecruit, zone, setting);

  if (specialAllowed && !finalDay && !raidImminent && !next) {
    // 1) Cột mốc theo ngày (cột mốc 2 đi qua lịch có báo radio).
    for (let i = 0; i < STORY_MILESTONES.length; i++) {
      const m = STORY_MILESTONES[i];
      if (done.includes(m.id)) continue;
      if (m.id === 'milestone_4_mutation_crisis' && comps.length === 0) continue;
      if (!MS_VIA_PENDING.has(m.id) && nextDay >= MS_MIN_DAY[i]) next = milestoneScene(m.id, zone, setting, lockOutside, req.flags || []);
      break;
    }
    // 2) Sự kiện đã lên lịch đến hạn.
    if (!next) {
      const due = pending.find((p) => p.dueDay <= nextDay);
      if (due) {
        consumedPending = due.id;
        next = due.id.startsWith('milestone_') ? milestoneScene(due.id, zone, setting, lockOutside, req.flags || []) : eventScene(eventById(due.id)!, inv, LEAD_IN[due.id] || '', zone, setting, lockOutside);
      }
    }
    // 3) Bão do dự báo ứng nghiệm.
    if (!next && newDay && weather === 'heavy_rain' && count('event_acid_rain_superstorm') < 3) {
      next = eventScene(eventById('event_acid_rain_superstorm')!, inv, LEAD_IN.event_acid_rain_superstorm, zone, setting, lockOutside);
    }
    // 4) Sự kiện ngẫu nhiên: người lạ không rõ tên, hoặc sự kiện có sẵn (đã đủ điều kiện).
    if (!next && nextDay >= 2 && rng() < randomEventChance(nextDay, ctx.baseType, sinceSpecial)) {
      const strangerCount = done.filter((d) => d.startsWith('stranger:')).length;
      const canStranger = comps.length < 3 && strangerCount < 8;
      if (canStranger && rng() < 0.6 * Math.max(0.35, seenW('stranger'))) {
        next = strangerNextScene(rollStranger(rng, zone), zone, setting, lockOutside);
      } else {
        const pool = RANDOM_EVENTS.filter((e) => {
          const rule = EVENT_RULES[e.id];
          if (!rule || rule.weatherOnly || rule.scheduled) return false;
          if (nextDay < rule.minDay || count(e.id) >= rule.max) return false;
          if (rule.needsDone && !done.includes(rule.needsDone)) return false;
          if (rule.skipIfHas && comps.some((c) => realNameOf(c).includes(rule.skipIfHas!))) return false;
          if (e.survivorCandidate && comps.length >= 3) return false;
          return true;
        });
        if (pool.length) {
          const ev = weightedPick(pool.map((e) => ({ v: e, w: seenW(e.id) })), rng);
          next = eventScene(ev, inv, LEAD_IN[ev.id] || '', zone, setting, lockOutside);
        }
      }
    }
  }

  if (consumedPending) pending = pending.filter((p) => p.id !== consumedPending);

  // Căn cứ bị nhắm tới? Chỉ là XÁC SUẤT theo mức lộ diện: căn cứ trông bình thường thì không ai tấn công.
  let raidWarn = false;
  if (!next && !finalDay && req.base?.hasBase && zone === 'shelter' && day >= 4 && !(req.flags || []).includes('raid_warned') && day - raidDayOf(req.flags || []) >= 3) {
    const ex = exposureOf({ base: req.base, flags: req.flags || [], day: nextDay, companionCount: comps.length, hasVehicle: !!req.hasVehicle });
    raidWarn = rng() < ex.chance;
  }

  // 5) Cảnh thường theo vùng đang đứng, nhu cầu cấp bách và chống lặp (trong ván + giữa các ván).
  if (!next) {
    const zoneNow = zone;
    const recent = done.slice(-5);
    const needRecent = done.slice(-4);
    const eligible = ROUTINE_SCENES.filter((s) => s.zones.includes(zoneNow) && (!s.only || s.only.includes(setting.id)) && (!s.when || s.when(ctx)));
    if (!eligible.length) eligible.push(...ROUTINE_SCENES.filter((s) => s.zones.includes('near') && (!s.only || s.only.includes(setting.id))));
    const awayTooLong = zoneNow !== 'shelter' && (awayTurns >= 3 || ctx.stamina < 25);
    const returns = eligible.filter((s) => /^r_(return_|roof_return)/.test(s.id));
    const urgent = eligible.filter((s) => s.need && s.need(ctx) && !needRecent.includes(s.id));
    const fresh = eligible.filter((s) => !recent.includes(s.id));
    let scene: RoutineScene;
    const raidScene = raidImminent ? ROUTINE_SCENES.find((s) => s.id === 'r_base_attack') : raidWarn ? ROUTINE_SCENES.find((s) => s.id === 'r_raid_warning') : undefined;
    if (raidScene) scene = raidScene;
    else if (awayTooLong && returns.length && !recent.slice(-2).includes(returns[0].id)) scene = returns[0];
    else if (urgent.length) scene = weightedPick(urgent.map((s) => ({ v: s, w: seenW(s.id) })), rng);
    else {
      const pool = fresh.length ? fresh : eligible.filter((s) => s.id !== done[done.length - 1]);
      const list = pool.length ? pool : eligible;
      scene = weightedPick(list.map((s) => ({ v: s, w: (s.weight ?? 1) * seenW(s.id) * (/^r_(return_|roof_return)/.test(s.id) && awayTurns >= 2 ? 3 : 1) })), rng);
    }
    const flavor = pickFrom(WEATHER_FLAVOR[weather], rng);
    const extra = ctx.blackout ? ' Cả thành phố chìm trong bóng tối đen đặc.' : ctx.waterCut ? ' Không khí khô ngột ngạt và đường ống nước đã cạn.' : '';
    next = {
      id: scene.id, kind: 'routine', zone: zoneNow,
      situation: `Ngày ${nextDay} - ${locationText(setting, zoneNow)}.${extra}\n\n${flavor}\n\n${fill(scene.situation(ctx), setting)}`,
      choices: scene.choices.map((c) => {
        const miss = (c.requires || []).filter((q) => !hasItem(inv, q.re));
        const t = fill(c.text, setting);
        return miss.length ? `${t} [Thiếu: ${miss.map((m) => m.label).join(', ')}]` : t;
      }) as [string, string, string],
      isEmergency: false,
      dangerLevel: Math.min(5, 2 + (ctx.blackout ? 1 : 0) + (weather === 'night_dark' ? 1 : 0) + (zoneNow === 'outside' ? 1 : 0)),
      soundCue: scene.id === 'r_noise_wall' ? 'zombie_growl' : 'loot',
    };
  }

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

  let systemTrigger: string | null = triggers.length ? triggers.join(' || ') : null;
  const immediate = consumedPending === 'event_horde_night' ? 'Event: Horde Attack' : next.id === 'event_acid_rain_superstorm' ? 'Weather: Heavy Storm' : null;
  if (immediate) systemTrigger = [immediate, ...triggers].join(' || ');

  const radio = intel.length ? buildRadioTransmission(intel, { baseType: ctx.baseType, day: nextDay }, rng) : null;

  const isolated = setting.id === 'clinic_containment';
  const baseStats = {
    hp: 0, infection: 0,
    hunger: isolated ? 8 : 6,
    thirst: (ctx.waterCut ? 12 : 8) + (isolated ? 2 : 0),
    stamina: staminaDrift(next.zone, ctx, newDay),
    sanity: ctx.blackout ? -3 : -2,
  };

  const recentChoices = (req.history || []).slice(-3).flatMap((h: any) => h.choices || []);

  return {
    resolution, next, day, nextDay, nextTurn, newDay, weather, forecast, pending,
    systemTrigger, radio, systemNote,
    waterCut: ctx.waterCut, blackout: ctx.blackout,
    needMap: newDay && !inv.some((i) => /băng|gạc|thuốc/i.test(i.name || '')),
    baseStats, recentChoices,
    zone: next.zone, settingId: setting.id,
    location: locationText(setting, next.zone),
    awayTurns: next.zone === 'shelter' ? 0 : awayTurns + 1,
  };
}

// Thể lực trôi theo tình huống thay vì trừ cứng mỗi lượt: ở chỗ trú yên thì gần như không hao, ra ngoài mới tốn sức,
// đói/khát nặng làm kiệt nhanh hơn, được ăn uống đủ và ở chỗ trú thì hồi dần, qua đêm thì ngủ lấy lại sức.
export function staminaDrift(zone: Zone, ctx: { hasBase: boolean; hunger: number; thirst: number }, newDay: boolean): number {
  const resting = zone === 'shelter';
  let d = resting ? (ctx.hasBase ? 1 : 0) : zone === 'near' ? -3 : zone === 'roof' ? -2 : -5;
  if (ctx.hunger >= 75 || ctx.thirst >= 75) d -= 3;
  else if (resting && ctx.hunger <= 45 && ctx.thirst <= 45) d += 2;
  if (newDay) d += resting ? 12 : 5;
  return d;
}

export function mergeStats(base: SceneStats, extra: SceneStats, weather: WeatherType): SceneStats {
  const total: SceneStats = {};
  (['hp', 'hunger', 'thirst', 'infection', 'sanity', 'stamina'] as const).forEach((k) => {
    total[k] = (base[k] ?? 0) + (extra[k] ?? 0);
  });
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

// Cảnh mở đầu: chọn ngẫu nhiên 1 trong 4 bộ lựa chọn (ưu tiên bộ ít gặp ở các ván trước).
export function openingScene(settingId: string | undefined, seenBefore: Record<string, number> = {}, rng: Rng = Math.random) {
  const setting = getSetting(settingId);
  const idx = weightedPick(OPENING_SETS.map((_, i) => ({ v: i, w: 1 / (1 + 0.7 * (seenBefore[`r_start:${i}`] || 0)) })), rng);
  return {
    sceneId: `r_start:${idx}`,
    choices: OPENING_SETS[idx].map((c) => fill(c.text, setting)) as [string, string, string],
    zone: 'shelter' as Zone,
    location: locationText(setting, 'shelter'),
    settingId: setting.id,
  };
}

// ---------- Kết xuất phản hồi offline (không có Gemini) ----------
export function renderOfflineTurn(req: any, plan: TurnPlan, rng: Rng = Math.random) {
  const r = plan.resolution;
  const total = mergeStats(plan.baseStats, r.stats, plan.weather);
  // Trang bị phòng hộ giảm sát thương nhận vào
  const cut = damageReduction(req.player?.equipment);
  if (cut > 0 && (total.hp ?? 0) < 0) {
    const reduced = Math.round((total.hp as number) * (1 - cut));
    if (reduced > (total.hp as number)) { r.outcome += ' Trang bị phòng hộ trên người đã đỡ bớt phần lớn đòn đánh.'; total.hp = reduced; }
  }
  const victory = plan.nextDay >= 30 || r.ending?.is_victory;
  return {
    outcome: r.outcome,
    situation: plan.next.situation,
    choices: plan.next.choices,
    scene_id: plan.next.id,
    zone: plan.zone,
    awayTurns: plan.awayTurns,
    customChoiceAllowed: true,
    dangerLevel: plan.next.dangerLevel,
    location: plan.location,
    weather: plan.weather,
    tomorrowForecast: plan.forecast,
    isEmergency: plan.next.isEmergency,
    emergencySeconds: plan.next.emergencySeconds,
    cityWaterCutoff: plan.waterCut,
    cityPowerBlackout: plan.blackout,
    system_trigger: plan.systemTrigger,
    radio_transmission: plan.radio,
    pending_events: plan.pending,
    flags_add: r.flags || [],
    flags_remove: r.flagsRemove || [],
    statChanges: total,
    weatherApplied: true,
    woundChange: r.woundChange || null,
    itemsGained: r.gain,
    itemsLost: r.lose,
    loot_notification: r.gain.map((g) => `${fmtNamed(g)}`),
    system_note: plan.systemNote,
    companionUpdates: companionUpdatesFor(req, plan, rng),
    newCompanion: r.newCompanion,
    ...(r.pendingRecruit ? { pending_recruit: r.pendingRecruit } : r.clearRecruit ? { pending_recruit: null } : {}),
    newSkill: r.newSkill,
    game_ending: victory
      ? {
          is_game_over: false,
          is_victory: true,
          epilogue: r.ending?.epilogue || `Bạn đã sống sót qua ${plan.nextDay} ngày khốc liệt. Chỗ trú nhỏ của bạn vẫn đứng vững giữa thành phố chết, và những người còn lại cùng bạn đón ánh bình minh đầu tiên không còn tiếng rên của lũ quái vật.`,
        }
      : undefined,
    soundCue: plan.next.soundCue,
    vehicle_delta: r.vehicleDelta || null,
    base_delta: r.baseDelta || null,
    _needMap: plan.needMap,
  };
}
